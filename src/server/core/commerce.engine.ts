import { Transaction } from 'firebase-admin/firestore';
import {
  CartItem,
  CompanyTenant,
  FinancialRecord,
  OrderTransaction,
  PaymentTransactionRecord,
  ProductItem
} from '../../shared/models/ecosystem.model';
import { adminDb } from '../firebase-admin';
import {
  AuthUser,
  isTenantStaffRole,
  toPublicProduct
} from '../middleware/auth.middleware';

export const ALLOWED_ORDER_TRANSITIONS: Record<
  OrderTransaction['status'],
  OrderTransaction['status'][]
> = {
  pending: ['preparing', 'ready', 'dispatched', 'completed', 'cancelled'],
  preparing: ['ready', 'completed', 'cancelled'],
  ready: ['dispatched', 'completed', 'cancelled'],
  dispatched: ['completed', 'delivered', 'cancelled'],
  delivered: ['completed'],
  completed: ['cancelled'],
  cancelled: []
};

function throwTransitionError(status: number, code: string, message: string): never {
  throw { status, code, message } satisfies CommercialEngineError;
}

export interface CommercialEngineError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ExecuteCommercialOrderParams {
  body: Record<string, unknown>;
  user?: AuthUser;
  idempotencyKey?: string;
  forcedChannel?: OrderTransaction['channel'];
}

export interface ExecuteCommercialOrderResult {
  order: OrderTransaction;
  alreadyExisted: boolean;
}

export interface TransitionOrderParams {
  orderId: string;
  newStatus: OrderTransaction['status'];
  user?: AuthUser;
}

const CHANNEL_ALIASES: Record<string, OrderTransaction['channel']> = {
  pos: 'POS',
  pdv: 'POS',
  waiter: 'Waiter Comanda',
  garcom: 'Waiter Comanda',
  'waiter comanda': 'Waiter Comanda',
  comanda: 'Waiter Comanda',
  kiosk: 'Kiosk Totem',
  totem: 'Kiosk Totem',
  autoatendimento: 'Kiosk Totem',
  storefront: 'Customer Storefront',
  'customer storefront': 'Customer Storefront',
  marketplace: 'Online Marketplace',
  'online marketplace': 'Online Marketplace',
  whatsapp: 'WhatsApp',
  ifood: 'iFood',
  'table qr': 'Table QR',
  qr_table: 'Table QR',
  table_qr: 'Table QR'
};

export function normalizeCommercialChannel(
  rawChannel: unknown,
  fallback: OrderTransaction['channel']
): OrderTransaction['channel'] {
  if (typeof rawChannel !== 'string' || !rawChannel.trim()) {
    return fallback;
  }
  const normalized = CHANNEL_ALIASES[rawChannel.trim().toLowerCase()];
  return normalized || fallback;
}

export function resolveAuthoritativeTenantId(
  requestedTenantId: unknown,
  user?: AuthUser
): string {
  const clientTenant =
    typeof requestedTenantId === 'string' ? requestedTenantId.trim() : '';

  if (isTenantStaffRole(user?.role)) {
    if (!user?.tenantId) {
      throw {
        status: 403,
        code: 'NO_TENANT_BOUND',
        message: 'Colaborador autenticado sem estabelecimento vinculado no servidor.'
      } satisfies CommercialEngineError;
    }
    if (clientTenant && clientTenant !== user.tenantId) {
      throw {
        status: 403,
        code: 'TENANT_MISMATCH',
        message: 'Acesso negado: operador vinculado a outro estabelecimento.'
      } satisfies CommercialEngineError;
    }
    return user.tenantId;
  }

  if (!clientTenant) {
    throw {
      status: 400,
      code: 'MISSING_TENANT_ID',
      message: 'Identificador do estabelecimento (tenantId) é obrigatório.'
    } satisfies CommercialEngineError;
  }

  return clientTenant;
}

