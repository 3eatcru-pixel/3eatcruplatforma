import { TestBed } from '@angular/core/testing';
import {
  HttpInterceptorFn,
  HttpResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from '../../interceptors/auth.interceptor';
import { EcosystemService } from '../../services/ecosystem.service';
import { CompanyTenant, ProductItem } from '../../models/ecosystem.model';

describe('Offline Store & Multi-Layer Resilience', () => {
  let ecosystem: EcosystemService;
  let tenantsMemory: CompanyTenant[];

  const mockBackendInterceptor: HttpInterceptorFn = (req) => {
    if (req.url.startsWith('/api/tenants/') && req.method === 'PATCH') {
      const id = req.url.split('/').pop() || '';
      const updates = (req.body || {}) as Partial<CompanyTenant>;
      const current = tenantsMemory.find((t) => t.id === id);
      const merged = { ...(current || ({ id } as CompanyTenant)), ...updates };
      tenantsMemory = tenantsMemory.map((t) => (t.id === id ? merged : t));
      return of(new HttpResponse({ status: 200, body: merged }));
    }
    return of(new HttpResponse({ status: 200, body: [] }));
  };

  beforeEach(() => {
    tenantsMemory = [
      {
        id: 'tenant-1',
        name: 'Burger & Co',
        legalName: 'Burger & Co LTDA',
        cnpj: '12.345.678/0001-90',
        category: 'restaurant',
        plan: 'Professional',
        status: 'active',
        contactEmail: 'gerente@burgerco.com.br',
        phone: '(11) 98888-7777',
        createdAt: '2026-01-01T00:00:00.000Z',
        openingHours: '10:00 às 23:00',
        address: {
          street: 'Avenida Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100'
        },
        deliveryRadiusKm: 5,
        serviceFeePercent: 8,
        activeDevicesCount: 1,
        devicesLimit: 5,
        isOpen: true
      }
    ];

    const seedProduct: ProductItem = {
      id: 'prod-1',
      tenantId: 'tenant-1',
      name: 'Smash Burger Artesanal',
      description: 'Blend angus 160g',
      category: 'Lanches',
      price: 35.0,
      costPrice: 12.0,
      stock: 20,
      minStock: 5,
      barcode: '789000111',
      sku: 'BUR-01',
      image: 'https://example.com/burger.jpg',
      availableOnline: true
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor]))
      ]
    });

    ecosystem = TestBed.inject(EcosystemService);
    ecosystem.tenantsService.tenants.set(tenantsMemory);
    ecosystem.inventoryService.products.set([seedProduct]);
    ecosystem.offlineSync.clearQueue();
    ecosystem.offlineSync.isOnline.set(true);
    ecosystem.loginAs(
      'operator',
      'gerente@burgerco.com.br',
      'Gerente Burger',
      'Burger & Co',
      'tenant-1'
    );
  });

  it('should allow Store OS to record counter sales locally into offline outbox when network is offline', async () => {
    const tenantId = 'tenant-1';

    await ecosystem.updateTenant(tenantId, { isOpen: false });
    const tenant = ecosystem.tenants().find((t) => t.id === tenantId);
    expect(tenant?.isOpen).toBe(false);

    // Simulate network drop for local POS contingency
    // loginAs creates a simulation session; exercise the real-mode offline queue explicitly.
    ecosystem.security.executionMode.set('real');
    ecosystem.offlineSync.isOnline.set(false);

    const prod = ecosystem.products()[0]!;
    const initialOrdersCount = ecosystem.orders().length;
    const localOrder = await ecosystem.addOrder({
      tenantId,
      orderNumber: '#OFF-101',
      type: 'pos-counter',
      items: [
        {
          product: prod,
          quantity: 2
        }
      ],
      subtotal: prod.price * 2,
      tax: 0,
      discount: 0,
      total: prod.price * 2,
      paymentMethod: 'cash',
      cashConfirmedByOperator: true,
      status: 'completed',
      channel: 'POS'
    });

    expect(localOrder.id).toContain('off-ord-');
    expect(ecosystem.orders().length).toBe(initialOrdersCount + 1);
    expect(ecosystem.pendingSyncCount()).toBe(1);
    expect(localOrder.total).toBe(localOrder.subtotal);
  });

  it('should reflect store offline status in HQ Central tenant overview', async () => {
    const tenantId = 'tenant-1';
    await ecosystem.updateTenant(tenantId, { isOpen: false });

    const tenantInHq = ecosystem.tenants().find((t) => t.id === tenantId);
    expect(tenantInHq?.isOpen).toBe(false);
  });
});
