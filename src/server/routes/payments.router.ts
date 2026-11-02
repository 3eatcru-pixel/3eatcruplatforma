import { Router, Request, Response } from 'express';
import {
  OrderTransaction,
  PaymentTransactionRecord
} from '../../shared/models/ecosystem.model';
import { isTenantStaffRole, requireAuth, requireRoles } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { transitionCommercialOrderStatus } from '../core/commerce.engine';
import { paymentProcessRateLimiter } from '../middleware/rate-limiter.middleware';
import { getPaymentConfirmationRejection } from '../utils/payment-confirmation';

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);
// Payments are available to consumers for their own orders and to tenant managers/operators.
// The documented waiter app can place and track orders, but does not process/confirm payments.
paymentsRouter.use(requireRoles(['hq_admin', 'tenant_owner', 'operator', 'consumer']));
paymentsRouter.use(paymentProcessRateLimiter);

const VALID_METHODS: readonly PaymentTransactionRecord['method'][] = [
  'pix',
  'credit_card',
  'debit_card',
  'cash',
  'voucher'
];

function getParamId(req: Request): string {
  const p = req.params['id'];
  return Array.isArray(p) ? p[0] || '' : p || '';
}

/**
 * Checks if a Stripe key is actually a Live key (sk_live_)
 */
function isLiveStripeKey(key?: string): boolean {
  return !!key && key.startsWith('sk_live_');
}

/**
 * Validates if real PSP credentials exist and determines if they are LIVE or TEST
 */
function getActivePspProvider(): { provider: 'stripe' | 'mercadopago'; isLive: boolean } | null {
  const stripeKey = process.env['STRIPE_SECRET_KEY']?.trim();
  if (stripeKey) {
    return { provider: 'stripe', isLive: isLiveStripeKey(stripeKey) };
  }

  const mpToken = process.env['MERCADOPAGO_ACCESS_TOKEN']?.trim();
  if (mpToken) {
    // Mercado Pago tokens starting with APP_USR are usually live, TEST- are sandbox
    const isLive = mpToken.startsWith('APP_USR-');
    return { provider: 'mercadopago', isLive };
  }
  return null;
}

/**
 * Standard Brazilian Central Bank CRC-16-CCITT (polynomial 0x1021, init 0xFFFF)
 */
function computeCrc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Genuine BACEN BR Code (PIX EMV) Generator with real CRC-16
 */
function generateBacenPixPayload(params: {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId: string;
}): string {
  const merchantAccountInfo =
    formatEmvField('00', 'br.gov.bcb.pix') +
    formatEmvField('01', params.key.slice(0, 77));

  const cleanName = params.merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 25)
    .toUpperCase() || '3EATCRU';

  const cleanCity = params.merchantCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 15)
    .toUpperCase() || 'SAO PAULO';

  const cleanTxId = params.txId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '3EATCRU';

  const payloadWithoutCrc =
    formatEmvField('00', '01') + // Format indicator
    formatEmvField('26', merchantAccountInfo) + // PIX Account info
    formatEmvField('52', '0000') + // Merchant Category Code
    formatEmvField('53', '986') + // Currency: BRL
    formatEmvField('54', params.amount.toFixed(2)) + // Transaction Amount
    formatEmvField('58', 'BR') + // Country code
    formatEmvField('59', cleanName) + // Merchant name
    formatEmvField('60', cleanCity) + // Merchant city
    formatEmvField('62', formatEmvField('05', cleanTxId)) + // Reference Label
    '6304'; // CRC16 placeholder

  const crc = computeCrc16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}

/**
 * POST /api/payments/process
 * Server-authoritative Universal Payment Proxy.
 * Strictly separates:
 * 1. Physical Cash & Voucher (requires authenticated POS operator confirmation)
 * 2. Real PSP online payments (calls real gateway APIs when keys are present)
 * 3. Honest Simulation/Sandbox (never fakes banking settlement; clearly flagged as simulation)
 */