export async function executeCommercialOrder(
  params: ExecuteCommercialOrderParams
): Promise<ExecuteCommercialOrderResult> {
  const { body, user, idempotencyKey, forcedChannel } = params;
  const tenantId = resolveAuthoritativeTenantId(body['tenantId'], user);
  const rawItems = Array.isArray(body['items']) ? (body['items'] as Record<string, unknown>[]) : [];

  if (rawItems.length === 0) {
    throw {
      status: 400,
      code: 'EMPTY_CART',
      message: 'Lista de itens do pedido é obrigatória.'
    } satisfies CommercialEngineError;
  }

  const requestedPaymentTxId =
    typeof body['paymentTransactionId'] === 'string' && body['paymentTransactionId'].trim()
      ? body['paymentTransactionId'].trim()
      : undefined;

  return adminDb.runTransaction(async (transaction: Transaction) => {
    const orderId =
      idempotencyKey ||
      `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const orderRef = adminDb.collection('orders').doc(orderId);

    // 1. Authenticated Idempotency Gate (P1.6: unauthenticated callers can NEVER replay keys)
    if (idempotencyKey) {
      const existingOrderSnap = await transaction.get(orderRef);
      if (existingOrderSnap.exists) {
        const existingOrder = existingOrderSnap.data() as OrderTransaction;
        if (existingOrder.tenantId !== tenantId) {
          throw {
            status: 409,
            code: 'IDEMPOTENCY_TENANT_COLLISION',
            message: 'Chave de idempotência pertence a outro estabelecimento.'
          } satisfies CommercialEngineError;
        }

        const isReplayAuthorized =
          Boolean(user?.id) &&
          (user!.role === 'hq_admin' ||
            (isTenantStaffRole(user!.role) && user!.tenantId === existingOrder.tenantId) ||
            (Boolean(existingOrder.customerId) && existingOrder.customerId === user!.id));

        if (!isReplayAuthorized) {
          throw {
            status: 403,
            code: 'FORBIDDEN_IDEMPOTENCY_REPLAY',
            message: 'Autenticação compatível é obrigatória para re-executar esta chave de idempotência.'
          } satisfies CommercialEngineError;
        }

        return {
          order: existingOrder,
          alreadyExisted: true
        };
      }
    }

    // 2. Tenant Lookup & Operational Status Enforcement (P1.8)
    const tenantDoc = await transaction.get(adminDb.collection('tenants').doc(tenantId));
    if (!tenantDoc.exists) {
      throw {
        status: 404,
        code: 'TENANT_NOT_FOUND',
        message: `Estabelecimento [${tenantId}] não encontrado.`
      } satisfies CommercialEngineError;
    }
    const tenant = tenantDoc.data() as CompanyTenant;

    if (tenant.status !== 'active') {
      throw {
        status: 403,
        code: 'TENANT_INACTIVE',
        message: `Estabelecimento "${tenant.name}" não está ativo para operações comerciais (status: ${tenant.status}).`
      } satisfies CommercialEngineError;
    }

    const canOperatePos =
      user?.role === 'hq_admin' ||
      (isTenantStaffRole(user?.role) && user?.tenantId === tenant.id);

    const requestedType = (body['type'] as OrderTransaction['type']) || 'delivery';
    const orderType: OrderTransaction['type'] =
      requestedType === 'pos-counter' && !canOperatePos ? 'takeout' : requestedType;

    const resolvedChannel =
      forcedChannel ||
      normalizeCommercialChannel(
        body['channel'],
        orderType === 'pos-counter' ? 'POS' : 'Customer Storefront'
      );

    const isPosOperation = canOperatePos && resolvedChannel === 'POS';

    // Non-POS channels must respect store open state and supported modalities (P1.8)
    if (!isPosOperation) {
      if (tenant.isOpen === false) {
        throw {
          status: 422,
          code: 'STORE_CLOSED',
          message: `Estabelecimento "${tenant.name}" encontra-se fechado para pedidos online.`
        } satisfies CommercialEngineError;
      }

      if (orderType === 'delivery' && tenant.supportsDelivery === false) {
        throw {
          status: 422,
          code: 'MODALITY_NOT_SUPPORTED',
          message: 'Este estabelecimento não opera com entregas (delivery) no momento.'
        } satisfies CommercialEngineError;
      }

      if (orderType === 'takeout' && tenant.supportsTakeout === false) {
        throw {
          status: 422,
          code: 'MODALITY_NOT_SUPPORTED',
          message: 'Este estabelecimento não opera com retirada no balcão (takeout).'
        } satisfies CommercialEngineError;
      }
    }

    // 3. Duplicate Cart-Line Aggregation
    const requestedByProduct = new Map<string, { qty: number; notes: string[] }>();
    for (const item of rawItems) {
      const nestedProd = item['product'] as Record<string, unknown> | undefined;
      const productId = String(nestedProd?.['id'] || item['productId'] || '');
      if (!productId) {
        throw {
          status: 400,
          code: 'INVALID_PRODUCT_ID',
          message: 'Identificador de produto ausente no carrinho.'
        } satisfies CommercialEngineError;
      }
      const rawQty = Number(item['quantity'] ?? 1);
      const qty = Number(rawQty.toFixed(3)); // Allow up to 3 decimal places (grams/minutes)
      if (!Number.isFinite(rawQty) || isNaN(qty) || qty <= 0) {
        throw {
          status: 400,
          code: 'INVALID_QUANTITY',
          message: `Quantidade inválida para o produto [${productId}].`
        } satisfies CommercialEngineError;
      }
      const prev = requestedByProduct.get(productId) || { qty: 0, notes: [] };
      prev.qty += qty;
      if (item['notes']) {
        prev.notes.push(String(item['notes']).slice(0, 200));
      }
      requestedByProduct.set(productId, prev);
    }

    // 4. Authoritative Catalog, Inventory & Payment Transaction Reads (all reads before writes)
    const productEntries = Array.from(requestedByProduct.entries());
    const paymentTxRef = requestedPaymentTxId
      ? adminDb.collection('payment_transactions').doc(requestedPaymentTxId)
      : null;

    const productSnaps = await Promise.all(
      productEntries.map(([productId]) =>
        transaction.get(adminDb.collection('products').doc(productId))
      )
    );

    const paymentTxSnap = paymentTxRef ? await transaction.get(paymentTxRef) : null;

    const validatedItems: CartItem[] = [];
    const stockMutations = new Map<string, { updatedProduct: ProductItem }>();
    let calculatedSubtotal = 0;
    let totalCommissions = 0;

    // First pass: Process main products and identify BOM ingredients
    const ingredientIdsToFetch = new Set<string>();
    const mainProducts: ProductItem[] = [];

    for (let i = 0; i < productEntries.length; i++) {
      const [productId] = productEntries[i]!;
      const productDoc = productSnaps[i]!;

      if (!productDoc.exists) {
        throw {
          status: 400,
          code: 'PRODUCT_NOT_FOUND',
          message: `Produto [${productId}] inválido.`
        } satisfies CommercialEngineError;
      }

      const catalogProduct = productDoc.data() as ProductItem;
      mainProducts.push(catalogProduct);

      if (catalogProduct.recipe) {
        for (const ingredient of catalogProduct.recipe) {
          ingredientIdsToFetch.add(ingredient.productId);
        }
      }
    }

    // Fetch BOM ingredients if any
    const ingredientSnapsMap = new Map<string, ProductItem>();
    if (ingredientIdsToFetch.size > 0) {
      const ingredientIds = Array.from(ingredientIdsToFetch);
      const ingredientSnaps = await Promise.all(
        ingredientIds.map(id => transaction.get(adminDb.collection('products').doc(id)))
      );
      ingredientIds.forEach((id, idx) => {
        const snap = ingredientSnaps[idx]!;
        if (snap.exists) {
          ingredientSnapsMap.set(id, snap.data() as ProductItem);
        }
      });
    }

    for (let i = 0; i < productEntries.length; i++) {
      const [productId, reqLine] = productEntries[i]!;
      const catalogProduct = mainProducts[i]!;

      if (catalogProduct.tenantId !== tenant.id) {
        throw {
          status: 400,
          code: 'CROSS_TENANT_PRODUCT',
          message: `Produto "${catalogProduct.name}" não pertence a este estabelecimento.`
        } satisfies CommercialEngineError;
      }

      if (!isPosOperation && catalogProduct.availableOnline === false) {
        throw {
          status: 422,
          code: 'PRODUCT_UNAVAILABLE_ONLINE',
          message: `Produto "${catalogProduct.name}" indisponível para venda online.`
        } satisfies CommercialEngineError;
      }

      // Check main product stock (if it's not just a virtual "assembly" product)
      if (catalogProduct.stock < reqLine.qty) {
        throw {
          status: 409,
          code: 'STOCK_CONFLICT',
          message: `Estoque insuficiente para "${catalogProduct.name}". Disponível: ${catalogProduct.stock}.`,
          details: { productId, productName: catalogProduct.name, availableStock: catalogProduct.stock, requestedQuantity: reqLine.qty }
        } satisfies CommercialEngineError;
      }

      // BOM Logic: Check and queue ingredient depletions
      if (catalogProduct.recipe) {
        for (const ingredient of catalogProduct.recipe) {
          const ingProd = ingredientSnapsMap.get(ingredient.productId);
          if (!ingProd) continue;

          const totalNeeded = ingredient.qty * reqLine.qty;
          const currentInMutation = stockMutations.get(ingredient.productId)?.updatedProduct.stock ?? ingProd.stock;

          if (currentInMutation < totalNeeded) {
            throw {
              status: 409,
              code: 'BOM_STOCK_CONFLICT',
              message: `Estoque insuficiente de ingrediente (${ingProd.name}) para produzir "${catalogProduct.name}".`,
              details: { ingredientId: ingredient.productId, ingredientName: ingProd.name, available: currentInMutation, needed: totalNeeded }
            } satisfies CommercialEngineError;
          }

          stockMutations.set(ingredient.productId, {
            updatedProduct: { ...ingProd, stock: currentInMutation - totalNeeded }
          });
        }
      }

      calculatedSubtotal += catalogProduct.price * reqLine.qty;
      
      // Calculate Staff Commission if applicable
      if (catalogProduct.commissionRate) {
        totalCommissions += (catalogProduct.price * reqLine.qty) * catalogProduct.commissionRate;
      }

      const currentMainStock = stockMutations.get(productId)?.updatedProduct.stock ?? catalogProduct.stock;
      stockMutations.set(productId, {
        updatedProduct: { ...catalogProduct, stock: currentMainStock - reqLine.qty }
      });

      const sanitizedOrderProduct: Record<string, unknown> = {
        ...catalogProduct,
        costPrice: 0
      };
      delete sanitizedOrderProduct['supplierId'];
      delete sanitizedOrderProduct['wholesalePrice'];
      delete sanitizedOrderProduct['recipe'];

      validatedItems.push({
        product: sanitizedOrderProduct as unknown as ProductItem,
        quantity: reqLine.qty,
        ...(reqLine.notes.length > 0 ? { notes: reqLine.notes.join('; ').slice(0, 200) } : {})
      });
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

    // 5. Pricing & Authoritative Payment Settlement Verification (P0.3)
    const isDelivery = orderType === 'delivery';
    if (isDelivery && tenant.minOrderValue && calculatedSubtotal < tenant.minOrderValue) {
      throw {
        status: 422,
        code: 'MIN_ORDER_NOT_MET',
        message: `Valor mínimo para entrega: R$ ${tenant.minOrderValue.toFixed(2)}.`
      } satisfies CommercialEngineError;
    }

    let discount = canOperatePos ? Number(body['discount'] || 0) : 0;
    if (isNaN(discount) || discount < 0) discount = 0;
    if (discount > calculatedSubtotal) {
      throw {
        status: 400,
        code: 'INVALID_DISCOUNT',
        message: 'Desconto não pode exceder o subtotal.'
      } satisfies CommercialEngineError;
    }

    const deliveryFee = isDelivery ? (tenant.deliveryFee ?? 5.0) : 0;
    const rawTax = Math.max(0, Number(body['tax'] || 0));
    const tax = canOperatePos && !isNaN(rawTax) ? Math.min(rawTax, calculatedSubtotal * 0.2) : 0;
    const total = Number((calculatedSubtotal + deliveryFee + tax - discount).toFixed(2));
    const nowIso = new Date().toISOString();

    const validPaymentMethods: OrderTransaction['paymentMethod'][] = ['cash', 'card', 'pix', 'online', 'room_folio'];
    const rawPayment = String(body['paymentMethod'] || '').toLowerCase();
    const paymentMethod: OrderTransaction['paymentMethod'] = validPaymentMethods.includes(
      rawPayment as OrderTransaction['paymentMethod']
    )
      ? (rawPayment as OrderTransaction['paymentMethod'])
      : 'pix';

    let verifiedPaymentRecord: PaymentTransactionRecord | null = null;
    if (requestedPaymentTxId) {
      if (!paymentTxSnap || !paymentTxSnap.exists) {
        throw {
          status: 422,
          code: 'PAYMENT_TX_NOT_FOUND',
          message: 'Transação de pagamento informada não foi localizada no servidor.'
        } satisfies CommercialEngineError;
      }
      const txData = paymentTxSnap.data() as PaymentTransactionRecord;
      if (txData.tenantId !== tenant.id) {
        throw {
          status: 403,
          code: 'PAYMENT_TENANT_MISMATCH',
          message: 'Transação de pagamento pertence a outro estabelecimento.'
        } satisfies CommercialEngineError;
      }
      if (txData.orderId !== orderId) {
        throw {
          status: 409,
          code: 'PAYMENT_ORDER_MISMATCH',
          message: 'A transação de pagamento já está vinculada a outro pedido.'
        } satisfies CommercialEngineError;
      }
      if (txData.status !== 'approved' && txData.status !== 'pending_pix') {
        throw {
          status: 409,
          code: 'PAYMENT_NOT_USABLE',
          message: 'A transação informada não está aprovada nem aguardando confirmação.'
        } satisfies CommercialEngineError;
      }
      if (Math.abs(txData.amount - total) > 0.05) {
        throw {
          status: 422,
          code: 'PAYMENT_AMOUNT_MISMATCH',
          message: `Valor autorizado (R$ ${txData.amount.toFixed(2)}) diverge do total calculado (R$ ${total.toFixed(2)}).`
        } satisfies CommercialEngineError;
      }
      verifiedPaymentRecord = txData;
    }

    // P0.3: Client sending `status: 'completed'` alone NEVER settles an order.
    // Immediate POS settlement requires either:
    //  (a) Physical cash explicitly confirmed by an authenticated POS operator (`cashConfirmedByOperator === true`), OR
    //  (b) A server-verified `PaymentTransactionRecord` in `approved` status.
    const isVerifiedCashPosSale =
      orderType === 'pos-counter' &&
      isPosOperation &&
      (user?.role === 'hq_admin' || user?.role === 'tenant_owner' || user?.role === 'operator') &&
      paymentMethod === 'cash' &&
      body['cashConfirmedByOperator'] === true;

    const isVerifiedGatewayPosSale =
      orderType === 'pos-counter' &&
      isPosOperation &&
      (user?.role === 'hq_admin' || user?.role === 'tenant_owner' || user?.role === 'operator') &&
      verifiedPaymentRecord !== null &&
      verifiedPaymentRecord.status === 'approved';

    const isImmediatePosSale = isVerifiedCashPosSale || isVerifiedGatewayPosSale;
    const initialStatus: OrderTransaction['status'] = isImmediatePosSale ? 'completed' : 'pending';

    const resolvedPaymentStatus: OrderTransaction['paymentStatus'] = isImmediatePosSale
      ? 'approved'
      : verifiedPaymentRecord?.status === 'pending_pix'
        ? 'pending_pix'
        : verifiedPaymentRecord?.status === 'approved'
          ? 'approved'
          : 'pending';

    const orderNumber =
      typeof body['orderNumber'] === 'string' && body['orderNumber'].trim()
        ? body['orderNumber'].trim().slice(0, 32)
        : `#${Math.floor(1000 + Math.random() * 9000)}`;

    const isSimulated =
      (canOperatePos && Boolean(body['isSimulated'])) ||
      verifiedPaymentRecord?.mode === 'simulation';

    const posCashPaymentRecord: PaymentTransactionRecord | undefined = isVerifiedCashPosSale && user
      ? {
          id: `cash-${orderId}`,
          orderId,
          tenantId: tenant.id,
          amount: total,
          feeDeducted: 0,
          netAmount: total,
          method: 'cash',
          status: 'approved',
          gateway: `Caixa Físico do Lojista (Operador: ${user.name || user.id})`,
          authorizationCode: `CASH-POS-${Date.now().toString().slice(-6)}`,
          environment: isSimulated ? 'sandbox' : 'live',
          mode: isSimulated ? 'simulation' : 'real',
          isSimulated,
          createdByUid: user.id,
          createdAt: nowIso,
          confirmedAt: nowIso
        }
      : undefined;

    const resolvedDeviceType: OrderTransaction['deviceType'] =
      body['deviceType'] === 'terminal' ||
      body['deviceType'] === 'tablet' ||
      body['deviceType'] === 'mobile' ||
      body['deviceType'] === 'kiosk'
        ? (body['deviceType'] as OrderTransaction['deviceType'])
        : resolvedChannel === 'POS'
          ? 'terminal'
          : resolvedChannel === 'Waiter Comanda'
            ? 'mobile'
            : undefined;

    const newOrder: OrderTransaction = {
      id: orderId,
      orderNumber,
      tenantId: tenant.id,
      tenantName: tenant.name,
      ...(user?.id ? { customerId: user.id } : {}),
      customerName: body['customerName']
        ? String(body['customerName']).trim().slice(0, 100)
        : 'Consumidor',
      customerPhone: body['customerPhone']
        ? String(body['customerPhone']).trim().slice(0, 32)
        : '',
      type: orderType,
      ...(body['tableNumber'] ? { tableNumber: String(body['tableNumber']).slice(0, 32) } : {}),
      ...(typeof body['address'] === 'string' && body['address'].trim()
        ? { address: body['address'].trim().slice(0, 240) }
        : {}),
      ...(typeof body['lat'] === 'number' ? { lat: body['lat'] } : {}),
      ...(typeof body['lng'] === 'number' ? { lng: body['lng'] } : {}),
      status: initialStatus,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      deliveryFee,
      tax,
      discount,
      total,
      paymentMethod,
      ...(verifiedPaymentRecord || posCashPaymentRecord
        ? { paymentTransactionId: verifiedPaymentRecord?.id || posCashPaymentRecord!.id }
        : {}),
      paymentStatus: resolvedPaymentStatus,
      ...(isVerifiedCashPosSale ? { cashConfirmedByOperator: true } : {}),
      channel: resolvedChannel,
      ...(typeof body['deviceId'] === 'string' && body['deviceId'].trim()
        ? { deviceId: body['deviceId'].trim().slice(0, 64) }
        : {}),
      ...(typeof body['deviceName'] === 'string' && body['deviceName'].trim()
        ? { deviceName: body['deviceName'].trim().slice(0, 80) }
        : {}),
      ...(resolvedDeviceType ? { deviceType: resolvedDeviceType } : {}),
      ...(typeof body['operatorId'] === 'string' && body['operatorId'].trim()
        ? { operatorId: body['operatorId'].trim().slice(0, 64) }
        : user?.id ? { operatorId: user.id } : {}),
      ...(typeof body['operatorName'] === 'string' && body['operatorName'].trim()
        ? { operatorName: body['operatorName'].trim().slice(0, 80) }
        : {}),
      createdAt: nowIso,
      isSimulated,
      mode: isSimulated ? 'simulation' : 'real',
      staffUids: Array.isArray(tenant.staffUids) ? tenant.staffUids.slice(0, 20) : [],
      assignedStaffId: typeof body['assignedStaffId'] === 'string' ? body['assignedStaffId'] : undefined,
      metadata: typeof body['metadata'] === 'object' ? (body['metadata'] as Record<string, unknown>) : undefined
    };

    // 6. Atomic Inventory Deduction + Public Catalog Availability Sync
    for (const [pId, mut] of stockMutations.entries()) {
      transaction.update(adminDb.collection('products').doc(pId), {
        stock: mut.updatedProduct.stock
      });
      transaction.set(
        adminDb.collection('public_catalog').doc(pId),
        toPublicProduct(mut.updatedProduct)
      );
    }

    // 6.1 Record Staff Commission if assigned and calculated
    if (newOrder.assignedStaffId && totalCommissions > 0) {
      const commId = `comm-${orderId}`;
      transaction.set(adminDb.collection('staff_commissions').doc(commId), {
        id: commId,
        orderId,
        tenantId: tenant.id,
        staffId: newOrder.assignedStaffId,
        amount: Number(totalCommissions.toFixed(2)),
        createdAt: nowIso,
        status: 'pending'
      });
    }

    if (posCashPaymentRecord) {
      transaction.set(adminDb.collection('payment_transactions').doc(posCashPaymentRecord.id), posCashPaymentRecord);
    }

    // 7. Persist Unified Commercial Order
    transaction.set(orderRef, newOrder);

    // 8. Atomic Financial Ledger Settlement (ONLY when authoritatively settled)
    if (initialStatus === 'completed') {
      const finId = `fin-sale-${orderId}`;
      const saleRecord: FinancialRecord = {
        id: finId,
        tenantId: tenant.id,
        date: nowIso,
        type: 'sale',
        category: `Vendas ${resolvedChannel}`,
        description: `Venda ${resolvedChannel} ${orderNumber}`,
        amount: total,
        status: 'cleared',
        paymentMethod: newOrder.paymentMethod,
        channel: resolvedChannel,
        ...(newOrder.deviceId ? { deviceId: newOrder.deviceId } : {}),
        referenceId: orderId,
        isSimulated: Boolean(newOrder.isSimulated),
        mode: newOrder.mode
      };
      transaction.set(adminDb.collection('financials').doc(finId), saleRecord);
    }

    return { order: newOrder, alreadyExisted: false };
  });
}

