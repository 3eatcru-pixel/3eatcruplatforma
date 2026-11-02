import { createHash } from 'node:crypto';
import { ExternalMarketplaceOrderItem, ExternalMarketplaceOrderStatus, ExternalOrder } from '../../shared/models/ecosystem.model';
import { adminDb } from '../firebase-admin';

export class DeliveryMarketplaceOrderError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export interface VerifiedMarketplaceOrderInput {
  tenantId: string;
  source: 'ifood' | '99food' | 'rappi';
  externalMerchantId: string;
  externalEventId: string;
  externalId: string;
  sourceStatus?: string;
  status: ExternalMarketplaceOrderStatus;
  sourceUpdatedAt: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  items: ExternalMarketplaceOrderItem[];
  deliveryMode: 'delivery' | 'pickup';
  deliveryAddress?: string;
  paymentMethod?: string;
}

const ORDER_STATUSES = new Set<ExternalMarketplaceOrderStatus>([
  'received', 'accepted', 'preparing', 'ready', 'dispatched', 'completed', 'cancelled', 'requires_review'
]);

function providerDocumentId(...parts: string[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function isValidTimestamp(value: string): boolean {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isValidMoney(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100;
}

function validateItems(items: ExternalMarketplaceOrderItem[]): ExternalMarketplaceOrderItem[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
    throw new DeliveryMarketplaceOrderError(400, 'INVALID_MARKETPLACE_ORDER_ITEMS', 'O pedido externo precisa conter de 1 a 100 itens.');
  }

  return items.map((item) => {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 160 ||
        !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 10000 ||
        !isValidMoney(item.unitPrice) || !isValidMoney(item.totalPrice)) {
      throw new DeliveryMarketplaceOrderError(400, 'INVALID_MARKETPLACE_ORDER_ITEM', 'Um item do pedido externo está fora do formato aceito.');
    }
    return {
      ...(typeof item.externalProductId === 'string' ? { externalProductId: item.externalProductId.slice(0, 120) } : {}),
      ...(typeof item.sku === 'string' ? { sku: item.sku.slice(0, 80) } : {}),
      name: item.name.trim(),
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice.toFixed(2)),
      totalPrice: Number(item.totalPrice.toFixed(2)),
      ...(typeof item.notes === 'string' && item.notes.trim() ? { notes: item.notes.trim().slice(0, 240) } : {}),
      ...(Array.isArray(item.modifiers)
        ? { modifiers: item.modifiers.filter((modifier): modifier is string => typeof modifier === 'string').slice(0, 30).map((modifier) => modifier.slice(0, 100)) }
        : {})
    };
  });
}

/**
 * Persist only after a provider adapter has authenticated the merchant event and normalized
 * the order. The merchant-to-tenant binding is checked again here before any write.
 */