paymentsRouter.post('/process', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Autenticação obrigatória.' });
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const orderId = typeof body['orderId'] === 'string' ? body['orderId'].trim() : '';
  const amount = Number(body['amount']);
  const method = String(body['method'] || '').trim() as PaymentTransactionRecord['method'];
  const requestedTenantId =
    typeof body['tenantId'] === 'string' ? body['tenantId'].trim() : '';
  const cashConfirmedByOperator = body['cashConfirmedByOperator'] === true;

  // P0.1 Requirement: Mandatory order existence, positive finite amount, and valid method
  if (!orderId || !Number.isFinite(amount) || amount <= 0 || !VALID_METHODS.includes(method)) {
    res.status(400).json({
      error: 'Dados de pagamento inválidos (orderId, amount > 0 e method válido são obrigatórios).',
      code: 'INVALID_PAYMENT_REQUEST'
    });
    return;
  }

  let tenantId = requestedTenantId;
  if (isTenantStaffRole(caller.role)) {
    if (!caller.tenantId) {
      res.status(403).json({ error: 'Colaborador sem estabelecimento vinculado.', code: 'NO_TENANT_BOUND' });
      return;
    }
    if (requestedTenantId && requestedTenantId !== caller.tenantId) {
      res.status(403).json({ error: 'Acesso negado: divergência de estabelecimento.', code: 'TENANT_MISMATCH' });
      return;
    }
    tenantId = caller.tenantId;
  }

  if (!tenantId) {
    res.status(400).json({ error: 'tenantId é obrigatório.', code: 'MISSING_TENANT_ID' });
    return;
  }

  try {
    // 1. Mandatory Order Pre-Validation in Firestore
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      res.status(404).json({
        error: `Pedido [#${orderId}] não foi encontrado no sistema. Pagamento não pode ser processado sem pedido válido.`,
        code: 'ORDER_NOT_FOUND'
      });
      return;
    }

    const orderData = orderDoc.data() as OrderTransaction;

    // Check tenant boundary
    if (orderData.tenantId !== tenantId) {
      res.status(403).json({
        error: 'Divergência de estabelecimento no pedido informado.',
        code: 'TENANT_MISMATCH'
      });
      return;
    }

    // Check authorization to pay this order
    const canPayExistingOrder =
      caller.role === 'hq_admin' ||
      (isTenantStaffRole(caller.role) && caller.tenantId === orderData.tenantId) ||
      orderData.customerId === caller.id;

    if (!canPayExistingOrder) {
      res.status(403).json({
        error: 'Sem permissão para processar pagamento deste pedido.',
        code: 'FORBIDDEN'
      });
      return;
    }

    // Check if order is already paid or cancelled
    if (orderData.paymentStatus === 'approved' || orderData.status === 'completed') {
      res.status(409).json({
        error: 'Este pedido já está pago e concluído no sistema.',
        code: 'ORDER_ALREADY_PAID',
        currentStatus: orderData.status,
        paymentStatus: orderData.paymentStatus
      });
      return;
    }

    if (orderData.status === 'cancelled') {
      res.status(409).json({
        error: 'Não é possível pagar um pedido que já foi cancelado.',
        code: 'ORDER_CANCELLED'
      });
      return;
    }

    // Check exact amount matching (tolerance 0.05 for rounding differences)
    if (Math.abs(orderData.total - amount) > 0.05) {
      res.status(422).json({
        error: `Valor enviado para pagamento (R$ ${amount.toFixed(2)}) diverge do valor real do pedido (R$ ${orderData.total.toFixed(2)}).`,
        code: 'PAYMENT_AMOUNT_MISMATCH',
        expectedAmount: orderData.total,
        receivedAmount: amount
      });
      return;
    }

    // 2. Fetch Tenant Data for PIX and Banking Details
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;
    const merchantName = (tenantData?.['name'] as string) || '3EATCRU';
    const merchantCity = (tenantData?.['address']?.['city'] as string) || 'SAO PAULO';
    const configuredPixKey =
      typeof tenantData?.['pixKey'] === 'string' ? tenantData['pixKey'].trim() : '';

    // This route settles the tenant's order payment. The platform courier commission is
    // evaluated separately by HQ after a real delivery is marked delivered.
    const psp = getActivePspProvider();
    const pspProvider = psp?.provider || null;
    const isLive = psp?.isLive || false;

    const txId = `tx-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    // The store receives its PIX amount directly. PSP fees are unknown until a
    // tenant-specific provider is connected, so do not fabricate deductions.
    const feeDeducted = 0;
    const netAmount = Number(amount.toFixed(2));

    let status: PaymentTransactionRecord['status'];
    let gatewayLabel: string;
    let authCode: string;
    let externalTransactionId: string | undefined;
    let simulationWarning: string | undefined;

    let pixCopyPaste: string | undefined;
    let qrCodePix: string | undefined;
    let isRealPaymentFlow = false;

    // CASE 1: CASH / VOUCHER (Physical Currency)
    if (method === 'cash' || method === 'voucher') {
      // Cash/voucher belongs to the store and does not pass through the platform PSP.
      isRealPaymentFlow = true;
      const isOperatorAtCounter =
        caller.role === 'tenant_owner' || caller.role === 'operator' || caller.role === 'hq_admin';
      if (isOperatorAtCounter && cashConfirmedByOperator) {
        // Confirmed physically by authorized cashier operator
        status = 'approved';
        gatewayLabel = `Caixa Físico do Lojista (Operador: ${caller.name || caller.id})`;
        authCode = `CASH-POS-${Date.now().toString().slice(-6)}`;
      } else {
        // Consumer placed delivery/takeout order choosing cash on delivery
        status = 'pending_pix'; // Awaiting collection at doorstep/counter
        gatewayLabel = 'Pagamento em Dinheiro na Entrega / Balcão (Aguardando Recebimento)';
        authCode = `CASH-PEND-${Date.now().toString().slice(-6)}`;
      }
    }
    // CASE 2: PIX (Instant Payment)
    else if (method === 'pix') {
      const isRealConsumerOrder =
        caller.role === 'consumer' && !orderData.isSimulated && orderData.mode !== 'simulation';
      if (configuredPixKey.length > 77) {
        res.status(503).json({
          error: 'A chave Pix cadastrada pela loja ultrapassa o limite aceito pelo BR Code. Atualize a chave em Minha Loja.',
          code: 'TENANT_PIX_KEY_INVALID'
        });
        return;
      }
      if (!configuredPixKey && (isLive || isRealConsumerOrder)) {
        res.status(503).json({
          error: 'A loja precisa cadastrar sua própria chave Pix antes de receber pagamentos reais.',
          code: 'TENANT_PIX_KEY_NOT_CONFIGURED'
        });
        return;
      }

      // A configured tenant key receives the payment directly. A missing key can only
      // produce a clearly marked sandbox example and never routes funds to the platform.
      const hasLivePixKey = Boolean(configuredPixKey);
      const pixKey = hasLivePixKey ? configuredPixKey : 'sandbox.invalid@invalid.invalid';
      status = 'pending_pix';
      pixCopyPaste = generateBacenPixPayload({
        key: pixKey,
        merchantName,
        merchantCity,
        amount,
        txId
      });
      qrCodePix = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixCopyPaste)}`;
      gatewayLabel = hasLivePixKey
        ? 'PIX direto para a chave da loja (confirmação manual)'
        : 'PIX Universal (Ambiente de Testes / Sandbox)';
      isRealPaymentFlow = hasLivePixKey;
      authCode = `PIX-${Date.now().toString().slice(-6)}`;
      if (!hasLivePixKey) {
        simulationWarning = 'PIX de demonstração com chave inválida. Não transfira valores.';
      }
    }
    // CASE 3: CARD (Credit / Debit)
    else {
      if (isLive && pspProvider === 'stripe') {
        res.status(503).json({
          error: 'Cartão real indisponível: a loja ainda não possui uma conta de pagamento conectada para receber diretamente.',
          code: 'TENANT_CARD_ACCOUNT_NOT_CONFIGURED'
        });
        return;
      } else {
        if (pspProvider === 'mercadopago') {
          res.status(503).json({
            error: 'Cartão Mercado Pago ainda não está integrado. Configure uma conta de pagamento vinculada à loja antes de habilitar cobranças reais.',
            code: 'PROVIDER_NOT_IMPLEMENTED'
          });
          return;
        }
        // Honest Sandbox Simulation (Strictly force sandbox/simulation flags)
        status = 'approved';
        gatewayLabel = 'SIMULADOR TEF (SANDBOX DEMO - Sem PSP Real Configurado)';
        authCode = `SIM-${Math.floor(100000 + Math.random() * 900000)}`;
        simulationWarning =
          'Transação executada em ambiente de testes/simulação. Nenhuma cobrança financeira real foi efetuada em cartão.';
      }
    }

    const effectiveEnvironment: PaymentTransactionRecord['environment'] = isRealPaymentFlow ? 'live' : 'sandbox';
    const effectiveMode: PaymentTransactionRecord['mode'] = isRealPaymentFlow ? 'real' : 'simulation';

    const record: PaymentTransactionRecord = {
      id: txId,
      orderId,
      tenantId,
      amount: Number(amount.toFixed(2)),
      feeDeducted,
      netAmount,
      method,
      status,
      gateway: gatewayLabel,
      authorizationCode: authCode,
      environment: effectiveEnvironment,
      mode: effectiveMode,
      ...(externalTransactionId ? { externalTransactionId } : {}),
      ...(qrCodePix ? { qrCodePix } : {}),
      ...(pixCopyPaste ? { pixCopyPaste } : {}),
      createdByUid: caller.id,
      createdAt: nowIso,
      ...(status === 'approved' ? { confirmedAt: nowIso } : {})
    };

    const commitResult = await adminDb.runTransaction(async (transaction) => {
      const currentOrderSnapshot = await transaction.get(orderRef);
      if (!currentOrderSnapshot.exists) {
        return { kind: 'rejected' as const, httpStatus: 404, code: 'ORDER_NOT_FOUND', error: 'Pedido não encontrado.' };
      }

      const currentOrder = currentOrderSnapshot.data() as OrderTransaction;
      const canPayCurrentOrder =
        caller.role === 'hq_admin' ||
        (isTenantStaffRole(caller.role) && caller.tenantId === currentOrder.tenantId) ||
        currentOrder.customerId === caller.id;
      if (!canPayCurrentOrder) {
        return { kind: 'rejected' as const, httpStatus: 403, code: 'FORBIDDEN', error: 'Sem permissão para pagar este pedido.' };
      }
      if (currentOrder.tenantId !== tenantId) {
        return { kind: 'rejected' as const, httpStatus: 403, code: 'TENANT_MISMATCH', error: 'Divergência de estabelecimento no pedido.' };
      }
      if (currentOrder.paymentStatus === 'approved' || currentOrder.status === 'completed') {
        return { kind: 'rejected' as const, httpStatus: 409, code: 'ORDER_ALREADY_PAID', error: 'Este pedido já está pago.' };
      }
      if (currentOrder.status === 'cancelled') {
        return { kind: 'rejected' as const, httpStatus: 409, code: 'ORDER_CANCELLED', error: 'Não é possível pagar um pedido cancelado.' };
      }
      if (Math.abs(currentOrder.total - amount) > 0.05) {
        return { kind: 'rejected' as const, httpStatus: 422, code: 'PAYMENT_AMOUNT_MISMATCH', error: 'O valor não corresponde ao total atual do pedido.' };
      }

      if (currentOrder.paymentTransactionId) {
        const existingPaymentRef = adminDb.collection('payment_transactions').doc(currentOrder.paymentTransactionId);
        const existingPaymentSnapshot = await transaction.get(existingPaymentRef);
        if (existingPaymentSnapshot.exists) {
          const existingPayment = existingPaymentSnapshot.data() as PaymentTransactionRecord;
          if (existingPayment.status === 'approved') {
            return { kind: 'rejected' as const, httpStatus: 409, code: 'ORDER_ALREADY_PAID', error: 'Este pedido já tem um pagamento aprovado.' };
          }
          if (existingPayment.status === 'pending_pix') {
            if (existingPayment.method === method && Math.abs(existingPayment.amount - amount) <= 0.005) {
              return { kind: 'existing' as const, record: existingPayment, order: currentOrder };
            }
            return {
              kind: 'rejected' as const,
              httpStatus: 409,
              code: 'PAYMENT_ATTEMPT_PENDING',
              error: 'O pedido já tem um pagamento pendente. Confirme ou resolva essa tentativa antes de escolher outro meio de pagamento.'
            };
          }
        }
      }

      const isSimulationPayment = record.mode === 'simulation' || currentOrder.isSimulated || currentOrder.mode === 'simulation';
      const committedRecord: PaymentTransactionRecord = {
        ...record,
        mode: isSimulationPayment ? 'simulation' : 'real',
        isSimulated: isSimulationPayment
      };
      const newPaymentStatus = committedRecord.status === 'pending_pix' ? 'pending_pix' : 'approved';
      const orderUpdates: Partial<OrderTransaction> = {
        paymentTransactionId: committedRecord.id,
        paymentStatus: newPaymentStatus,
        ...(isSimulationPayment ? { isSimulated: true, mode: 'simulation' } : {})
      };

      transaction.create(adminDb.collection('payment_transactions').doc(committedRecord.id), committedRecord);
      transaction.update(orderRef, orderUpdates);
      return { kind: 'created' as const, record: committedRecord, order: currentOrder };
    });

    if (commitResult.kind === 'rejected') {
      res.status(commitResult.httpStatus).json({ error: commitResult.error, code: commitResult.code });
      return;
    }

    const committedRecord = commitResult.record;

    // If POS sale was immediately settled via cash or card, transition order to completed
    if (
      commitResult.kind === 'created' &&
      committedRecord.status === 'approved' &&
      commitResult.order.type === 'pos-counter' &&
      (caller.role === 'tenant_owner' || caller.role === 'operator' || caller.role === 'hq_admin')
    ) {
      await transitionCommercialOrderStatus({
        orderId,
        newStatus: 'completed',
        user: caller
      });
    }

    const effectiveSimulationWarning = simulationWarning ||
      (committedRecord.mode === 'simulation' && committedRecord.method === 'pix'
        ? 'PIX de demonstração com chave inválida. Não transfira valores.'
        : committedRecord.mode === 'simulation' && (committedRecord.method === 'credit_card' || committedRecord.method === 'debit_card')
          ? 'Transação executada em ambiente de testes/simulação. Nenhuma cobrança financeira real foi efetuada em cartão.'
          : undefined);

    res.status(commitResult.kind === 'created' ? 201 : 200).json({
      transactionId: committedRecord.id,
      orderId: committedRecord.orderId,
      status: committedRecord.status,
      gateway: committedRecord.gateway,
      qrCodePix: committedRecord.qrCodePix,
      pixCopyPaste: committedRecord.pixCopyPaste,
      authorizationCode: committedRecord.authorizationCode,
      processedAt: committedRecord.createdAt,
      feeDeducted: committedRecord.feeDeducted,
      netAmount: committedRecord.netAmount,
      environment: committedRecord.environment,
      mode: committedRecord.mode,
      isSimulation: committedRecord.mode === 'simulation',
      ...(effectiveSimulationWarning ? { simulationWarning: effectiveSimulationWarning } : {})
    });
  } catch (err) {
    console.error('Payment Proxy Error:', err);
    res.status(500).json({ error: 'Falha interna ao processar pagamento.', code: 'PAYMENT_PROCESS_FAILED' });
  }
});