export async function transitionCommercialOrderStatus(
  params: TransitionOrderParams
): Promise<OrderTransaction> {
  const { orderId, newStatus, user } = params;

  return adminDb.runTransaction(async (transaction: Transaction) => {
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw {
        status: 404,
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido não encontrado.'
      } satisfies CommercialEngineError;
    }

    const order = orderDoc.data() as OrderTransaction;
    const currentStatus = order.status;

    // P1.4: Driver can ONLY act on orders already explicitly assigned to them (`order.driverId === user.id`)
    const isDriverAuthorized =
      user?.role === 'driver' &&
      order.type === 'delivery' &&
      Boolean(order.driverId) &&
      order.driverId === user.id &&
      ['dispatched', 'delivered', 'completed'].includes(newStatus);

    const isHqAdmin = user?.role === 'hq_admin';
    const isTenantStaff = isTenantStaffRole(user?.role) && user?.tenantId === order.tenantId;
    const isTenantManager = user?.role === 'tenant_owner' || user?.role === 'operator';
    const isAuthorized = isHqAdmin || isTenantStaff || isDriverAuthorized;

    if (!isAuthorized) {
      throw {
        status: 403,
        code: 'FORBIDDEN_ORDER_TRANSITION',
        message: 'Acesso negado para atualizar este pedido.'
      } satisfies CommercialEngineError;
    }

    // Drivers only report delivery progress; financial settlement remains with the payment flow.
    if (user?.role === 'driver' && !['dispatched', 'delivered'].includes(newStatus)) {
      throwTransitionError(403, 'FORBIDDEN_DRIVER_TRANSITION', 'Entregadores só podem atualizar o andamento da entrega.');
    }

    // The documented waiter app places and tracks orders; KDS status transitions belong to Store OS.
    if (user?.role === 'waiter') {
      throwTransitionError(403, 'FORBIDDEN_STAFF_TRANSITION', 'A transição de status deve ser feita pelo Store OS.');
    }

    if (newStatus === 'cancelled' && (currentStatus === 'completed' || order.paymentStatus === 'approved')) {
      throwTransitionError(409, 'REFUND_REQUIRED', 'Pedidos com pagamento aprovado exigem um fluxo de estorno antes do cancelamento.');
    }

    // A status update must never manufacture payment approval or a financial sale. Verify the
    // authoritative server-side transaction in the same Firestore transaction as the transition.
    let verifiedPayment: PaymentTransactionRecord | undefined;
    if (newStatus === 'completed') {
      if (!order.paymentTransactionId || order.paymentStatus !== 'approved') {
        throwTransitionError(409, 'PAYMENT_NOT_CONFIRMED', 'O pedido só pode ser concluído após confirmação de pagamento.');
      }
      const paymentRef = adminDb.collection('payment_transactions').doc(order.paymentTransactionId);
      const paymentSnap = await transaction.get(paymentRef);
      if (!paymentSnap.exists) {
        throwTransitionError(409, 'PAYMENT_NOT_FOUND', 'A transação aprovada do pedido não foi localizada.');
      }
      verifiedPayment = paymentSnap.data() as PaymentTransactionRecord;
      if (
        verifiedPayment.status !== 'approved' ||
        verifiedPayment.tenantId !== order.tenantId ||
        verifiedPayment.orderId !== order.id ||
        Math.abs(verifiedPayment.amount - order.total) > 0.05
      ) {
        throwTransitionError(409, 'PAYMENT_NOT_VERIFIED', 'A transação não corresponde ao valor e estabelecimento deste pedido.');
      }
      if (isTenantStaff && !isTenantManager && user?.role !== 'hq_admin') {
        throwTransitionError(403, 'FORBIDDEN_SETTLEMENT', 'A conclusão financeira exige perfil de gerente ou operador.');
      }
    }

    const isHqAdminIntervention = isHqAdmin && user?.tenantId !== order.tenantId;

    if (isHqAdminIntervention) {
      const auditId = `aud-com-${Date.now().toString(36)}`;
      await adminDb.collection('audit_logs').doc(auditId).set({
        id: auditId,
        timestamp: new Date().toISOString(),
        user: user.email || 'HQ ADMIN',
        action: 'Intervenção HQ em Pedido',
        module: 'HQ',
        severity: 'warning',
        details: `O Administrador HQ alterou o status do pedido #${order.orderNumber} (Tenant: ${order.tenantId}) para [${newStatus.toUpperCase()}].`
      });
    }

    // Duplicate Payment / Settlement Replay Protection
    if (currentStatus === 'completed' && newStatus === 'completed') {
      return order;
    }

    // Concurrent Cancellation Race Protection
    if (currentStatus === 'cancelled' && newStatus === 'cancelled') {
      throw {
        status: 409,
        code: 'ORDER_ALREADY_CANCELLED',
        message: 'Este pedido já foi cancelado anteriormente.'
      } satisfies CommercialEngineError;
    }

    const allowedNextStatuses = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: `Transição inválida de ${currentStatus} para ${newStatus}.`
      } satisfies CommercialEngineError;
    }

    const finSaleRef = adminDb.collection('financials').doc(`fin-sale-${orderId}`);
    const finSaleSnap = await transaction.get(finSaleRef);

    const productDocsForCancel =
      newStatus === 'cancelled'
        ? await Promise.all(
            order.items.map((item) =>
              transaction.get(adminDb.collection('products').doc(item.product.id))
            )
          )
        : [];

    const nowIso = new Date().toISOString();

    if (newStatus === 'cancelled') {
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i]!;
        const pDoc = productDocsForCancel[i]!;
        if (pDoc.exists) {
          const prodData = pDoc.data() as ProductItem;
          const restoredStock = (prodData.stock || 0) + item.quantity;
          const updatedProd: ProductItem = { ...prodData, stock: restoredStock };
          transaction.update(adminDb.collection('products').doc(item.product.id), {
            stock: restoredStock
          });
          transaction.set(
            adminDb.collection('public_catalog').doc(item.product.id),
            toPublicProduct(updatedProd)
          );
        }
      }

      if (finSaleSnap.exists) {
        const revId = `fin-rev-${orderId}`;
        const reversalRecord: FinancialRecord = {
          id: revId,
          tenantId: order.tenantId,
          date: nowIso,
          type: 'expense',
          category: 'Estorno de Cancelamento',
          description: `Estorno Pedido Cancelado ${order.orderNumber}`,
          amount: order.total,
          status: 'cleared',
          paymentMethod: order.paymentMethod,
          referenceId: orderId,
          isSimulated: Boolean(order.isSimulated),
          mode: order.mode
        };
        transaction.set(adminDb.collection('financials').doc(revId), reversalRecord);
      }
    }

    if (newStatus === 'completed' && !finSaleSnap.exists) {
      const categoryByChannel =
        order.type === 'delivery'
          ? 'Delivery / Marketplace Online'
          : order.type === 'dine-in'
            ? 'Vendas Salão / Mesa'
            : 'Vendas PDV / Retirada';

      const saleRecord: FinancialRecord = {
        id: `fin-sale-${orderId}`,
        tenantId: order.tenantId,
        date: nowIso,
        type: 'sale',
        category: categoryByChannel,
        description: `Liquidação Pedido ${order.orderNumber} (${order.channel})`,
        amount: order.total,
        status: 'cleared',
        paymentMethod: order.paymentMethod,
        channel: order.channel,
        ...(order.deviceId ? { deviceId: order.deviceId } : {}),
        referenceId: orderId,
        isSimulated: Boolean(order.isSimulated || verifiedPayment?.mode === 'simulation'),
        mode: order.isSimulated || verifiedPayment?.mode === 'simulation' ? 'simulation' : 'real'
      };
      transaction.set(finSaleRef, saleRecord);
    }

    const statusUpdates: Partial<OrderTransaction> = {
      status: newStatus,
      ...(newStatus === 'completed' ? { paymentStatus: 'approved' } : {}),
      ...(newStatus === 'cancelled' && finSaleSnap.exists ? { paymentStatus: 'refunded' } : {})
    };

    transaction.update(orderRef, statusUpdates);
    return { ...order, ...statusUpdates };
  });
}

export async function createCatalogProduct(newProd: ProductItem): Promise<ProductItem> {
  const batch = adminDb.batch();
  batch.set(adminDb.collection('products').doc(newProd.id), newProd);
  batch.set(adminDb.collection('public_catalog').doc(newProd.id), toPublicProduct(newProd));
  await batch.commit();
  return newProd;
}

export async function updateCatalogProduct(
  existing: ProductItem,
  updates: Partial<ProductItem>
): Promise<ProductItem> {
  const merged: ProductItem = { ...existing, ...updates };
  const batch = adminDb.batch();
  batch.update(adminDb.collection('products').doc(existing.id), updates);
  batch.set(adminDb.collection('public_catalog').doc(existing.id), toPublicProduct(merged));
  await batch.commit();
  return merged;
}
