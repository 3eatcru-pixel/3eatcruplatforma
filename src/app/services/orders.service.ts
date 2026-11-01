import { Injectable, signal, computed, inject } from '@angular/core';
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

  readonly pendingOrdersCount = computed(
    () => this.orders().filter((o) => o.status === 'pending').length
  );
  readonly pendingKdsOrders = computed(
    () => this.orders().filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length
  );

  async fetchOrders(tenantId?: string): Promise<OrderTransaction[]> {
    if (this.isSimulation()) return this.orders();
    
    const url = tenantId ? `/api/orders?tenantId=${tenantId}` : '/api/orders';
    const data = await firstValueFrom(this.http.get<OrderTransaction[]>(url));
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
            const sorted = [...updatedOrders].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            this.orders.set(sorted);
          }
        );
      } else if (role === 'consumer') {
        this.ordersSubscription = this.firebase.listenConsumerOrders(uid, (updatedOrders) => {
          const sorted = [...updatedOrders].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.orders.set(sorted);
        });
      }
    }

    return data;
  }

  async createOrder(order: Partial<OrderTransaction>): Promise<OrderTransaction> {
    if (this.isSimulation()) {
      const simOrder: OrderTransaction = {
        ...order,
        id: order.id || `sim-ord-${Date.now()}`,
        createdAt: new Date().toISOString(),
        mode: 'simulation',
        isSimulated: true
      } as OrderTransaction;
      this.orders.update(cur => [simOrder, ...cur]);
      return simOrder;
    }

    const data = await firstValueFrom(this.http.post<OrderTransaction>('/api/orders', order));
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
    if (this.isSimulation()) {
      let updated: OrderTransaction | null = null;
      this.orders.update(cur => cur.map(o => {
        if (o.id === orderId) {
          updated = { ...o, status };
          return updated;
        }
        return o;
      }));
      if (!updated) throw new Error('Simulated order not found');
      return updated;
    }

    const data = await firstValueFrom(
      this.http.patch<OrderTransaction>(`/api/orders/${orderId}/status`, { status })
    );
    this.orders.update((cur) => cur.map((o) => (o.id === orderId ? data : o)));
    return data;
  }
}
