import { Router, Request, Response } from 'express';
import {
  OrderTransaction,
  PaymentTransactionRecord
} from '../../shared/models/ecosystem.model';
import { isTenantStaffRole, requireAuth, requireRoles } from '../middleware/auth.middleware';
import { adminDb } from '../firebase-admin';
import { transitionCommercialOrderStatus } from '../core/commerce.engine';
import { paymentProcessRateLimiter } from '../middleware/rate-limiter.middleware';

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
 * Process real payment via Stripe API if key is available
 */
async function processStripePayment(params: {
  amount: number;
  orderId: string;
  tenantId: string;
  isLive: boolean;
  paymentMethodToken?: string;
}): Promise<{
  success: boolean;
  externalId: string;
  authorizationCode: string;
  gateway: string;
  status: 'approved' | 'failed' | 'requires_action';
  rawResponse?: unknown;
}> {
  const stripeKey = process.env['STRIPE_SECRET_KEY']!;
  try {
    const bodyParams = new URLSearchParams();
    bodyParams.append('amount', Math.round(params.amount * 100).toString());
    bodyParams.append('currency', 'brl');
    bodyParams.append('description', `Pedido 3eatcru #${params.orderId}`);
    bodyParams.append('metadata[orderId]', params.orderId);
    bodyParams.append('metadata[tenantId]', params.tenantId);
    bodyParams.append('confirm', 'true');
    
    // Safety: Fallback to test card ONLY if we are in Test Mode (sk_test_...)
    const effectiveToken = params.paymentMethodToken || (params.isLive ? undefined : 'pm_card_visa');
    if (!effectiveToken) {
       return { success: false, externalId: '', authorizationCode: '', gateway: 'Stripe', status: 'failed', rawResponse: { error: 'No payment method token provided for LIVE transaction' } };
    }
    
    bodyParams.append('payment_method', effectiveToken);
    bodyParams.append('automatic_payment_methods[enabled]', 'true');
    bodyParams.append('automatic_payment_methods[allow_redirects]', 'never');

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    const data = (await res.json()) as Record<string, unknown>;
    if (res.ok && data['status'] === 'succeeded') {
      const chargeId = String(data['id'] || '');
      return {
        success: true,
        externalId: chargeId,
        authorizationCode: `STRIPE-${chargeId.slice(-8).toUpperCase()}`,
        gateway: 'Stripe Live Payments PSP',
        status: 'approved',
        rawResponse: data
      };
    } else {
      return {
        success: false,
        externalId: String(data['id'] || ''),
        authorizationCode: 'FAILED',
        gateway: 'Stripe Live Payments PSP',
        status: 'failed',
        rawResponse: data
      };
    }
  } catch (err) {
    console.error('Stripe API Call Failed:', err);
    return {
      success: false,
      externalId: '',
      authorizationCode: 'ERROR',
      gateway: 'Stripe Live Payments PSP',
      status: 'failed'
    };
  }
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
    const pixKey = (tenantData?.['pixKey'] as string) || 'pix@3eatcru.com.br';

    // Escrow labeling is derived from the tenant fleet and server-side driver assignment;
    // a caller cannot classify an own-fleet order as platform delivery in the request body.
    let isPlatformDelivery =
      orderData.type === 'delivery' && tenantData?.['deliveryFleetType'] === 'platform';
    if (
      orderData.type === 'delivery' &&
      tenantData?.['deliveryFleetType'] === 'hybrid' &&
      orderData.driverId
    ) {
      const driverDoc = await adminDb.collection('drivers').doc(orderData.driverId).get();
      isPlatformDelivery = driverDoc.exists && driverDoc.data()?.['driverType'] === 'platform';
    }

    const psp = getActivePspProvider();
    const pspProvider = psp?.provider || null;
    const isLive = psp?.isLive || false;

    const txId = `tx-${Date.now().toString(36)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    let feeRate = 0.0099;
    if (method === 'credit_card') feeRate = 0.0319;
    if (method === 'debit_card') feeRate = 0.0149;
    if (method === 'cash' || method === 'voucher') feeRate = 0;

    const feeDeducted = Number((amount * feeRate).toFixed(2));
    const netAmount = Number((amount - feeDeducted).toFixed(2));

    let status: PaymentTransactionRecord['status'];
    let gatewayLabel: string;
    let authCode: string;
    let externalTransactionId: string | undefined;
    let simulationWarning: string | undefined;

    let pixCopyPaste: string | undefined;
    let qrCodePix: string | undefined;

    // CASE 1: CASH / VOUCHER (Physical Currency)
    if (method === 'cash' || method === 'voucher') {
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
      status = 'pending_pix';
      pixCopyPaste = generateBacenPixPayload({
        key: pixKey,
        merchantName,
        merchantCity,
        amount,
        txId
      });
      qrCodePix = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pixCopyPaste)}`;
      gatewayLabel = isLive
        ? `PIX Direto BACEN / PSP (${pspProvider!.toUpperCase()})`
        : 'PIX Universal (Ambiente de Testes / Sandbox)';
      authCode = `PIX-${Date.now().toString().slice(-6)}`;
      if (!isLive) {
        simulationWarning = 'PIX gerado em modo de demonstração. Confirmação manual ou via webhook simulado.';
      }
    }
    // CASE 3: CARD (Credit / Debit)
    else {
      if (isLive && pspProvider === 'stripe') {
        const stripeResult = await processStripePayment({
          amount,
          orderId,
          tenantId,
          isLive,
          paymentMethodToken: typeof body['paymentMethodToken'] === 'string' ? body['paymentMethodToken'] : undefined
        });

        if (stripeResult.success) {
          status = isPlatformDelivery ? 'platform_escrow_hold' : 'approved';
          gatewayLabel = stripeResult.gateway;
          authCode = stripeResult.authorizationCode;
          externalTransactionId = stripeResult.externalId;
        } else {
          res.status(402).json({
            error: 'Pagamento recusado pela adquirente.',
            code: 'PAYMENT_DECLINED',
            details: stripeResult.rawResponse
          });
          return;
        }
      } else {
        if (pspProvider === 'mercadopago') {
          res.status(503).json({
            error: 'Integração direta Mercado Pago cartão de crédito em homologação final. Utilize o método PIX ou simulação em sandbox.',
            code: 'PROVIDER_NOT_IMPLEMENTED'
          });
          return;
        }
        // Honest Sandbox Simulation (Strictly force sandbox/simulation flags)
        status = isPlatformDelivery ? 'platform_escrow_hold' : 'approved';
        gatewayLabel = 'SIMULADOR TEF (SANDBOX DEMO - Sem PSP Real Configurado)';
        authCode = `SIM-${Math.floor(100000 + Math.random() * 900000)}`;
        simulationWarning =
          'Transação executada em ambiente de testes/simulação. Nenhuma cobrança financeira real foi efetuada em cartão.';
      }
    }

    const effectiveEnvironment: PaymentTransactionRecord['environment'] = (gatewayLabel.includes('SIMULADOR') || !isLive) ? 'sandbox' : 'live';
    const effectiveMode: PaymentTransactionRecord['mode'] = (gatewayLabel.includes('SIMULADOR') || !isLive) ? 'simulation' : 'real';

    const platformEscrowNote = isPlatformDelivery && method !== 'cash'
      ? 'Pagamento retido em Escrow Centralizado (Entrega realizada por Entregador da Plataforma).'
      : undefined;

    const record: PaymentTransactionRecord = {
      id: txId,
      orderId,
      tenantId,
      amount: Number(amount.toFixed(2)),
      feeDeducted,
      netAmount,
      method,
      status: status === 'platform_escrow_hold' ? 'approved' : status,
      gateway: gatewayLabel,
      authorizationCode: authCode,
      environment: effectiveEnvironment,
      mode: effectiveMode,
      ...(externalTransactionId ? { externalTransactionId } : {}),
      ...(qrCodePix ? { qrCodePix } : {}),
      ...(pixCopyPaste ? { pixCopyPaste } : {}),
      ...(platformEscrowNote ? { platformEscrowNote } : {}),
      createdByUid: caller.id,
      createdAt: nowIso,
      ...(status === 'approved' ? { confirmedAt: nowIso } : {})
    };

    const isSimulationPayment = record.mode === 'simulation' || orderData.isSimulated || orderData.mode === 'simulation';
    const finalMode: PaymentTransactionRecord['mode'] = isSimulationPayment ? 'simulation' : 'real';
    const finalIsSimulated = isSimulationPayment;

    record.mode = finalMode;
    record.isSimulated = finalIsSimulated;

    // Save transaction record and update order atomically in a batch
    const batch = adminDb.batch();
    batch.set(adminDb.collection('payment_transactions').doc(txId), record);

    const newPaymentStatus = record.status === 'pending_pix' ? 'pending_pix' : 'approved';
    const orderUpdates: Partial<OrderTransaction> = {
      paymentTransactionId: txId,
      paymentStatus: newPaymentStatus,
      ...(isSimulationPayment ? { isSimulated: true, mode: 'simulation' } : {})
    };
    batch.update(orderRef, orderUpdates);

    await batch.commit();

    // If POS sale was immediately settled via cash or card, transition order to completed
    if (
      record.status === 'approved' &&
      orderData.type === 'pos-counter' &&
      (caller.role === 'tenant_owner' || caller.role === 'operator' || caller.role === 'hq_admin')
    ) {
      await transitionCommercialOrderStatus({
        orderId,
        newStatus: 'completed',
        user: caller
      });
    }

    res.status(201).json({
      transactionId: record.id,
      orderId: record.orderId,
      status: record.status,
      gateway: record.gateway,
      qrCodePix: record.qrCodePix,
      pixCopyPaste: record.pixCopyPaste,
      authorizationCode: record.authorizationCode,
      processedAt: nowIso,
      feeDeducted: record.feeDeducted,
      netAmount: record.netAmount,
      environment: record.environment,
      mode: record.mode,
      isSimulation: record.mode === 'simulation',
      ...(simulationWarning ? { simulationWarning } : {}),
      platformEscrowNote: record.platformEscrowNote
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

    await adminDb.runTransaction(async (transaction) => {
      const freshTxSnap = await transaction.get(txRef);
      if (!freshTxSnap.exists) {
        throw { status: 404, code: 'PAYMENT_NOT_FOUND', message: 'Transação não encontrada.' };
      }
      const freshTx = freshTxSnap.data() as PaymentTransactionRecord;
      if (freshTx.status === 'approved') {
        throw { status: 409, code: 'ALREADY_APPROVED', message: 'Transação já foi confirmada anteriormente.' };
      }

      transaction.update(txRef, {
        status: 'approved',
        confirmedAt,
        confirmedByUid: caller.id
      });

      if (tx.orderId) {
        const orderRef = adminDb.collection('orders').doc(tx.orderId);
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap.exists) {
          const orderData = orderSnap.data() as OrderTransaction;
          if (Math.abs(orderData.total - tx.amount) <= 0.05) {
            transaction.update(orderRef, {
              paymentTransactionId: tx.id,
              paymentStatus: 'approved'
            });
          }
        }
      }
    });

    let settledOrder: OrderTransaction | null = null;
    if (tx.orderId) {
      const orderSnap = await adminDb.collection('orders').doc(tx.orderId).get();
      if (orderSnap.exists) {
        const orderData = orderSnap.data() as OrderTransaction;
        if (
          orderData.type === 'pos-counter' &&
          orderData.status !== 'completed' &&
          orderData.status !== 'cancelled' &&
          (caller.role === 'hq_admin' ||
            ((caller.role === 'tenant_owner' || caller.role === 'operator') && caller.tenantId === tx.tenantId))
        ) {
          settledOrder = await transitionCommercialOrderStatus({
            orderId: tx.orderId,
            newStatus: 'completed',
            user: caller
          });
        }
      }
    }

    res.json({
      transactionId: tx.id,
      status: 'approved',
      environment: tx.environment,
      mode: tx.mode,
      confirmedAt,
      ...(settledOrder ? { order: settledOrder } : {})
    });
  } catch (err) {
    console.error('Payment Confirm Error:', err);
    res.status(500).json({ error: 'Falha ao confirmar transação de pagamento.', code: 'PAYMENT_CONFIRM_FAILED' });
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