export async function ingestVerifiedMarketplaceOrder(input: VerifiedMarketplaceOrderInput): Promise<{
  order: ExternalOrder;
  duplicateEvent: boolean;
}> {
  const tenantId = input.tenantId.trim();
  const merchantId = input.externalMerchantId.trim();
  const externalEventId = input.externalEventId.trim();
  const externalId = input.externalId.trim();
  if (!tenantId || tenantId.length > 120 || !merchantId || merchantId.length > 160 ||
      !externalEventId || externalEventId.length > 200 || !externalId || externalId.length > 200) {
    throw new DeliveryMarketplaceOrderError(400, 'INVALID_MARKETPLACE_ORDER_IDENTITY', 'A loja e os identificadores externos são obrigatórios.');
  }
  if (!ORDER_STATUSES.has(input.status) || !['ifood', '99food', 'rappi'].includes(input.source)) {
    throw new DeliveryMarketplaceOrderError(400, 'INVALID_MARKETPLACE_ORDER_SOURCE', 'A origem ou o estado do pedido externo não é suportado.');
  }
  if (!isValidMoney(input.total) ||
      !isValidTimestamp(input.createdAt) || !isValidTimestamp(input.sourceUpdatedAt) ||
      typeof input.customerName !== 'string' || input.customerName.trim().length > 120 ||
      (input.deliveryMode !== 'delivery' && input.deliveryMode !== 'pickup') ||
      (input.deliveryAddress !== undefined && (typeof input.deliveryAddress !== 'string' || input.deliveryAddress.length > 400)) ||
      (input.customerPhone !== undefined && (typeof input.customerPhone !== 'string' || input.customerPhone.length > 64)) ||
      (input.paymentMethod !== undefined && (typeof input.paymentMethod !== 'string' || input.paymentMethod.length > 80)) ||
      (input.sourceStatus !== undefined && (typeof input.sourceStatus !== 'string' || input.sourceStatus.length > 100))) {
    throw new DeliveryMarketplaceOrderError(400, 'INVALID_MARKETPLACE_ORDER', 'O pedido externo contém dados inválidos.');
  }

  const items = validateItems(input.items);
  const now = new Date().toISOString();
  const tenantRef = adminDb.collection('tenants').doc(tenantId);
  const connectionRef = adminDb.collection('marketplace_delivery_connections')
    .doc(providerDocumentId(input.source, merchantId));
  const eventRef = adminDb.collection('marketplace_delivery_event_receipts')
    .doc(providerDocumentId(input.source, merchantId, externalEventId));
  const orderRef = tenantRef.collection('marketplace_delivery_orders')
    .doc(providerDocumentId(input.source, merchantId, externalId));

  return adminDb.runTransaction(async (transaction) => {
    const tenantSnapshot = await transaction.get(tenantRef);
    const connectionSnapshot = await transaction.get(connectionRef);
    const eventSnapshot = await transaction.get(eventRef);
    const orderSnapshot = await transaction.get(orderRef);

    if (!tenantSnapshot.exists || tenantSnapshot.data()?.['status'] !== 'active') {
      throw new DeliveryMarketplaceOrderError(403, 'TENANT_INACTIVE', 'A loja não está ativa para receber pedidos externos.');
    }
    const connection = connectionSnapshot.data();
    if (!connectionSnapshot.exists || connection?.['status'] !== 'active' ||
        connection?.['tenantId'] !== tenantId || connection?.['provider'] !== input.source ||
        connection?.['externalMerchantId'] !== merchantId) {
      throw new DeliveryMarketplaceOrderError(403, 'MARKETPLACE_CONNECTION_NOT_ACTIVE', 'A conta desta loja não está vinculada a uma integração ativa.');
    }

    const previousOrder = orderSnapshot.exists ? orderSnapshot.data() as ExternalOrder : undefined;
    if (eventSnapshot.exists) {
      if (!previousOrder) {
        throw new DeliveryMarketplaceOrderError(409, 'MARKETPLACE_EVENT_ORDER_MISSING', 'O evento já foi registrado, mas o pedido associado não foi localizado.');
      }
      return { order: previousOrder, duplicateEvent: true };
    }

    const incomingIsNewer = !previousOrder || Date.parse(input.sourceUpdatedAt) >= Date.parse(previousOrder.sourceUpdatedAt);
    const order: ExternalOrder = incomingIsNewer
      ? {
          ...(previousOrder || {} as ExternalOrder),
          id: orderRef.id,
          tenantId,
          source: input.source,
          externalId,
          externalEventId,
          externalMerchantId: merchantId,
          customerName: input.customerName.trim() || 'Consumidor',
          ...(input.customerPhone ? { customerPhone: input.customerPhone.slice(0, 32) } : {}),
          total: Number(input.total.toFixed(2)),
          currency: 'BRL',
          status: input.status,
          ...(input.sourceStatus ? { sourceStatus: input.sourceStatus.slice(0, 100) } : {}),
          sourceUpdatedAt: input.sourceUpdatedAt,
          items,
          deliveryMode: input.deliveryMode,
          ...(input.deliveryAddress ? { deliveryAddress: input.deliveryAddress.trim().slice(0, 400) } : {}),
          ...(input.paymentMethod ? { paymentMethod: input.paymentMethod.slice(0, 80) } : {}),
          createdAt: previousOrder?.createdAt || input.createdAt,
          receivedAt: previousOrder?.receivedAt || now,
          updatedAt: now
        }
      : previousOrder!;

    transaction.create(eventRef, {
      provider: input.source,
      tenantId,
      externalMerchantId: merchantId,
      externalEventId,
      externalOrderId: externalId,
      orderId: order.id,
      processedAt: now
    });
    if (incomingIsNewer) transaction.set(orderRef, order);
    return { order, duplicateEvent: false };
  });
}