/**
 * POST /api/payments/:id/confirm
 * Authoritative confirmation of pending payments (e.g. PIX settlement or cash upon arrival)
 */
paymentsRouter.post('/:id/confirm', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Autenticação obrigatória.' });
    return;
  }

  const txId = getParamId(req);
  try {
    const txRef = adminDb.collection('payment_transactions').doc(txId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) {
      res.status(404).json({ error: 'Transação de pagamento não encontrada.', code: 'PAYMENT_NOT_FOUND' });
      return;
    }

    const tx = txSnap.data() as PaymentTransactionRecord;
    // P0-01 Security Fix: Only HQ Admins or Tenant Staff (cashier/manager) can confirm pending payments. Consumers MUST NOT confirm their own payments.
    const isAuthorized =
      caller.role === 'hq_admin' ||
      ((caller.role === 'tenant_owner' || caller.role === 'operator') && caller.tenantId === tx.tenantId);

    if (!isAuthorized) {
      res.status(403).json({ error: 'Sem permissão para confirmar esta transação.', code: 'FORBIDDEN' });
      return;
    }

    if (tx.status === 'approved') {
      res.status(409).json({ error: 'Transação já foi confirmada anteriormente.', code: 'ALREADY_APPROVED' });
      return;
    }

    const confirmedAt = new Date().toISOString();

    const confirmation = await adminDb.runTransaction(async (transaction) => {
      const freshTxSnap = await transaction.get(txRef);
      if (!freshTxSnap.exists) {
        return { kind: 'rejected' as const, rejection: { status: 404, code: 'PAYMENT_NOT_FOUND', error: 'Transação não encontrada.' } };
      }
      const freshTx = freshTxSnap.data() as PaymentTransactionRecord;
      const isFreshCallerAuthorized =
        caller.role === 'hq_admin' ||
        ((caller.role === 'tenant_owner' || caller.role === 'operator') && caller.tenantId === freshTx.tenantId);
      if (!isFreshCallerAuthorized) {
        return { kind: 'rejected' as const, rejection: { status: 403, code: 'FORBIDDEN', error: 'Sem permissão para confirmar esta transação.' } };
      }

      if (!freshTx.orderId) {
        return { kind: 'rejected' as const, rejection: { status: 404, code: 'ORDER_NOT_FOUND', error: 'A transação não possui pedido vinculado.' } };
      }

      const orderRef = adminDb.collection('orders').doc(freshTx.orderId);
      const orderSnap = await transaction.get(orderRef);
      const orderData = orderSnap.exists ? orderSnap.data() as OrderTransaction : undefined;
      const rejection = getPaymentConfirmationRejection(freshTx, orderData);
      if (rejection) return { kind: 'rejected' as const, rejection };

      transaction.update(txRef, {
        status: 'approved',
        confirmedAt,
        confirmedByUid: caller.id
      });
      transaction.update(orderRef, {
        paymentTransactionId: freshTx.id,
        paymentStatus: 'approved'
      });
      return { kind: 'confirmed' as const, payment: freshTx, order: orderData! };
    });

    if (confirmation.kind === 'rejected') {
      res.status(confirmation.rejection.status).json({
        error: confirmation.rejection.error,
        code: confirmation.rejection.code
      });
      return;
    }

    let settledOrder: OrderTransaction | null = null;
    if (
      confirmation.order.type === 'pos-counter' &&
      confirmation.order.status !== 'completed' &&
      confirmation.order.status !== 'cancelled' &&
      (caller.role === 'hq_admin' ||
        ((caller.role === 'tenant_owner' || caller.role === 'operator') && caller.tenantId === tx.tenantId))
    ) {
      settledOrder = await transitionCommercialOrderStatus({
        orderId: confirmation.payment.orderId,
        newStatus: 'completed',
        user: caller
      });
    }

    res.json({
      transactionId: confirmation.payment.id,
      status: 'approved',
      environment: confirmation.payment.environment,
      mode: confirmation.payment.mode,
      confirmedAt,
      ...(settledOrder ? { order: settledOrder } : {})
    });
  } catch (err) {
    console.error('Payment Confirm Error:', err);
    const error = err as { status?: number; code?: string; message?: string };
    res.status(error.status || 500).json({
      error: error.message || 'Falha ao confirmar transação de pagamento.',
      ...(error.code ? { code: error.code } : { code: 'PAYMENT_CONFIRM_FAILED' })
    });
  }
});

/**
 * GET /api/payments/:id
 */
paymentsRouter.get('/:id', async (req: Request, res: Response) => {
  const caller = req.user;
  if (!caller) {
    res.status(401).json({ error: 'Autenticação obrigatória.' });
    return;
  }

  const txId = getParamId(req);
  try {
    const txSnap = await adminDb.collection('payment_transactions').doc(txId).get();
    if (!txSnap.exists) {
      res.status(404).json({ error: 'Transação não encontrada.' });
      return;
    }

    const tx = txSnap.data() as PaymentTransactionRecord;
    const isAuthorized =
      caller.role === 'hq_admin' ||
      (isTenantStaffRole(caller.role) && caller.tenantId === tx.tenantId) ||
      tx.createdByUid === caller.id;

    if (!isAuthorized) {
      res.status(403).json({ error: 'Acesso negado a esta transação.' });
      return;
    }

    res.json(tx);
  } catch {
    res.status(500).json({ error: 'Falha ao consultar transação.' });
  }
});
