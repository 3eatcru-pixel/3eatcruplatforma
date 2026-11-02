import { describe, it, expect } from 'vitest';
import {
  ALLOWED_ORDER_TRANSITIONS
} from './core/commerce.engine';
import {
  hasPermission,
  isTenantManagerRole,
  isTenantStaffRole,
  ROLE_PERMISSION_MATRIX,
  toPublicProduct,
  toPublicStorefront
} from './middleware/auth.middleware';
import {
  isPlatformDeliveryTenantUnavailable,
  PLATFORM_DELIVERY_NETWORK_READY,
  resolvePlatformDeliveryCommissionStatus
} from './utils/platform-delivery-readiness';
import { getPaymentConfirmationRejection } from './utils/payment-confirmation';
import { CompanyTenant, ProductItem } from '../shared/models/ecosystem.model';

describe('3eatcru Platform & Commerce Core — Unit Invariants', () => {
  it('defines formal permission matrix for all 6 canonical platform roles plus guest', () => {
    expect(Object.keys(ROLE_PERMISSION_MATRIX)).toEqual([
      'hq_admin',
      'tenant_owner',
      'operator',
      'waiter',
      'driver',
      'consumer',
      'guest'
    ]);

    expect(hasPermission('hq_admin', 'hq:governance')).toBe(true);
    expect(hasPermission('tenant_owner', 'hq:governance')).toBe(false);
    expect(hasPermission('tenant_owner', 'financials:manage_tenant')).toBe(true);
    expect(hasPermission('operator', 'financials:manage_tenant')).toBe(true);
    expect(hasPermission('waiter', 'tables:manage_tenant')).toBe(true);
    expect(hasPermission('waiter', 'financials:manage_tenant')).toBe(false);
    expect(hasPermission('driver', 'logistics:deliver')).toBe(true);
    expect(hasPermission('consumer', 'orders:create')).toBe(true);

    expect(isTenantStaffRole('waiter')).toBe(true);
    expect(isTenantManagerRole('waiter')).toBe(false);
  });

  it('locks cancelled state and restricts completed transitions to cancellation refund', () => {
    expect(ALLOWED_ORDER_TRANSITIONS.completed).toEqual(['cancelled']);
    expect(ALLOWED_ORDER_TRANSITIONS.cancelled).toEqual([]);
  });

  it('keeps platform delivery commission coming soon even if Firestore has a stale active value', () => {
    expect(PLATFORM_DELIVERY_NETWORK_READY).toBe(false);
    expect(isPlatformDeliveryTenantUnavailable('marketplace')).toBe(true);
    expect(isPlatformDeliveryTenantUnavailable('store-1')).toBe(false);
    expect(resolvePlatformDeliveryCommissionStatus('active')).toBe('coming_soon');
    expect(resolvePlatformDeliveryCommissionStatus('coming_soon')).toBe('coming_soon');
    expect(resolvePlatformDeliveryCommissionStatus(undefined)).toBe('coming_soon');
  });

  it('only confirms a pending payment when its linked order still matches', () => {
    const payment = { id: 'tx-1', tenantId: 'shop-1', orderId: 'order-1', amount: 27.5, status: 'pending_pix' } as const;
    const order = {
      tenantId: 'shop-1',
      total: 27.5,
      status: 'pending',
      paymentStatus: 'pending_pix',
      paymentTransactionId: 'tx-1'
    } as const;

    expect(getPaymentConfirmationRejection(payment, order)).toBeUndefined();
    expect(getPaymentConfirmationRejection(payment, undefined)?.code).toBe('ORDER_NOT_FOUND');
    expect(getPaymentConfirmationRejection(payment, { ...order, status: 'cancelled' })?.code).toBe('ORDER_CANCELLED');
    expect(getPaymentConfirmationRejection(payment, { ...order, tenantId: 'other-shop' })?.code).toBe('TENANT_MISMATCH');
    expect(getPaymentConfirmationRejection(payment, { ...order, total: 28 })?.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    expect(getPaymentConfirmationRejection(payment, { ...order, paymentStatus: 'refunded' })?.code).toBe('ORDER_PAYMENT_REFUNDED');
    expect(getPaymentConfirmationRejection(payment, { ...order, paymentTransactionId: 'tx-old' })?.code).toBe('PAYMENT_ATTEMPT_MISMATCH');
    expect(getPaymentConfirmationRejection(payment, { ...order, paymentTransactionId: undefined })?.code).toBe('PAYMENT_ATTEMPT_MISMATCH');
    expect(getPaymentConfirmationRejection({ ...payment, status: 'approved' }, order)?.code).toBe('PAYMENT_NOT_PENDING');
  });

  it('sanitizes private ERP fields in toPublicProduct and toPublicStorefront', () => {
    const privateProd: ProductItem = {
      id: 'prod-1',
      tenantId: 'tenant-1',
      name: 'Café Especial',
      description: 'Grãos 100% arábica de torra média',
      category: 'Bebidas',
      price: 18.0,
      costPrice: 5.2,
      wholesalePrice: 12.0,
      supplierId: 'sup-1',
      stock: 42,
      minStock: 10,
      barcode: '789123',
      sku: 'SKU-CAFE',
      image: 'https://example.com/cafe.jpg',
      availableOnline: true
    };

    const pubProd = toPublicProduct(privateProd) as unknown as Record<string, unknown>;
    expect(pubProd['price']).toBe(18.0);
    expect(pubProd['inStock']).toBe(true);
    expect(pubProd['costPrice']).toBeUndefined();
    expect(pubProd['wholesalePrice']).toBeUndefined();
    expect(pubProd['supplierId']).toBeUndefined();
    expect(pubProd['stock']).toBeUndefined();

    const privateTenant: CompanyTenant = {
      id: 'tenant-1',
      name: 'Bistrô Central',
      legalName: 'Bistro Central S.A.',
      cnpj: '12.345.678/0001-99',
      category: 'restaurant',
      plan: 'Enterprise',
      status: 'active',
      ownerUid: 'uid-secret-owner',
      staffUids: ['uid-secret-owner', 'uid-waiter'],
      contactEmail: 'financeiro@bistro.com.br',
      phone: '(11) 90000-0000',
      createdAt: '2026-01-01T00:00:00.000Z',
      openingHours: '11:00 às 23:00',
      deliveryRadiusKm: 6,
      serviceFeePercent: 8,
      activeDevicesCount: 4,
      devicesLimit: 20,
      address: {
        street: 'Rua Oscar Freire',
        number: '500',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01426-000'
      }
    };

    const pubStore = toPublicStorefront(privateTenant) as unknown as Record<string, unknown>;
    expect(pubStore['name']).toBe('Bistrô Central');
    expect(pubStore['cnpj']).toBeUndefined();
    expect(pubStore['contactEmail']).toBeUndefined();
    expect(pubStore['staffUids']).toBeUndefined();
    expect(pubStore['ownerUid']).toBeUndefined();
    expect(pubStore['serviceFeePercent']).toBeUndefined();
  });
});
