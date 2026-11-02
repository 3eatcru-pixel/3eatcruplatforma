import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OrderTransaction, ExternalOrder } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SecurityService } from './security.service';
import { Unsubscribe } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly firebase = inject(FirebaseService);
  private readonly security = inject(SecurityService);

  readonly isSimulation = computed(() => this.security.isSimulated());

  readonly orders = signal<OrderTransaction[]>([]);
  readonly externalOrders = signal<ExternalOrder[]>([]);
  private ordersSubscription: Unsubscribe | null = null;
  private lastModeIsSimulation = this.security.isSimulated();
  private lastTenantId = this.security.currentSession()?.tenantId;
  private latestFetchId = 0;
  private latestExternalFetchId = 0;
  private modeGeneration = 0;

  readonly pendingOrdersCount = computed(
    () => this.orders().filter((o) => o.status === 'pending').length
  );
  readonly pendingKdsOrders = computed(
    () => this.orders().filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length
  );

  constructor() {
    effect(() => this.syncExecutionMode());
  }

  async fetchOrders(tenantId?: string, limit = 50): Promise<OrderTransaction[]> {
    const pageLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.floor(limit))) : 50;
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
      return this.orders()
        .filter((order) => !activeTenantId || order.tenantId === activeTenantId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, pageLimit);
    }
    
    const fetchId = ++this.latestFetchId;
    const params = new URLSearchParams({ limit: String(pageLimit) });
    if (tenantId) params.set('tenantId', tenantId);
    const url = `/api/orders?${params.toString()}`;
    const data = await firstValueFrom(this.http.get<OrderTransaction[]>(url));
    this.syncExecutionMode();
    if (fetchId !== this.latestFetchId || this.lastModeIsSimulation) return this.orders();
    this.orders.set(data);

    if (this.firebase.isBrowser && this.firebase.auth?.currentUser) {
      if (this.ordersSubscription) {
        this.ordersSubscription();
        this.ordersSubscription = null;
      }

      const uid = this.firebase.auth.currentUser.uid;
      const role = this.security.currentSession()?.role;
      const activeTenant = tenantId || this.security.currentSession()?.tenantId || '';

      if (
        activeTenant &&
        (role === 'tenant_owner' || role === 'operator' || role === 'waiter')
      ) {
        this.ordersSubscription = this.firebase.listenTenantOrders(
          activeTenant,
          uid,
          (updatedOrders) => {
            if (fetchId !== this.latestFetchId || this.isSimulation()) return;
            const sorted = [...updatedOrders].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            this.orders.set(sorted);
          }
        );
      } else if (role === 'consumer') {
        this.ordersSubscription = this.firebase.listenConsumerOrders(uid, (updatedOrders) => {
          if (fetchId !== this.latestFetchId || this.isSimulation()) return;
          const sorted = [...updatedOrders].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.orders.set(sorted);
        });
      }
    }

    return data;
  }

  async fetchExternalOrders(tenantId?: string, limit = 100): Promise<ExternalOrder[]> {
    this.syncExecutionMode();
    const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
    if (!activeTenantId) {
      this.externalOrders.set([]);
      return [];
    }
    const pageLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.floor(limit))) : 100;
    if (this.lastModeIsSimulation) {
      return this.externalOrders()
        .filter((order) => order.tenantId === activeTenantId)
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
        .slice(0, pageLimit);
    }

    const fetchId = ++this.latestExternalFetchId;
    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.get<ExternalOrder[]>(`/api/marketplace-delivery/orders?limit=${pageLimit}`));
    this.syncExecutionMode();
    if (fetchId !== this.latestExternalFetchId || generation !== this.modeGeneration || this.lastModeIsSimulation) {
      return this.externalOrders();
    }
    const scopedOrders = (data || []).filter((order) => order.tenantId === activeTenantId);
    this.externalOrders.set(scopedOrders);
    return scopedOrders;
  }

  async createOrder(order: Partial<OrderTransaction>): Promise<OrderTransaction> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const simOrder: OrderTransaction = {
        ...order,
        tenantId: this.security.currentSession()?.tenantId || order.tenantId,
        id: order.id || `sim-ord-${Date.now()}`,
        createdAt: new Date().toISOString(),
        mode: 'simulation',
        isSimulated: true
      } as OrderTransaction;
      this.orders.update(cur => [simOrder, ...cur]);
      return simOrder;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.post<OrderTransaction>('/api/orders', order));
    this.assertRealMode(generation);
    this.orders.update((cur) => {
      const exists = cur.some((o) => o.id === data.id);
      return exists ? cur.map((o) => (o.id === data.id ? data : o)) : [data, ...cur];
    });
    return data;
  }

  async updateStatus(
    orderId: string,
    status: OrderTransaction['status']
  ): Promise<OrderTransaction> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = this.security.currentSession()?.tenantId;
      let updated: OrderTransaction | null = null;
      this.orders.update(cur => cur.map(o => {
        if (o.id === orderId && (!activeTenantId || o.tenantId === activeTenantId)) {
          updated = { ...o, status, isSimulated: true, mode: 'simulation' };
          return updated;
        }
        return o;
      }));
      if (!updated) throw new Error('Simulated order not found');
      return updated;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.patch<OrderTransaction>(`/api/orders/${orderId}/status`, { status })
    );
    this.assertRealMode(generation);
    this.orders.update((cur) => cur.map((o) => (o.id === orderId ? data : o)));
    return data;
  }

  private syncExecutionMode() {
    const isSimulation = this.isSimulation();
    const tenantId = this.security.currentSession()?.tenantId;
    if (isSimulation === this.lastModeIsSimulation && tenantId === this.lastTenantId) return;

    this.lastModeIsSimulation = isSimulation;
    this.lastTenantId = tenantId;
    this.modeGeneration += 1;
    this.latestFetchId += 1;
    this.latestExternalFetchId += 1;
    if (this.ordersSubscription) {
      this.ordersSubscription();
      this.ordersSubscription = null;
    }
    this.orders.set([]);
    this.externalOrders.set([]);
  }

  private assertRealMode(generation: number) {
    this.syncExecutionMode();
    if (generation !== this.modeGeneration || this.lastModeIsSimulation) {
      throw new Error('Execution mode changed while saving order.');
    }
  }
}
