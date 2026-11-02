import { Injectable, signal, inject, PLATFORM_ID, effect, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MapToolsService } from './map-tools.service';
import {
  AppRole,
  EcosystemPillar,
  ActiveEcosystemTab,
  CompanyTenant,
  POSDevice,
  ProductItem,
  OrderTransaction,
  FinancialRecord,
  AuditLog,
  StoreDriver,
  DeliveryWaypoint,
  ConsumerAccount,
  SystemAuditReport,
  CartItem,
  TableInfo,
  MarketingCampaign,
  Employee,
  ServiceOrder,
  Appointment,
  RegionalMarketplaceConfig,
  CommercialChannel,
  CommercialDeviceType
} from '../models/ecosystem.model';

import { FinancialCoreEngine } from '../core/engines/financial-core.engine';
import { LogisticsCoreEngine } from '../core/engines/logistics-core.engine';
import { InventoryCoreEngine } from '../core/engines/inventory-core.engine';
import { OrderWorkflowCoreEngine } from '../core/engines/order-workflow-core.engine';
import { PaymentEngine } from '../core/engines/payment.engine';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SecurityService } from './security.service';
import { OrdersService } from './orders.service';
import { TenantsService } from './tenants.service';
import { InventoryService } from './inventory.service';
import { FinancialsService } from './financials.service';
import { LogisticsService } from './logistics.service';
import { CrmService } from './crm.service';
import { TablesService } from './tables.service';
import { MarketplaceService } from './marketplace.service';
import { HqService } from './hq.service';
import { CommunicationsService } from './communications.service';
import { NotesService } from './notes.service';
import { HrService } from './hr.service';
import { AppointmentsService } from './appointments.service';
import { ServiceOrdersService } from './service-orders.service';
import { OfflineSyncService, SyncConflictRecord } from '../core/offline/offline-sync.service';
import { UiNotificationService } from './ui-notification.service';

const VALID_TABS: ReadonlySet<string> = new Set([
  'hq',
  'client',
  'marketplace',
  'storefront',
  'waiter',
  'driver',
  'consumer',
  'login'
]);

/**
 * Compatibility Facade & Global UI Context (`EcosystemService`)
 */
@Injectable({
  providedIn: 'root'
})
export class EcosystemService {
  private readonly router = inject(Router);
  public readonly mapTools = inject(MapToolsService);
  public readonly firebase = inject(FirebaseService);
  public readonly security = inject(SecurityService);
  public readonly ordersService = inject(OrdersService);
  public readonly tenantsService = inject(TenantsService);
  public readonly inventoryService = inject(InventoryService);
  public readonly financialsService = inject(FinancialsService);
  public readonly hqService = inject(HqService);
  public readonly logisticsService = inject(LogisticsService);
  public readonly crmService = inject(CrmService);
  public readonly tablesService = inject(TablesService);
  public readonly marketplaceService = inject(MarketplaceService);
  public readonly communicationsService = inject(CommunicationsService);
  public readonly notesService = inject(NotesService);
  public readonly hrService = inject(HrService);
  public readonly appointmentsService = inject(AppointmentsService);
  public readonly serviceOrdersService = inject(ServiceOrdersService);
  public readonly offlineSync = inject(OfflineSyncService);
  public readonly uiNotification = inject(UiNotificationService);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  public readonly financialEngine = inject(FinancialCoreEngine);
  public readonly logisticsEngine = inject(LogisticsCoreEngine);
  public readonly inventoryEngine = inject(InventoryCoreEngine);
  public readonly orderEngine = inject(OrderWorkflowCoreEngine);
  public readonly paymentEngine = inject(PaymentEngine);

  readonly currentTenantId = signal<string>('');
  readonly currentSession = this.security.currentSession;
  readonly isSimulationMode = computed(() => this.security.isSimulated());
  readonly isRealMode = computed(() => this.security.isRealMode());

  readonly currentTenant = computed(() => {
    const activeId = this.resolveOperationalTenantId();
    return this.tenants().find((t) => t.id === activeId) || this.tenants()[0];
  });

