import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HqApiService } from './hq-api.service';

describe('HqApiService (HQ Central Dedicated Backend API)', () => {
  let service: HqApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HqApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(HqApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch overview SaaS metrics', async () => {
    const mockOverview = {
      tenantsCount: 3,
      activeTenantsCount: 3,
      totalDevices: 4,
      onlineDevices: 4,
      totalOrders: 20,
      grossPlatformVolume: 1250.0,
      hqCommissionRevenue: 100.0,
      defaultCommissionPercent: 8,
      maintenanceMode: false,
      globalBroadcastMessage: null,
      serverUptimeSeconds: 120,
      timestamp: '2026-10-29T12:00:00.000Z'
    };

    const promise = service.getOverview();
    const req = httpMock.expectOne('/api/hq/overview');
    expect(req.request.method).toBe('GET');
    req.flush(mockOverview);

    const data = await promise;
    expect(data.tenantsCount).toBe(3);
    expect(data.hqCommissionRevenue).toBe(100.0);
  });

  it('should list MDM devices with or without tenant filter', async () => {
    const mockDevices = [
      { id: 'dev-1', tenantId: 'tenant-1', deviceName: 'PDV 1', status: 'online' }
    ];

    const promise = service.getDevices('tenant-1');
    const req = httpMock.expectOne('/api/hq/devices?tenantId=tenant-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockDevices);

    const devices = await promise;
    expect(devices.length).toBe(1);
    expect(devices[0].deviceName).toBe('PDV 1');
  });

  it('should send lock command to device', async () => {
    const promise = service.lockDevice('dev-1');
    const req = httpMock.expectOne('/api/hq/devices/dev-1/lock');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'dev-1', status: 'locked' });

    const result = await promise;
    expect(result.status).toBe('locked');
  });

  it('should send restart command to device', async () => {
    const promise = service.restartDevice('dev-1');
    const req = httpMock.expectOne('/api/hq/devices/dev-1/restart');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Reboot command dispatched', status: 'updating' });

    const result = await promise;
    expect(result.status).toBe('updating');
  });

  it('should execute platform structural audit', async () => {
    const mockReport = {
      timestamp: '29/10/2026 12:00:00',
      tenantsChecked: 2,
      productsChecked: 10,
      ordersChecked: 5,
      devicesChecked: 3,
      ledgerConsistent: true,
      issuesFound: [],
      status: 'passed' as const
    };

    const promise = service.runAudit();
    const req = httpMock.expectOne('/api/hq/audit/run');
    expect(req.request.method).toBe('POST');
    req.flush(mockReport);

    const report = await promise;
    expect(report.status).toBe('passed');
    expect(report.ledgerConsistent).toBe(true);
  });

  it('should update tenant governance settings via PATCH', async () => {
    const promise = service.updateTenant('tenant-1', { serviceFeePercent: 8.5 });
    const req = httpMock.expectOne('/api/tenants/tenant-1');
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'tenant-1', serviceFeePercent: 8.5 });

    const updated = await promise;
    expect(updated.serviceFeePercent).toBe(8.5);
  });

  it('should fetch and update license plans', async () => {
    const mockPlans = [
      { id: 'Starter', name: 'Starter', priceMonthly: 149.0, maxDevices: 4, includedModules: [], description: 'Test' }
    ];

    const getPromise = service.getPlans();
    const getReq = httpMock.expectOne('/api/hq/plans');
    expect(getReq.request.method).toBe('GET');
    getReq.flush(mockPlans);
    const plans = await getPromise;
    expect(plans.length).toBe(1);

    const updatePromise = service.updatePlan('Starter', { priceMonthly: 179.0 });
    const updateReq = httpMock.expectOne('/api/hq/plans/Starter');
    expect(updateReq.request.method).toBe('PATCH');
    updateReq.flush({ ...mockPlans[0], priceMonthly: 179.0 });
    const updatedPlan = await updatePromise;
    expect(updatedPlan.priceMonthly).toBe(179.0);
  });

  it('should fetch and update regional marketplace configuration', async () => {
    const mockConfig = {
      heroTitle: 'Gastronomia & Varejo em São Paulo',
      heroSubtitle: 'Descubra os melhores estabelecimentos',
      heroTag: 'HUB OFICIAL 3EATCRU',
      heroBannerImage: 'https://example.com/banner.jpg',
      heroCtaText: 'Explorar Lojas',
      heroAnnouncement: 'Praça operando normalmente',
      showHeroAnnouncement: true,
      featuredTenantIds: ['tenant-1'],
      defaultSearchRadiusKm: 15,
      activeRegionName: 'São Paulo Centro-Sul'
    };

    const getPromise = service.getRegionalConfig();
    const getReq = httpMock.expectOne('/api/hq/regional');
    expect(getReq.request.method).toBe('GET');
    getReq.flush(mockConfig);
    const config = await getPromise;
    expect(config.activeRegionName).toBe('São Paulo Centro-Sul');

    const updatePromise = service.updateRegionalConfig({ ...mockConfig, defaultSearchRadiusKm: 20 });
    const updateReq = httpMock.expectOne('/api/hq/regional');
    expect(updateReq.request.method).toBe('POST');
    updateReq.flush({ config: { ...mockConfig, defaultSearchRadiusKm: 20 } });
    const result = await updatePromise;
    expect(result.config.defaultSearchRadiusKm).toBe(20);
  });

  it('should fetch drivers and ping telematics GPS', async () => {
    const mockDrivers = [
      { id: 'drv-1', name: 'Carlos Lima', status: 'available', currentLocationName: 'Bela Vista' }
    ];

    const getPromise = service.getDrivers();
    const getReq = httpMock.expectOne('/api/logistics/drivers');
    expect(getReq.request.method).toBe('GET');
    getReq.flush(mockDrivers);
    const drivers = await getPromise;
    expect(drivers.length).toBe(1);

    const pingPromise = service.pingDriverGps('drv-1', { locationName: 'Avenida Paulista', batteryLevel: 92 });
    const pingReq = httpMock.expectOne('/api/logistics/drivers/drv-1/ping');
    expect(pingReq.request.method).toBe('POST');
    pingReq.flush({ ...mockDrivers[0], currentLocationName: 'Avenida Paulista', batteryLevel: 92 });
    const pinged = await pingPromise;
    expect(pinged.currentLocationName).toBe('Avenida Paulista');
  });

  it('should fetch and save global CRM consumers', async () => {
    const mockConsumers = [
      { id: 'usr-1', name: 'Ana Oliveira', email: 'ana@example.com', phone: '11999999999' }
    ];

    const getPromise = service.getConsumers();
    const getReq = httpMock.expectOne('/api/crm/consumers');
    expect(getReq.request.method).toBe('GET');
    getReq.flush(mockConsumers);
    const consumers = await getPromise;
    expect(consumers.length).toBe(1);

    const savePromise = service.saveConsumer({ name: 'Bruno Santos', email: 'bruno@example.com' });
    const saveReq = httpMock.expectOne('/api/crm/consumers');
    expect(saveReq.request.method).toBe('POST');
    saveReq.flush({ id: 'usr-2', name: 'Bruno Santos', email: 'bruno@example.com' });
    const saved = await savePromise;
    expect(saved.id).toBe('usr-2');
  });

  it('should set platform commission rate, maintenance, broadcast, and retrieve ledger', async () => {
    // Commission rate
    const commPromise = service.setCommissionRate(8.5);
    const commReq = httpMock.expectOne('/api/hq/system/commission');
    expect(commReq.request.method).toBe('POST');
    expect(commReq.request.body).toEqual({ percent: 8.5 });
    commReq.flush({ defaultCommissionPercent: 8.5 });
    const commRes = await commPromise;
    expect(commRes.defaultCommissionPercent).toBe(8.5);

    // Maintenance
    const maintPromise = service.setMaintenance(true);
    const maintReq = httpMock.expectOne('/api/hq/system/maintenance');
    expect(maintReq.request.method).toBe('POST');
    maintReq.flush({ maintenanceMode: true });
    const maintRes = await maintPromise;
    expect(maintRes.maintenanceMode).toBe(true);

    // Broadcast
    const broadPromise = service.setBroadcast('Aviso do Fundador');
    const broadReq = httpMock.expectOne('/api/hq/system/broadcast');
    expect(broadReq.request.method).toBe('POST');
    broadReq.flush({ globalBroadcastMessage: 'Aviso do Fundador' });
    const broadRes = await broadPromise;
    expect(broadRes.globalBroadcastMessage).toBe('Aviso do Fundador');

    // Ledger
    const ledgerPromise = service.getLedger();
    const ledgerReq = httpMock.expectOne('/api/hq/ledger');
    expect(ledgerReq.request.method).toBe('GET');
    ledgerReq.flush({ totalPlatformFees: 250.0, platformSplitPercent: 8, recordsCount: 10, entries: [] });
    const ledgerRes = await ledgerPromise;
    expect(ledgerRes.totalPlatformFees).toBe(250.0);
  });
});
