import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { StoreOsApiService } from './store-os-api.service';

describe('StoreOsApiService (Store OS Dedicated Backend API)', () => {
  let service: StoreOsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StoreOsApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(StoreOsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch store products filtered by tenantId', async () => {
    const mockProducts = [
      { id: 'prod-1', tenantId: 'tenant-1', name: 'Burger Cru', price: 38.9, stock: 45 }
    ];

    const promise = service.getProducts('tenant-1');
    const req = httpMock.expectOne('/api/products?tenantId=tenant-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);

    const result = await promise;
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Burger Cru');
  });

  it('should update product stock and details via PATCH', async () => {
    const promise = service.updateProduct('prod-1', { stock: 50 });
    const req = httpMock.expectOne('/api/products/prod-1');
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'prod-1', stock: 50 });

    const result = await promise;
    expect(result.stock).toBe(50);
  });

  it('should update order workflow status for KDS and waiters', async () => {
    const promise = service.updateOrderStatus('ord-1', 'preparing');
    const req = httpMock.expectOne('/api/orders/ord-1/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'preparing' });
    req.flush({ id: 'ord-1', status: 'preparing' });

    const result = await promise;
    expect(result.status).toBe('preparing');
  });

  it('should fetch and update dine-in tables', async () => {
    const mockTables = [
      { id: 't-1', number: 1, capacity: 4, status: 'available' }
    ];

    const promiseGet = service.getTables();
    const reqGet = httpMock.expectOne('/api/tables');
    expect(reqGet.request.method).toBe('GET');
    reqGet.flush(mockTables);

    const tables = await promiseGet;
    expect(tables.length).toBe(1);

    const promisePatch = service.updateTable('t-1', { status: 'occupied' });
    const reqPatch = httpMock.expectOne('/api/tables/t-1');
    expect(reqPatch.request.method).toBe('PATCH');
    reqPatch.flush({ id: 't-1', status: 'occupied' });

    const updated = await promisePatch;
    expect(updated.status).toBe('occupied');
  });

  it('should add financial record for cash operations and expenses', async () => {
    const newRecord = {
      type: 'expense' as const,
      description: 'Sangria de Caixa',
      amount: 150.0
    };

    const promise = service.addFinancialRecord(newRecord);
    const req = httpMock.expectOne('/api/financials');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'fin-new', ...newRecord });

    const result = await promise;
    expect(result.id).toBe('fin-new');
    expect(result.amount).toBe(150.0);
  });

  it('should create product, create order, and update store settings', async () => {
    // createProduct
    const prodPromise = service.createProduct({ name: 'Chopp Artesanal IPA', price: 18.0 });
    const prodReq = httpMock.expectOne('/api/products');
    expect(prodReq.request.method).toBe('POST');
    prodReq.flush({ id: 'prod-new', name: 'Chopp Artesanal IPA', price: 18.0 });
    const prod = await prodPromise;
    expect(prod.id).toBe('prod-new');

    // createOrder
    const ordPromise = service.createOrder({ orderNumber: '#1050', total: 54.0 });
    const ordReq = httpMock.expectOne('/api/orders');
    expect(ordReq.request.method).toBe('POST');
    ordReq.flush({ id: 'ord-new', orderNumber: '#1050', total: 54.0 });
    const ord = await ordPromise;
    expect(ord.id).toBe('ord-new');

    // updateStoreSettings
    const setPromise = service.updateStoreSettings('tenant-1', { minOrderValue: 30.0 });
    const setReq = httpMock.expectOne('/api/tenants/tenant-1');
    expect(setReq.request.method).toBe('PATCH');
    setReq.flush({ id: 'tenant-1', minOrderValue: 30.0 });
    const sett = await setPromise;
    expect(sett.minOrderValue).toBe(30.0);
  });

  it('should manage private store drivers (get, create, update)', async () => {
    // getDrivers
    const drvPromise = service.getDrivers();
    const drvReq = httpMock.expectOne('/api/logistics/drivers');
    expect(drvReq.request.method).toBe('GET');
    drvReq.flush([{ id: 'drv-1', name: 'Carlos', status: 'available' }]);
    const drvs = await drvPromise;
    expect(drvs.length).toBe(1);

    // createDriver
    const createPromise = service.createDriver({ name: 'Lucas Moto', vehicleType: 'moto' });
    const createReq = httpMock.expectOne('/api/logistics/drivers');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ id: 'drv-new', name: 'Lucas Moto', vehicleType: 'moto' });
    const created = await createPromise;
    expect(created.id).toBe('drv-new');

    // updateDriver
    const updatePromise = service.updateDriver('drv-new', { status: 'offline' });
    const updateReq = httpMock.expectOne('/api/logistics/drivers/drv-new');
    expect(updateReq.request.method).toBe('PATCH');
    updateReq.flush({ id: 'drv-new', status: 'offline' });
    const updated = await updatePromise;
    expect(updated.status).toBe('offline');
  });

  it('should manage store reservations (get, create, updateStatus with tableId)', async () => {
    const getPromise = service.getReservations('tenant-1');
    const getReq = httpMock.expectOne('/api/reservations?tenantId=tenant-1');
    expect(getReq.request.method).toBe('GET');
    getReq.flush([
      {
        id: 'res-1',
        tenantId: 'tenant-1',
        customerName: 'Mariana',
        date: '2026-11-15',
        time: '20:00',
        partySize: 4,
        status: 'confirmed'
      }
    ]);
    const list = await getPromise;
    expect(list.length).toBe(1);
    expect(list[0].customerName).toBe('Mariana');

    const createPromise = service.createReservation({
      customerName: 'Pedro',
      date: '2026-11-15',
      time: '21:00',
      partySize: 2
    });
    const createReq = httpMock.expectOne('/api/reservations');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({
      id: 'res-2',
      tenantId: 'tenant-1',
      customerName: 'Pedro',
      date: '2026-11-15',
      time: '21:00',
      partySize: 2,
      status: 'confirmed'
    });
    const created = await createPromise;
    expect(created.id).toBe('res-2');

    const patchPromise = service.updateReservationStatus('res-2', 'seated', 'tbl-3');
    const patchReq = httpMock.expectOne('/api/reservations/res-2/status');
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ status: 'seated', tableId: 'tbl-3' });
    patchReq.flush({ id: 'res-2', status: 'seated', tableId: 'tbl-3', tableNumber: 3 });
    const seated = await patchPromise;
    expect(seated.status).toBe('seated');
    expect(seated.tableNumber).toBe(3);
  });
});