  // Compatibility Read Bridges (@deprecated — prefer injecting domain services directly)
  readonly tenants = this.tenantsService.tenants;
  readonly publicStorefronts = this.tenantsService.publicStorefronts;
  readonly publicStorefrontsStatus = this.tenantsService.publicStorefrontsStatus;
  readonly products = this.inventoryService.products;
  readonly orders = this.ordersService.orders;
  readonly financials = this.financialsService.records;
  readonly devices = this.hqService.devices;
  readonly auditLogs = this.hqService.auditLogs;
  readonly drivers = this.logisticsService.drivers;
  readonly deliveryRoutes = this.logisticsService.deliveryRoutes;
  readonly consumerAccounts = this.crmService.consumerAccounts;
  readonly consumerAccountsStatus = this.crmService.consumerAccountsStatus;
  readonly activeConsumer = this.crmService.activeConsumer;
  readonly customers = this.crmService.customers;
  readonly tables = this.tablesService.tables;
  readonly promotions = this.inventoryService.promotions;
  readonly suppliers = this.inventoryService.suppliers;
  readonly regionalConfig = this.marketplaceService.regionalConfig;
  readonly maxDiscoveryRadiusKm = this.marketplaceService.maxDiscoveryRadiusKm;
  readonly userReferenceAddress = this.marketplaceService.userReferenceAddress;
  readonly userReferenceCoords = this.marketplaceService.userReferenceCoords;
  readonly maintenanceMode = this.hqService.maintenanceMode;
  readonly hqCommissionRate = this.hqService.hqCommissionRate;
  readonly hqOverview = this.hqService.overview;
  readonly activeSessionsCount = this.hqService.activeSessionsCount;
  readonly avgLatencyMs = this.hqService.avgLatencyMs;
  readonly globalBroadcastMessage = this.hqService.globalBroadcastMessage;
  readonly hqEstimatedCommissionRevenue = this.hqService.hqEstimatedCommissionRevenue;
  readonly hqPublicSalesTotal = this.hqService.hqPublicSalesTotal;
  readonly licensePlans = this.hqService.licensePlans;
  readonly licensePlansStatus = this.hqService.licensePlansStatus;
  readonly licensePlansSource = this.hqService.licensePlansSource;
  readonly marketingCampaigns = this.crmService.marketingCampaigns;
  readonly externalOrders = this.ordersService.externalOrders;
  readonly socialMessages = this.communicationsService.socialMessages;
  readonly pendingKdsOrders = this.ordersService.pendingKdsOrders;
  readonly notes = this.notesService.notes;
  readonly employees = this.hrService.employees;
  readonly clockEvents = this.hrService.clockEvents;
  readonly appointments = this.appointmentsService.appointments;
  readonly serviceOrders = this.serviceOrdersService.serviceOrders;

  readonly isOnline = this.offlineSync.isOnline;
  readonly pendingSyncCount = this.offlineSync.pendingSyncCount;
  readonly syncConflicts = this.offlineSync.syncConflicts;
  readonly unresolvedConflictsCount = this.offlineSync.unresolvedConflictsCount;
  readonly lastSyncTimestamp = this.offlineSync.lastSyncTimestamp;

  readonly totalOnlineDevices = computed(
    () => this.devices().filter((d) => d.status === 'online').length
  );
  readonly totalActiveTenants = this.hqService.totalActiveTenants;
  readonly uptimePercent = this.hqService.uptimePercent;

  readonly activeTab = signal<ActiveEcosystemTab>('login');
  readonly currentView = signal<'os' | 'hq' | 'marketplace' | 'login'>('login');
  readonly notification = this.uiNotification.notification;

  readonly customerCart = signal<CartItem[]>(this.loadCartFromStorage());
  readonly orderType = signal<'delivery' | 'dine-in' | 'takeout'>('delivery');
  readonly selectedTableNumber = signal<number>(1);
  readonly customerName = signal<string>('');
  readonly customerPhone = signal<string>('');
  readonly deliveryAddress = signal<string>('');

  readonly systemAuditVerified = signal<boolean>(false);
  readonly lastSystemAuditReport = signal<SystemAuditReport | null>(null);

