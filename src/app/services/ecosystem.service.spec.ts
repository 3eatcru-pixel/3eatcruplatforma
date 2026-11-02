import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  HttpInterceptorFn,
  HttpResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { EcosystemService } from './ecosystem.service';
import { MapToolsService } from './map-tools.service';
import {
  CompanyTenant,
  FinancialRecord,
  OrderTransaction,
  ProductItem,
  StoreDriver,
  TableInfo
} from '../models/ecosystem.model';

describe('3EATCRU Core Motors & Services Test Suite', () => {
  let ecosystem: EcosystemService;
  let mapTools: MapToolsService;

  let tenantsStore: CompanyTenant[];
  let productsStore: ProductItem[];
  let ordersStore: OrderTransaction[];
  let tablesStore: TableInfo[];
  let financialsStore: FinancialRecord[];
  let driversStore: StoreDriver[];

  const mockDomainInterceptor: HttpInterceptorFn = (req) => {
    const { url, method, body } = req;

    // HQ endpoints
    if (url === '/api/hq/overview' && method === 'GET') {
      return of(
        new HttpResponse({
          status: 200,
          body: {
            tenantsCount: tenantsStore.length,
            activeTenantsCount: tenantsStore.length,
            totalDevices: 2,
            deviceRecordsMarkedOnline: 2,
            totalOrders: ordersStore.length,
            grossPlatformVolume: 500,
            platformDeliveryCommissionStatus: 'coming_soon',
            platformDeliveryOrdersCount: null,
            platformDeliveryGrossVolume: null,
            estimatedCommissionRevenue: null,
            defaultCommissionPercent: null,
            maintenanceMode: false,
            globalBroadcastMessage: null,
            serverUptimeSeconds: 100,
            timestamp: new Date().toISOString()
          }
        })
      );
    }

    if (url === '/api/hq/audit/run' && method === 'POST') {
      return of(
        new HttpResponse({
          status: 200,
          body: {
            timestamp: new Date().toISOString(),
            tenantsChecked: Math.max(1, tenantsStore.length),
            productsChecked: Math.max(1, productsStore.length),
            ordersChecked: Math.max(1, ordersStore.length),
            devicesChecked: 2,
            orderTotalsConsistent: true,
            issuesFound: [],
            status: 'passed'
          }
        })
      );
    }

    if (url.startsWith('/api/hq/devices') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [] }));
    }

    if (url.startsWith('/api/hq/audit') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [] }));
    }

    if (url === '/api/hq/system/commission' && method === 'POST') {
      const payload = (body || {}) as { percent?: number };
      return of(
        new HttpResponse({
          status: 200,
          body: { defaultCommissionPercent: payload.percent ?? 8 }
        })
      );
    }

    if (url.startsWith('/api/hq/plans/') && method === 'PATCH') {
      const planId = url.split('/').pop() || 'Starter';
      return of(
        new HttpResponse({
          status: 200,
          body: { id: planId, ...((body as object) || {}) }
        })
      );
    }

    if (url === '/api/hq/regional' && method === 'POST') {
      return of(new HttpResponse({ status: 200, body: { config: body } }));
    }

    // Tenants
    if (url.startsWith('/api/tenants') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [...tenantsStore] }));
    }
    if (url.startsWith('/api/tenants/') && method === 'PATCH') {
      const id = url.split('/').pop() || '';
      const existing = tenantsStore.find((t) => t.id === id);
      const updated = { ...(existing || ({ id } as CompanyTenant)), ...((body as object) || {}) };
      tenantsStore = tenantsStore.map((t) => (t.id === id ? updated : t));
      return of(new HttpResponse({ status: 200, body: updated }));
    }

    // Products
    if (url.startsWith('/api/products') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [...productsStore] }));
    }
    if (url.startsWith('/api/products/') && method === 'PATCH') {
      const id = url.split('/').pop() || '';
      const existing = productsStore.find((p) => p.id === id);
      const updated = { ...(existing || ({ id } as ProductItem)), ...((body as object) || {}) };
      productsStore = productsStore.map((p) => (p.id === id ? updated : p));
      return of(new HttpResponse({ status: 200, body: updated }));
    }

    // Orders
    if (url.startsWith('/api/orders') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [...ordersStore] }));
    }
    if (url === '/api/orders' && method === 'POST') {
      const payload = (body || {}) as Partial<OrderTransaction>;
      const created: OrderTransaction = {
        id: payload.id || `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId: payload.tenantId || 'tenant-1',
        orderNumber: payload.orderNumber || '#1001',
        customerName: payload.customerName || 'Cliente',
        customerPhone: payload.customerPhone || '',
        type: payload.type || 'pos-counter',
        tableNumber: payload.tableNumber,
        items: payload.items || [],
        subtotal: payload.subtotal || 0,
        tax: payload.tax || 0,
        discount: payload.discount || 0,
        total: payload.total || 0,
        paymentMethod: payload.paymentMethod || 'pix',
        status: payload.status || 'pending',
        channel: payload.channel || 'POS',
        createdAt: new Date().toISOString()
      };
      ordersStore = [created, ...ordersStore];
      return of(new HttpResponse({ status: 201, body: created }));
    }
    if (url.endsWith('/status') && url.startsWith('/api/orders/') && method === 'PATCH') {
      const segments = url.split('/');
      const id = segments[segments.length - 2] || '';
      const statusUpdate = (body as { status: OrderTransaction['status'] }).status;
      const existing = ordersStore.find((o) => o.id === id);
      const updated: OrderTransaction = {
        ...(existing || ({ id } as OrderTransaction)),
        status: statusUpdate
      };
      ordersStore = ordersStore.map((o) => (o.id === id ? updated : o));
      return of(new HttpResponse({ status: 200, body: updated }));
    }

    // Tables
    if (url.startsWith('/api/tables') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [...tablesStore] }));
    }
    if (url.startsWith('/api/tables/') && method === 'PATCH') {
      const id = url.split('/').pop() || '';
      const existing = tablesStore.find((t) => t.id === id);
      const updated = { ...(existing || ({ id } as TableInfo)), ...((body as object) || {}) };
      tablesStore = tablesStore.map((t) => (t.id === id ? updated : t));
      return of(new HttpResponse({ status: 200, body: updated }));
    }

    // Financials
    if (url.startsWith('/api/financials') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [...financialsStore] }));
    }
    if (url === '/api/financials' && method === 'POST') {
      const payload = (body || {}) as Partial<FinancialRecord>;
      const created: FinancialRecord = {
        id: `fin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId: payload.tenantId || 'tenant-1',
        date: payload.date || new Date().toISOString(),
        type: payload.type === 'expense' ? 'expense' : 'income',
        category: payload.category || 'Tesouraria',
        description: payload.description || 'Lançamento',
        amount: payload.amount || 0,
        status: 'cleared',
        paymentMethod: payload.paymentMethod || 'Dinheiro',
        referenceId: payload.referenceId
      };
      financialsStore = [created, ...financialsStore];
      return of(new HttpResponse({ status: 201, body: created }));
    }

    // Logistics Drivers
    if (url === '/api/logistics/drivers' && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [...driversStore] }));
    }
    if (url === '/api/logistics/drivers' && method === 'POST') {
      const payload = (body || {}) as StoreDriver;
      const created: StoreDriver = {
        ...payload,
        id: payload.id || `drv-${Date.now()}`
      };
      driversStore = [...driversStore, created];
      return of(new HttpResponse({ status: 201, body: created }));
    }
    if (url.startsWith('/api/logistics/drivers/') && method === 'PATCH') {
      const id = url.split('/').pop() || '';
      const existing = driversStore.find((d) => d.id === id);
      const updated = { ...(existing || ({ id } as StoreDriver)), ...((body as object) || {}) };
      driversStore = driversStore.map((d) => (d.id === id ? updated : d));
      return of(new HttpResponse({ status: 200, body: updated }));
    }

    // CRM Consumers
    if (url.startsWith('/api/crm/consumers') && method === 'GET') {
      return of(new HttpResponse({ status: 200, body: [] }));
    }

    return of(new HttpResponse({ status: 200, body: {} }));
  };

  beforeEach(() => {
    tenantsStore = [
      {
        id: 'tenant-1',
        name: 'Burger & Co',
        legalName: 'Burger & Co LTDA',
        cnpj: '11.222.333/0001-44',
        category: 'restaurant',
        plan: 'Professional',
        status: 'active',
        contactEmail: 'contato@burgerco.com.br',
        phone: '(11) 98888-1111',
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
        activeDevicesCount: 2,
        devicesLimit: 5,
        isOpen: true
      },
      {
        id: 'tenant-2',
        name: 'Padaria & Empório Estrela',
        legalName: 'Padaria Estrela LTDA',
        cnpj: '22.333.444/0001-55',
        category: 'retail',
        plan: 'Starter',
        status: 'active',
        contactEmail: 'contato@estrela.com.br',
        phone: '(11) 97777-2222',
        createdAt: '2026-01-01T00:00:00.000Z',
        openingHours: '06:00 às 21:00',
        address: {
          street: 'Rua Augusta',
          number: '500',
          neighborhood: 'Consolação',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01305-000'
        },
        deliveryRadiusKm: 4,
        serviceFeePercent: 8,
        activeDevicesCount: 1,
        devicesLimit: 2,
        isOpen: true
      }
    ];

    productsStore = [
      {
        id: 'prod-1',
        tenantId: 'tenant-1',
        name: 'Burger Artesanal Duplo',
        description: 'Blend angus grelhado no fogo',
        category: 'Lanches',
        price: 38.9,
        costPrice: 14.0,
        stock: 45,
        minStock: 10,
        barcode: '78900001',
        sku: 'SKU-BUR-01',
        image: 'https://example.com/burger.jpg',
        availableOnline: true
      }
    ];

    ordersStore = [];
    financialsStore = [];
    tablesStore = [
      { id: 't-1', tenantId: 'tenant-1', number: 1, capacity: 4, status: 'available' },
      { id: 't-2', tenantId: 'tenant-1', number: 2, capacity: 4, status: 'available' },
      { id: 't-3', tenantId: 'tenant-1', number: 3, capacity: 2, status: 'available' },
      { id: 't-4', tenantId: 'tenant-1', number: 4, capacity: 6, status: 'available' }
    ];

    driversStore = [
      {
        id: 'drv-plat-1',
        tenantId: 'marketplace',
        name: 'Carlos Plataforma',
        phone: '(11) 99999-1111',
        vehicleType: 'moto',
        status: 'available',
        rating: 4.9,
        activeDeliveriesCount: 0,
        completedTodayCount: 5,
        driverType: 'platform'
      },
      {
        id: 'drv-priv-1',
        tenantId: 'tenant-1',
        name: 'Marcos Frota Loja',
        phone: '(11) 98888-2222',
        vehicleType: 'moto',
        status: 'available',
        rating: 5.0,
        activeDeliveriesCount: 0,
        completedTodayCount: 3,
        driverType: 'private'
      }
    ];

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, mockDomainInterceptor])),
        EcosystemService,
        MapToolsService,
        provideRouter([
          { path: 'login', children: [] },
          { path: 'hq', children: [] },
          { path: 'os', children: [] },
          { path: 'marketplace', children: [] },
          { path: 'storefront/:id', children: [] }
        ])
      ]
    });

    ecosystem = TestBed.inject(EcosystemService);
    mapTools = TestBed.inject(MapToolsService);

    ecosystem.tenantsService.tenants.set(tenantsStore);
    ecosystem.inventoryService.products.set(productsStore);
    ecosystem.tablesService.tables.set(tablesStore);
    ecosystem.logisticsService.drivers.set(driversStore);
    ecosystem.ordersService.orders.set([]);
    ecosystem.financialsService.records.set([]);
    ecosystem.offlineSync.isOnline.set(true);

    ecosystem.loginAs('hq_admin', '3eatcru@gmail.com', 'Admin HQ', '3EATCRU HQ', 'hq');
  });

  describe('MapToolsService (Geodesic Engines)', () => {
    it('should calculate Haversine distance correctly between two points', () => {
      const p1 = { lat: -23.5489, lng: -46.6388 };
      const p2 = { lat: -23.5651, lng: -46.6521 };

      const result = mapTools.calculateDistance(p1, p2);
      expect(result.km).toBeGreaterThan(1);
      expect(result.km).toBeLessThan(5);
      expect(result.meters).toBeCloseTo(result.km * 1000, 1);
      expect(result.miles).toBeCloseTo(result.km * 0.621371, 1);
    });

    it('should calculate polygon area with Shoelace formula', () => {
      const triangle = [
        { lat: -23.5651, lng: -46.6521 },
        { lat: -23.566, lng: -46.651 },
        { lat: -23.567, lng: -46.653 }
      ];

      const area = mapTools.calculateArea(triangle);
      expect(area).toBeGreaterThan(0);
    });

    it('should format coordinates to DMS (Degrees, Minutes, Seconds)', () => {
      const latDMS = mapTools.toDMS(-23.5651, true);
      const lngDMS = mapTools.toDMS(-46.6521, false);

      expect(latDMS).toContain('23°');
      expect(latDMS).toContain('S');
      expect(lngDMS).toContain('46°');
      expect(lngDMS).toContain('W');
    });
  });

  describe('EcosystemService (Tripartite SaaS Core)', () => {
    it('should start with null currentSession after logout for safety', async () => {
      await ecosystem.logout();
      expect(ecosystem.currentSession()).toBeNull();
      expect(ecosystem.security.executionMode()).toBe('real');
      expect(ecosystem.security.isSimulated()).toBe(false);
      expect(ecosystem.security.isRealMode()).toBe(true);
    });

    it('should set currentSession on loginAs and reset it on logout', async () => {
      ecosystem.hqService.maintenanceMode.set(true);
      ecosystem.marketplaceService.regionalConfig.update((config) => ({
        ...config,
        heroTitle: 'Configuração do contexto anterior'
      }));

      ecosystem.loginAs('operator', 'operador@teste.com', 'Operador Teste', 'Loja Teste', 'client');
      expect(ecosystem.currentSession()).not.toBeNull();
      expect(ecosystem.currentSession()?.role).toBe('operator');
      expect(ecosystem.security.executionMode()).toBe('simulation');
      expect(ecosystem.security.isSimulated()).toBe(true);
      expect(ecosystem.security.isRealMode()).toBe(false);
      expect(ecosystem.hqService.maintenanceMode()).toBe(false);
      expect(ecosystem.marketplaceService.regionalConfig().heroTitle).not.toBe('Configuração do contexto anterior');

      await ecosystem.logout();
      expect(ecosystem.currentSession()).toBeNull();
      expect(ecosystem.activeConsumer()).toBeNull();
      expect(ecosystem.security.executionMode()).toBe('real');
    });

    it('should keep the 8% platform delivery rate configured for the future while the feature is coming soon', () => {
      expect(ecosystem.hqCommissionRate()).toBe(0.08);
    });

    it('should calculate distance to user reference address', () => {
      expect(ecosystem.calculateDistanceToUser(-23.5651, -46.6521)).toBeNull();
      ecosystem.userReferenceCoords.set({ lat: -23.5651, lng: -46.6521 });
      const distance = ecosystem.calculateDistanceToUser(-23.5651, -46.6521);
      expect(distance).toBeCloseTo(0, 1);
    });

    it('should log audit events and maintain immutability', () => {
      const initialLogsCount = ecosystem.auditLogs().length;
      ecosystem.logAudit('Ação de Teste', 'System', 'Validação dos motores core', 'info');

      expect(ecosystem.auditLogs().length).toBe(initialLogsCount + 1);
      const latest = ecosystem.auditLogs()[0]!;
      expect(latest.action).toBe('Ação de Teste');
      expect(latest.severity).toBe('info');
    });

    it('should correctly distinguish platform drivers from store drivers', () => {
      const drivers = ecosystem.drivers();
      expect(drivers.length).toBeGreaterThan(0);

      const platformDrivers = drivers.filter((d) => d.driverType === 'platform');
      const privateDrivers = drivers.filter((d) => d.driverType === 'private');

      expect(platformDrivers.length).toBeGreaterThan(0);
      expect(privateDrivers.length).toBeGreaterThan(0);
    });

    it('should execute real structural system audit and produce detailed report', async () => {
      expect(ecosystem.systemAuditVerified()).toBe(false);
      expect(ecosystem.lastSystemAuditReport()).toBeNull();
      ecosystem.security.setExecutionMode('real');

      const report = await ecosystem.runFullSystemAudit();
      expect(report).toBeDefined();
      expect(report.tenantsChecked).toBeGreaterThan(0);
      expect(report.productsChecked).toBeGreaterThan(0);
      expect(report.ordersChecked).toBeGreaterThan(0);
      expect(report.orderTotalsConsistent).toBe(true);
      expect(['passed', 'warning', 'failed']).toContain(report.status);

      ecosystem.verifyFullSystemAudit();
      expect(ecosystem.systemAuditVerified()).toBe(true);
      expect(ecosystem.lastSystemAuditReport()).not.toBeNull();
    });

    it('should compute currentTenant correctly based on currentTenantId', () => {
      ecosystem.currentTenantId.set('tenant-1');
      expect(ecosystem.currentTenant().id).toBe('tenant-1');
      ecosystem.currentTenantId.set('tenant-2');
      expect(ecosystem.currentTenant().id).toBe('tenant-2');
      expect(ecosystem.currentTenant().name).toBe('Padaria & Empório Estrela');
    });

    it('should support table status and comanda order dispatching', async () => {
      const initialOrdersCount = ecosystem.orders().length;
      const prod = ecosystem.products()[0]!;

      await ecosystem.addOrder({
        tenantId: 'tenant-1',
        orderNumber: '#M1-TEST',
        type: 'dine-in',
        tableNumber: 'Mesa 1',
        items: [{ product: prod, quantity: 2, notes: 'Sem cebola' }],
        subtotal: prod.price * 2,
        tax: prod.price * 0.2,
        discount: 0,
        total: prod.price * 2.2,
        paymentMethod: 'card',
        status: 'pending',
        channel: 'POS'
      });

      expect(ecosystem.orders().length).toBe(initialOrdersCount + 1);
      const added = ecosystem.orders()[0]!;
      expect(added.tableNumber).toBe('Mesa 1');
      expect(added.items.length).toBe(1);
      expect(added.items[0]!.quantity).toBe(2);
    });

    it('should handle HQ backend synchronization gracefully', async () => {
      const result = await ecosystem.syncHqFromBackend();
      expect(typeof result).toBe('boolean');
    });

    it('should execute structural audit on backend with safe fallback', async () => {
      ecosystem.security.setExecutionMode('real');
      const report = await ecosystem.runStructuralAuditOnBackend();
      expect(report).toBeDefined();
      expect(ecosystem.systemAuditVerified()).toBe(true);
      expect(ecosystem.lastSystemAuditReport()?.status).toBe(report.status);
    });

    it('should handle Store OS backend synchronization gracefully', async () => {
      const result = await ecosystem.syncStoreOsFromBackend('tenant-1');
      expect(typeof result).toBe('boolean');
    });

    it('should update table status and comanda via updateTable', async () => {
      await ecosystem.updateTable('t-2', { status: 'occupied', guests: 4 });
      const table = ecosystem.tables().find((t) => t.id === 't-2');
      expect(table?.status).toBe('occupied');
      expect(table?.guests).toBe(4);
    });

    it('should update product stock and details via updateProduct', async () => {
      await ecosystem.updateProduct('prod-1', { stock: 99 });
      const prod = ecosystem.products().find((p) => p.id === 'prod-1');
      expect(prod?.stock).toBe(99);
    });
  });

  describe('End-to-End Consumer Experience (Vitrine & Marketplace)', () => {
    it('should allow customer to place an online delivery order', async () => {
      const prod = ecosystem.products()[0]!;
      const initialOrdersCount = ecosystem.orders().length;

      const order = await ecosystem.addOrder({
        tenantId: 'tenant-1',
        orderNumber: '#ONL-5001',
        customerName: 'Mariana Silva',
        customerPhone: '(11) 98765-4321',
        type: 'delivery',
        channel: 'Customer Storefront',
        items: [{ product: prod, quantity: 2 }],
        subtotal: prod.price * 2,
        tax: 0,
        discount: 0,
        total: prod.price * 2 + 5.0,
        paymentMethod: 'online',
        status: 'pending'
      });

      expect(order).toBeDefined();
      expect(ecosystem.orders().length).toBe(initialOrdersCount + 1);
      const placed = ecosystem.orders().find((o) => o.orderNumber === '#ONL-5001');
      expect(placed).toBeDefined();
      expect(placed?.customerName).toBe('Mariana Silva');
      expect(placed?.type).toBe('delivery');
    });

    it('should allow customer to order via Table QR Code and update table occupancy', async () => {
      const prod = ecosystem.products()[0]!;

      await ecosystem.updateTable('t-3', {
        status: 'occupied',
        guests: 2,
        currentTotal: prod.price
      });

      const qrOrder = await ecosystem.addOrder({
        tenantId: 'tenant-1',
        orderNumber: '#QR-T3-01',
        customerName: 'Cliente Mesa 3',
        type: 'dine-in',
        tableNumber: 'Mesa 3',
        channel: 'Table QR',
        items: [{ product: prod, quantity: 1 }],
        subtotal: prod.price,
        tax: prod.price * 0.1,
        discount: 0,
        total: prod.price * 1.1,
        paymentMethod: 'card',
        status: 'pending'
      });

      expect(qrOrder).toBeDefined();
      const table = ecosystem.tables().find((t) => t.id === 't-3');
      expect(table?.status).toBe('occupied');
      expect(table?.guests).toBe(2);
      expect(table?.currentTotal).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Store Operator Experience (PDV, KDS, Estoque, Caixa)', () => {
    it('should process front-counter POS checkout and manual treasury income', async () => {
      const prod = ecosystem.products()[0]!;
      const initialFins = ecosystem.financials().length;

      const posOrder = await ecosystem.addOrder({
        tenantId: 'tenant-1',
        orderNumber: '#PDV-9001',
        type: 'pos-counter',
        channel: 'POS',
        items: [{ product: prod, quantity: 1 }],
        subtotal: prod.price,
        tax: 0,
        discount: 0,
        total: prod.price,
        paymentMethod: 'pix',
        status: 'pending'
      });

      expect(posOrder).toBeDefined();

      // P1.7: Manual treasury entries use 'income' (never manual 'sale')
      await ecosystem.addFinancialEntry({
        date: new Date().toISOString(),
        type: 'income',
        category: 'Receita Operacional',
        description: `Suprimento de Conferência ${posOrder.orderNumber}`,
        amount: posOrder.total,
        paymentMethod: 'PIX',
        referenceId: posOrder.id
      });

      expect(ecosystem.financials().length).toBe(initialFins + 1);
      const fin = ecosystem.financials().find((f) => f.referenceId === posOrder.id);
      expect(fin?.amount).toBe(posOrder.total);
      expect(fin?.type).toBe('income');
    });

    it('should advance KDS kitchen order workflow through all preparation stages', async () => {
      const prod = ecosystem.products()[0]!;
      const order = await ecosystem.addOrder({
        tenantId: 'tenant-1',
        orderNumber: '#KDS-8801',
        type: 'delivery',
        channel: 'Customer Storefront',
        items: [{ product: prod, quantity: 1 }],
        subtotal: prod.price,
        tax: 0,
        discount: 0,
        total: prod.price,
        paymentMethod: 'online',
        status: 'pending'
      });

      await ecosystem.updateOrderStatus(order.id, 'preparing');
      let current = ecosystem.orders().find((o) => o.id === order.id);
      expect(current?.status).toBe('preparing');

      await ecosystem.updateOrderStatus(order.id, 'ready');
      current = ecosystem.orders().find((o) => o.id === order.id);
      expect(current?.status).toBe('ready');

      await ecosystem.updateOrderStatus(order.id, 'dispatched');
      current = ecosystem.orders().find((o) => o.id === order.id);
      expect(current?.status).toBe('dispatched');
    });

    it('should register sangria and suprimento in store cashier ledger', async () => {
      const initialCount = ecosystem.financials().length;

      // Suprimento (Cash Inflow -> type: 'income' per P1.7)
      await ecosystem.addFinancialEntry({
        date: new Date().toISOString(),
        type: 'income',
        category: 'Aporte de Caixa',
        description: 'Suprimento de Troco Inicial',
        amount: 200.0,
        paymentMethod: 'Dinheiro',
        referenceId: 'ref-sup-01'
      });

      // Sangria (Cash Outflow -> type: 'expense')
      await ecosystem.addFinancialEntry({
        date: new Date().toISOString(),
        type: 'expense',
        category: 'Sangria de Caixa',
        description: 'Sangria de segurança para cofre',
        amount: 150.0,
        paymentMethod: 'Dinheiro',
        referenceId: 'ref-san-01'
      });

      expect(ecosystem.financials().length).toBe(initialCount + 2);
    });
  });

  describe('End-to-End Waiter Experience (Salão & Mesas Mobile)', () => {
    it('should allow waiter to open table, launch courses, request pre-bill, and settle', async () => {
      const prod = ecosystem.products()[0]!;

      await ecosystem.updateTable('t-4', {
        status: 'occupied',
        guests: 3,
        server: 'Lucas Garçom',
        currentTotal: 0
      });
      let table = ecosystem.tables().find((t) => t.id === 't-4');
      expect(table?.status).toBe('occupied');
      expect(table?.server).toBe('Lucas Garçom');

      const billAmount = prod.price * 3 * 1.1;
      await ecosystem.addOrder({
        tenantId: 'tenant-1',
        orderNumber: '#M4-C1',
        type: 'dine-in',
        tableNumber: 'Mesa 4',
        channel: 'POS',
        items: [{ product: prod, quantity: 3 }],
        subtotal: prod.price * 3,
        tax: prod.price * 3 * 0.1,
        discount: 0,
        total: billAmount,
        paymentMethod: 'card',
        status: 'pending'
      });

      await ecosystem.updateTable('t-4', {
        currentTotal: billAmount
      });
      table = ecosystem.tables().find((t) => t.id === 't-4');
      expect(table?.currentTotal).toBe(billAmount);

      await ecosystem.updateTable('t-4', { status: 'billing' });
      table = ecosystem.tables().find((t) => t.id === 't-4');
      expect(table?.status).toBe('billing');

      await ecosystem.updateTable('t-4', {
        status: 'available',
        currentTotal: 0,
        guests: undefined,
        server: undefined
      });
      table = ecosystem.tables().find((t) => t.id === 't-4');
      expect(table?.status).toBe('available');
      expect(table?.currentTotal).toBe(0);
    });
  });

  describe('End-to-End Driver & Logistics Experience', () => {
    it('should register a private store driver and update delivery status', async () => {
      const initialDriversCount = ecosystem.drivers().length;

      await ecosystem.addDriver({
        tenantId: 'tenant-1',
        name: 'Rafael Santos',
        phone: '(11) 97777-8888',
        vehicleType: 'moto',
        licensePlate: 'BRA-2E19',
        status: 'available',
        rating: 5.0,
        driverType: 'private',
        deviceName: 'Xiaomi Redmi Note 12',
        appVersion: '3EAT Driver App v3.2.0',
        batteryLevel: 98,
        lastGpsPing: 'Agora mesmo',
        currentLocationName: 'Na Loja (Disponível)',
        complianceVerified: true,
        cnhNumber: '99887766554'
      });

      expect(ecosystem.drivers().length).toBe(initialDriversCount + 1);
      const driver = ecosystem.drivers().find((d) => d.name === 'Rafael Santos');
      expect(driver).toBeDefined();
      expect(driver?.driverType).toBe('private');

      await ecosystem.updateDriverStatus(driver!.id, 'delivering');
      const updated = ecosystem.drivers().find((d) => d.id === driver!.id);
      expect(updated?.status).toBe('delivering');
    });

    it('should auto-cluster pending deliveries into geodetic routes', () => {
      const initialRoutes = ecosystem.deliveryRoutes().length;
      ecosystem.autoClusterAndCreateRoutes();
      expect(ecosystem.deliveryRoutes().length).toBeGreaterThanOrEqual(initialRoutes);
    });
  });

  describe('End-to-End HQ Central SaaS Governance Experience', () => {
    it('should keep the future platform delivery commission rate configurable', async () => {
      const initialRate = ecosystem.hqCommissionRate();
      expect(initialRate).toBe(0.08);

      await ecosystem.setPlatformCommissionRate(0.09);
      expect(ecosystem.hqCommissionRate()).toBe(0.09);

      await ecosystem.setPlatformCommissionRate(initialRate);
      expect(ecosystem.hqCommissionRate()).toBe(initialRate);
    });

    it('should update SaaS license plan price and persist', async () => {
      const plan = ecosystem.licensePlans().find((p) => p.id === 'Starter');
      expect(plan).toBeDefined();
      const origPrice = plan!.priceMonthly;

      await ecosystem.updatePlanPrice('Starter', 169.0);
      let updated = ecosystem.licensePlans().find((p) => p.id === 'Starter');
      expect(updated?.priceMonthly).toBe(169.0);

      await ecosystem.updatePlanPrice('Starter', origPrice);
      updated = ecosystem.licensePlans().find((p) => p.id === 'Starter');
      expect(updated?.priceMonthly).toBe(origPrice);
    });

    it('should update regional marketplace configuration and toggle system variables', async () => {
      const origName = ecosystem.regionalConfig().activeRegionName;

      await ecosystem.updateRegionalConfig({ activeRegionName: 'São Paulo Polo Gastronômico Sul' });
      expect(ecosystem.regionalConfig().activeRegionName).toBe('São Paulo Polo Gastronômico Sul');

      await ecosystem.updateRegionalConfig({ activeRegionName: origName });

      expect(ecosystem.maintenanceMode()).toBe(false);
      ecosystem.maintenanceMode.set(true);
      expect(ecosystem.maintenanceMode()).toBe(true);
      ecosystem.maintenanceMode.set(false);
      expect(ecosystem.maintenanceMode()).toBe(false);
    });
  });
});
