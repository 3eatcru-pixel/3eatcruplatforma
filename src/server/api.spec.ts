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