  constructor() {
    effect(() => {
      const session = this.security.currentSession();
      if (session?.tenantId) {
        this.currentTenantId.set(session.tenantId);
      } else if (!this.currentTenantId() && this.tenants().length > 0) {
        this.currentTenantId.set(this.tenants()[0]!.id);
      }
    });

    if (this.isBrowser) {
      effect(() => {
        this.saveCartToStorage();
      });
    }

    this.offlineSync.onActionSynced((item, serverResponse) => {
      if (item.action === 'CREATE_ORDER' && serverResponse && typeof serverResponse === 'object') {
        const syncedOrder = serverResponse as OrderTransaction;
        this.ordersService.orders.update((cur) =>
          cur.map((o) => (o.id === item.id ? syncedOrder : o))
        );
        const tid = syncedOrder.tenantId || this.resolveOperationalTenantId();
        if (tid) {
          this.inventoryService.fetchProducts(tid).catch(() => []);
          this.financialsService.fetchRecords(tid).catch(() => []);
        }
        this.notify(
          `Venda offline ${syncedOrder.orderNumber} sincronizada com sucesso no Motor Comercial.`,
          'success'
        );
      }
    });

    this.offlineSync.onActionConflict((conflict: SyncConflictRecord) => {
      if (conflict.action === 'CREATE_ORDER') {
        this.ordersService.orders.update((cur) =>
          cur.map((o) => (o.id === conflict.id ? { ...o, status: 'cancelled' } : o))
        );
        const tid = conflict.tenantId || this.resolveOperationalTenantId();
        if (tid) {
          this.inventoryService.fetchProducts(tid).catch(() => []);
        }
        this.notify(
          `CONFLITO DE ESTOQUE (${conflict.orderNumber}): ${conflict.reason} Venda offline cancelada — verifique alerta no PDV.`,
          'error'
        );
      }
    });
  }

  resolveOperationalTenantId(explicitTenantId?: string): string {
    const session = this.security.currentSession();
    
    // 1. Staff Pillar: Strictly bound to their assigned tenantId
    if (
      session?.tenantId &&
      (session.role === 'tenant_owner' || session.role === 'operator' || session.role === 'waiter')
    ) {
      return session.tenantId;
    }

    // 2. Explicit ID: Highest priority for dynamic contexts (e.g. Marketplace discovery)
    if (explicitTenantId) return explicitTenantId;

    // 3. Admin Pillar: Never fallback to first tenant automatically to prevent mixing Dev/Real
    if (session?.role === 'hq_admin') {
      return this.currentTenantId() || '';
    }

    // 4. Default Fallback: Only for non-admin contexts
    return (
      this.currentTenantId() ||
      session?.tenantId ||
      this.tenants()[0]?.id ||
      ''
    );
  }

  private loadCartFromStorage(): CartItem[] {
    if (this.isBrowser) {
      try {
        const saved = localStorage.getItem('3eatcru_cart');
        return saved ? (JSON.parse(saved) as CartItem[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  saveCartToStorage() {
    if (this.isBrowser) {
      localStorage.setItem('3eatcru_cart', JSON.stringify(this.customerCart()));
    }
  }

  notify(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') {
    this.uiNotification.notify(message, type);
  }

  clearNotification() {
    this.uiNotification.clearNotification();
  }

  /** @deprecated Sandbox/Test-only session helper */
  loginAs(
    role: AppRole,
    email: string,
    name?: string,
    tenantName?: string,
    tabOrTenantId: ActiveEcosystemTab | string = 'client'
  ) {
    const isTab = VALID_TABS.has(tabOrTenantId);
    const resolvedTenantId = !isTab ? (tabOrTenantId as string) : undefined;
    
    // 1. Set the correct Pillar for the requested role
    const pillar: EcosystemPillar = 
      role === 'hq_admin' ? 'hq' : 
      role === 'driver' ? 'driver' : 
      role === 'consumer' ? 'consumer' : 'os';
    
    this.security.setPillar(pillar);

    // 2. Use SecurityService to properly set simulation flags & local session
    this.security.setSimulatedSession(
      role,
      email,
      name,
      resolvedTenantId,
      tenantName
    );

    if (resolvedTenantId) {
      this.currentTenantId.set(resolvedTenantId);
    }

    if (role === 'hq_admin') {
      this.currentView.set('hq');
      this.activeTab.set('hq');
    } else {
      this.currentView.set('os');
      const resolvedTab: ActiveEcosystemTab = isTab ? (tabOrTenantId as ActiveEcosystemTab) : 'client';
      this.activeTab.set(resolvedTab);
    }
  }

  async logout() {
    await this.security.logout();
    this.currentView.set('login');
    this.activeTab.set('login');
  }

  async syncStoreOsFromBackend(tenantId?: string): Promise<boolean> {
    if (this.isSimulationMode()) return true;
    try {
      const activeTenant = this.resolveOperationalTenantId(tenantId);
      if (!activeTenant) return false;
      
      // Perform granular syncs
      await this.syncEssentialStoreMetadata(activeTenant);
      await this.syncHospitalityModule(activeTenant);
      await this.syncFinancialsModule(activeTenant);
      
      return true;
    } catch (err) {
      console.warn('EcosystemService.syncStoreOsFromBackend deferred:', err);
      return false;
    }
  }

  /**
   * P0: Sync only what's needed for the OS Shell and basic operability
   */
  async syncEssentialStoreMetadata(tenantId?: string): Promise<void> {
    const tid = this.resolveOperationalTenantId(tenantId);
    if (!tid) return;

    await this.hqService.fetchPublicStatus().catch(() => undefined);
    
    // Essential: Tenants info and recent orders for taskbar/notifications
    await this.tenantsService.fetchAllTenants().catch(() => []);
    await this.ordersService.fetchOrders(tid).catch(() => []);
    
    // Prefetch products for POS as it's the most common entry point
    await this.inventoryService.fetchProducts(tid).catch(() => []);
  }

  /**
   * P1: Sync tables and reservations for Hospitality segment
   */
  async syncHospitalityModule(tenantId?: string): Promise<void> {
    const tid = this.resolveOperationalTenantId(tenantId);
    if (!tid) return;
    await this.tablesService.fetchTables(tid).catch(() => []);
    await this.appointmentsService.fetchAppointments(tid).catch(() => []);
  }

  /**
   * P1: Sync financials and ledger
   */
  async syncFinancialsModule(tenantId?: string): Promise<void> {
    const tid = this.resolveOperationalTenantId(tenantId);
    if (!tid) return;
    await this.financialsService.fetchRecords(tid).catch(() => []);
  }

  async syncMarketplaceFromBackend(): Promise<boolean> {
    if (this.isSimulationMode()) return true;
    try {
      await this.marketplaceService.fetchRegionalConfig();
      await this.tenantsService.fetchPublicStorefronts();
      return true;
    } catch (err) {
      console.warn('EcosystemService.syncMarketplaceFromBackend deferred:', err);
      return false;
    }
  }

  async syncHqFromBackend(): Promise<boolean> {
    if (this.isSimulationMode()) return true;
    try {
      await this.hqService.getOverview();
      await this.hqService.fetchPlans();
      await this.tenantsService.fetchAllTenants();
      await this.hqService.fetchDevices();
      await this.hqService.fetchAuditLogs();
      await this.logisticsService.fetchDrivers();
      await this.crmService.fetchConsumers();
      return true;
    } catch (err) {
      console.warn('EcosystemService.syncHqFromBackend deferred:', err);
      return false;
    }
  }

  async runStructuralAuditOnBackend(): Promise<SystemAuditReport> {
    const report = await this.hqService.runAudit();
    this.lastSystemAuditReport.set(report);
    this.systemAuditVerified.set(true);
    return report;
  }

  getOperationalContext(): { channel: CommercialChannel; deviceType: CommercialDeviceType; deviceId?: string } {
    const view = this.currentView();
    const session = this.currentSession();
    
    // Default context based on view
    if (view === 'hq') {
      return { channel: 'HQ', deviceType: 'desktop', deviceId: 'hq-console-master' };
    }
    
    if (view === 'marketplace' || view === 'login') {
      return { channel: 'Online Marketplace', deviceType: 'mobile' };
    }
    
    // OS context: can be POS, Waiter, or Admin Desktop
    const tab = this.activeTab();
    if (tab === 'waiter') return { channel: 'Waiter Comanda', deviceType: 'mobile' };
    if (tab === 'hq') return { channel: 'HQ', deviceType: 'desktop' };
    
    // Default Store OS Context
    return { 
      channel: 'POS', 
      deviceType: 'terminal', 
      deviceId: session?.tenantId ? `term-${session.tenantId}-01` : undefined 
    };
  }

  async addOrder(order: Partial<OrderTransaction>): Promise<OrderTransaction> {
    const tenantId = this.resolveOperationalTenantId(order.tenantId);
    const context = this.getOperationalContext();
    
    const orderPayload: Partial<OrderTransaction> = { 
      ...order, 
      tenantId,
      channel: order.channel || context.channel,
      deviceType: order.deviceType || context.deviceType,
      deviceId: order.deviceId || context.deviceId,
      operatorName: order.operatorName || this.currentSession()?.name
    };

    if (!this.isSimulationMode() && !this.offlineSync.isOnline()) {
      const offlineId = `off-ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const offlineOrder: OrderTransaction = {
        id: offlineId,
        tenantId,
        tenantName: this.tenants().find((t) => t.id === tenantId)?.name,
        orderNumber: order.orderNumber || `#OFF-${Math.floor(Math.random() * 900 + 100)}`,
        type: order.type || 'pos-counter',
        items: order.items || [],
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        discount: order.discount || 0,
        total: order.total || 0,
        paymentMethod: order.paymentMethod || 'cash',
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        channel: orderPayload.channel!,
        deviceId: orderPayload.deviceId,
        deviceName: orderPayload.deviceName,
        deviceType: orderPayload.deviceType,
        operatorName: orderPayload.operatorName
      };

      this.ordersService.orders.update((cur) => [offlineOrder, ...cur]);
      this.offlineSync.enqueueAction(
        'CREATE_ORDER',
        '/api/orders',
        { ...orderPayload, id: offlineId, idempotencyKey: offlineId } as Record<string, unknown>,
        offlineId
      );
      this.notify(
        'Venda registrada na contingência local offline (chave idempotente gerada).',
        'info'
      );
      return offlineOrder;
    }

    const created = await this.ordersService.createOrder(orderPayload);
    if (tenantId) {
      await this.inventoryService.fetchProducts(tenantId).catch(() => []);
      if (created.status === 'completed') {
        await this.financialsService.fetchRecords(tenantId).catch(() => []);
      }
    }
    return created;
  }

  async updateOrderStatus(id: string, status: OrderTransaction['status']) {
    const updated = await this.ordersService.updateStatus(id, status);
    const tenantId = this.resolveOperationalTenantId(updated.tenantId);
    if (tenantId) {
      if (status === 'cancelled') {
        await this.inventoryService.fetchProducts(tenantId).catch(() => []);
      }
      if (status === 'completed' || status === 'cancelled') {
        await this.financialsService.fetchRecords(tenantId).catch(() => []);
      }
    }
    return updated;
  }

  clearSimulationData() {
    this.ordersService.orders.update((cur) =>
      cur.filter((o) => !o.isSimulated && o.mode !== 'simulation')
    );
    this.notify('Pedidos simulados removidos da memória local.', 'info');
  }

  // --- Compatibility Facade Delegates (@deprecated — inject Feature Services directly in new code) ---

  async addTenant(tenant: Partial<CompanyTenant>) {
    return this.tenantsService.createTenant(tenant);
  }

  async updateTenant(id: string, updates: Partial<CompanyTenant>) {
    return this.tenantsService.updateTenant(id, updates);
  }

  async linkTenantOwner(id: string, email: string) {
    return this.tenantsService.linkOwner(id, email);
  }

  async getTenantOwner(id: string) {
    return this.tenantsService.getOwner(id);
  }

  async addProduct(product: Partial<ProductItem>) {
    const tenantId = this.resolveOperationalTenantId(product.tenantId);
    await this.inventoryService.createProduct({ ...product, tenantId });
  }

  async updateProduct(id: string, updates: Partial<ProductItem>) {
    await this.inventoryService.updateProduct(id, updates);
  }

  async addFinancialEntry(entry: Partial<FinancialRecord>) {
    const tenantId = this.resolveOperationalTenantId(entry.tenantId);
    await this.financialsService.addRecord({ ...entry, tenantId });
  }

  async updateTable(id: string, updates: Partial<TableInfo>) {
    await this.tablesService.updateTable(id, updates);
  }

  async addDevice(device: Partial<POSDevice>) {
    if (this.isSimulationMode() && device.tenantId && device.tenantId !== 'hq') {
      const tenant = this.tenants().find(candidate => candidate.id === device.tenantId);
      if (!tenant) throw new Error('Tenant de destino não encontrado na simulação.');
      const registeredDevices = this.devices().filter(candidate => candidate.tenantId === tenant.id).length;
      if (!Number.isInteger(tenant.devicesLimit) || tenant.devicesLimit < 1 || tenant.devicesLimit > 999) {
        throw new Error('A cota de dispositivos desta loja está inválida. Corrija a cota na governança do tenant.');
      }
      if (registeredDevices >= tenant.devicesLimit) {
        throw new Error(`A loja já possui ${registeredDevices} registro(s) de dispositivo para uma cota de ${tenant.devicesLimit}. Aumente a cota na governança do tenant para continuar.`);
      }
    }
    await this.hqService.createDevice(device);
  }

  async setPlatformCommissionRate(rate: number) {
    await this.hqService.setCommissionRate(rate * 100);
    this.notify('Comissão global atualizada.', 'success');
  }

  async keepPlatformCommissionComingSoon() {
    await this.hqService.keepPlatformCommissionComingSoon();
  }

  async setMaintenance(enabled: boolean) {
    await this.hqService.setMaintenance(enabled);
  }

  async setBroadcast(message: string) {
    await this.hqService.setBroadcast(message);
  }

  async updatePlanPrice(planId: string, price: number, maxDevices?: number) {
    await this.hqService.updatePlanPrice(planId, price, maxDevices);
  }

  logAudit(
    action: string,
    module: AuditLog['module'],
    details: string,
    severity: AuditLog['severity'] = 'info'
  ) {
    this.hqService.logAudit(action, module, details, severity);
  }

  async registerConsumer(consumer: Partial<ConsumerAccount>) {
    await this.crmService.registerConsumer(consumer);
    this.notify('Perfil de consumidor cadastrado com sucesso!', 'success');
  }

  loginConsumer(consumer: ConsumerAccount | string) {
    if (typeof consumer === 'string') {
      const found = this.consumerAccounts().find(
        (c) => c.email === consumer || c.id === consumer
      );
      if (found) {
        this.crmService.loginConsumer(found);
        return true;
      }
      return false;
    }
    this.crmService.loginConsumer(consumer);
    return true;
  }

  logoutConsumer() {
    this.crmService.logoutConsumer();
  }

  async updateConsumerProfile(id: string, updates: Partial<ConsumerAccount>) {
    await this.crmService.updateConsumerProfile(id, updates);
  }

  async addCustomer(customer: Partial<ConsumerAccount>) {
    await this.crmService.createConsumer(customer);
  }

  async createMarketingCampaign(campaign: Partial<MarketingCampaign>) {
    await this.crmService.createMarketingCampaign(campaign);
  }

  async dispatchCampaign(id: string) {
    await this.crmService.dispatchCampaign(id);
  }

  async addLoyaltyPoints(consumerId: string, points: number, reason?: string) {
    await this.crmService.addLoyaltyPoints(consumerId, points);
    if (reason) this.notify(`Pontos fidelidade atualizados: ${reason}`, 'info');
  }

  async addStoreCredit(_consumerId: string, amount: number, reason?: string) {
    this.notify(
      `Crédito em loja demonstrativo: R$ ${amount.toFixed(2)}${reason ? ' (' + reason + ')' : ''}`,
      'info'
    );
  }

  async addNote(id: string, content: string, color: string) {
    await this.notesService.addNote({ id, content, color, title: 'Nota' });
  }

  async deleteNote(id: string) {
    await this.notesService.deleteNote(id);
  }

  async addEmployee(employee: Partial<Employee>) {
    await this.hrService.addEmployee(employee);
  }

  async deleteEmployee(id: string) {
    await this.hrService.deleteEmployee(id);
  }

  async toggleClock(id: string) {
    await this.hrService.toggleClock(id);
  }

  async addServiceOrder(so: Partial<ServiceOrder>) {
    await this.serviceOrdersService.addServiceOrder(so);
  }

  async updateServiceOrderStatus(id: string, status: ServiceOrder['status'], progress?: number) {
    await this.serviceOrdersService.updateStatus(id, status, progress);
  }

  async addAppointment(apt: Partial<Appointment>): Promise<Appointment> {
    const tenantId = this.resolveOperationalTenantId(apt.tenantId);
    const created = await this.appointmentsService.addAppointment({ ...apt, tenantId });
    if (created.tableId && tenantId) {
      await this.tablesService.fetchTables(tenantId).catch(() => []);
    }
    return created;
  }

  async updateAppointmentStatus(
    id: string,
    status: Appointment['status'],
    tableId?: string
  ): Promise<Appointment> {
    const updated = await this.appointmentsService.updateStatus(id, status, tableId);
    const tenantId = this.resolveOperationalTenantId(updated.tenantId);
    if (tenantId) {
      await this.tablesService.fetchTables(tenantId).catch(() => []);
    }
    return updated;
  }

  async clockOffDriver(driverId: string) {
    void driverId;
    this.notify('O encerramento de turno ainda não está conectado ao serviço logístico.', 'warning');
  }

  async updateDriverRateConfig(config?: unknown) {
    void config;
    this.notify('A configuração de taxas ainda não está conectada ao serviço logístico.', 'warning');
  }

  async createDeliveryRoute(
    waypoints: DeliveryWaypoint[],
    driverId?: string,
    storeDriverCompensation = 0
  ) {
    const route = await this.logisticsService.createDeliveryRoute(waypoints, storeDriverCompensation);
    if (driverId) await this.logisticsService.acceptDeliveryRoute(route.id, driverId);
    return route;
  }

  async autoClusterAndCreateRoutes() {
    this.notify('A geração automática de rotas ainda não está implementada.', 'warning');
  }

  async cancelRoute(routeId?: string) {
    void routeId;
    this.notify('O cancelamento de rotas ainda não está conectado ao serviço logístico.', 'warning');
  }

  async addDriver(driver?: Partial<StoreDriver> | StoreDriver) {
    if (!driver?.name) {
      this.notify('Informe o nome do entregador para cadastrá-lo.', 'warning');
      return;
    }

    const fullDriver: StoreDriver = {
      id: (driver as StoreDriver).id || `drv-${Date.now()}`,
      tenantId: this.resolveOperationalTenantId(driver.tenantId),
      name: driver.name,
      phone: driver.phone || '',
      vehicleType: driver.vehicleType || 'moto',
      licensePlate: driver.licensePlate,
      status: driver.status || 'available',
      rating: driver.rating,
      activeDeliveriesCount: driver.activeDeliveriesCount ?? 0,
      completedTodayCount: driver.completedTodayCount ?? 0,
      driverType: driver.driverType || 'private',
      deviceName: driver.deviceName || 'Mobile App',
      cnhNumber: driver.cnhNumber
    };
    await this.logisticsService.createDriver(fullDriver);
    this.notify('Novo entregador cadastrado.', 'success');
  }

  async assignDriverToRoute(routeId: string, driverId: string) {
    await this.logisticsService.acceptDeliveryRoute(routeId, driverId);
  }

  async updateDriverStatus(id: string, status: StoreDriver['status']) {
    await this.logisticsService.updateDriver(id, { status });
  }

  async payDriver(_id: string, amount: number, method: 'PIX' | 'Dinheiro' = 'PIX', isClockOff = false) {
    void amount;
    void method;
    void isClockOff;
    this.notify('O pagamento do entregador ainda não está conectado a um fluxo financeiro.', 'warning');
  }

  async unlockDevice(id: string) {
    await this.hqService.restartDevice(id);
  }

  async revokeDevice(id: string) {
    await this.hqService.lockDevice(id);
  }

  async updateRegionalConfig(config: Partial<RegionalMarketplaceConfig>) {
    await this.marketplaceService.updateRegionalConfig(config);
    this.notify('Configuração regional do Marketplace atualizada.', 'success');
  }

  async toggleStoreOpenStatus(tenantId: string, isOpen: boolean): Promise<boolean> {
    try {
      await this.tenantsService.updateTenant(tenantId, { isOpen });
      const storeName = this.tenants().find(t => t.id === tenantId)?.name || 'Estabelecimento';
      this.notify(`${storeName} agora está ${isOpen ? 'ABERTO AGORA' : 'FECHADO'} para pedidos!`, 'success');
      return true;
    } catch {
      // Optimistic local update
      this.tenantsService.tenants.update(cur =>
        cur.map(t => t.id === tenantId ? { ...t, isOpen } : t)
      );
      this.tenantsService.publicStorefronts.update(cur =>
        cur.map(t => t.id === tenantId ? { ...t, isOpen } : t)
      );
      const storeName = this.tenants().find(t => t.id === tenantId)?.name || 'Estabelecimento';
      this.notify(`${storeName} marcado como ${isOpen ? 'ABERTO AGORA' : 'FECHADO'}.`, 'info');
      return true;
    }
  }

  openRegionalMarketplace() {
    this.currentView.set('marketplace');
    this.activeTab.set('marketplace');
    this.router.navigate(['/home']);
  }

  async acceptDeliveryRoute(routeId: string, driverId: string) {
    await this.logisticsService.acceptDeliveryRoute(routeId, driverId);
  }

  async advanceWaypointStatus(routeId: string, waypointId: string, status: string) {
    await this.logisticsService.advanceWaypointStatus(routeId, waypointId, status);
  }

  sendWhatsAppMessage(phone: string, message: string, name?: string) {
    if (this.isSimulationMode()) {
      this.notify('Mensagem de demonstração não enviada.', 'info');
      return;
    }

    const text = name ? `Olá ${name}! ${message}` : message;
    const normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone) {
      this.notify('Não foi possível preparar o link: telefone inválido.', 'warning');
      return;
    }
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
    if (this.isBrowser && navigator.clipboard) {
      navigator.clipboard.writeText(whatsappUrl).catch(() => undefined);
    }
    this.notify(`Link de atendimento WhatsApp preparado para ${name || phone}.`, 'info');
  }

  async markArrivedAtStore(routeId: string) {
    await this.logisticsService.markArrivedAtStore(routeId);
  }

  async clockInDriver(driverId: string) {
    await this.logisticsService.clockInDriver(driverId);
  }

  async confirmPickup(routeId: string) {
    await this.logisticsService.confirmPickup(routeId);
  }

  async restartDevice(deviceId: string) {
    await this.hqService.restartDevice(deviceId);
    this.notify(
      this.isSimulationMode()
        ? 'Ação remota indisponível no modo de simulação.'
        : 'Solicitação registrada no inventário; nenhum dispositivo foi reiniciado.',
      'info'
    );
  }

  async lockDevice(deviceId: string) {
    await this.hqService.lockDevice(deviceId);
    this.notify(
      this.isSimulationMode()
        ? 'Status alterado apenas no inventário simulado.'
        : 'Status do inventário atualizado; o hardware não foi bloqueado.',
      'info'
    );
  }

  openStorefront(tenantId: string) {
    this.marketplaceService.openStorefront(tenantId);
  }

  async requestRealUserLocation(): Promise<boolean> {
    const success = await this.marketplaceService.requestRealUserLocation();
    if (success) {
      this.notify('Sinal GPS do navegador obtido com sucesso! Posição real sincronizada.', 'success');
    } else {
      this.notify(this.marketplaceService.geoErrorMessage() || 'Falha ao obter localização GPS real.', 'warning');
    }
    return success;
  }

  calculateDistanceToUser(lat?: number, lng?: number): number | null {
    return this.marketplaceService.calculateDistanceKm(lat, lng);
  }

  async runFullSystemAudit(): Promise<SystemAuditReport> {
    return this.runStructuralAuditOnBackend();
  }

  verifyFullSystemAudit(): void {
    this.systemAuditVerified.set(true);
  }
}
