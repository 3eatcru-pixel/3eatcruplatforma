import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StoreDriver, DeliveryRoute } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SecurityService } from './security.service';
import { Unsubscribe } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class LogisticsService {
  private readonly http = inject(HttpClient);
  private readonly firebase = inject(FirebaseService);
  private readonly security = inject(SecurityService);

  readonly isSimulation = computed(() => this.security.isSimulated());

  readonly drivers = signal<StoreDriver[]>([]);
  readonly deliveryRoutes = signal<DeliveryRoute[]>([]);
  private routesSubscription: Unsubscribe | null = null;

  async fetchDrivers(): Promise<StoreDriver[]> {
    if (this.isSimulation()) return this.drivers();
    
    try {
      const data = await firstValueFrom(this.http.get<StoreDriver[]>('/api/logistics/drivers'));
      if (data) this.drivers.set(data);
      return data || [];
    } catch (err) {
      console.warn('LogisticsService.fetchDrivers deferred:', err);
      return [];
    }
  }

  async createDriver(driver: Partial<StoreDriver>): Promise<StoreDriver> {
    if (this.isSimulation()) {
      const simDriver: StoreDriver = {
        ...driver,
        id: driver.id || `sim-drv-${Date.now()}`,
        status: 'available',
        activeDeliveriesCount: 0,
        rating: 5.0,
        completedTodayCount: 0
      } as StoreDriver;
      this.drivers.update(cur => [...cur, simDriver]);
      return simDriver;
    }

    const data = await firstValueFrom(this.http.post<StoreDriver>('/api/logistics/drivers', driver));
    this.drivers.update((cur) => [...cur, data]);
    return data;
  }

  async updateDriver(id: string, updates: Partial<StoreDriver>): Promise<StoreDriver> {
    const data = await firstValueFrom(
      this.http.patch<StoreDriver>(`/api/logistics/drivers/${id}`, updates)
    );
    this.drivers.update((cur) => cur.map((d) => (d.id === id ? data : d)));
    return data;
  }

  async pingDriverGps(driverId: string, locationName: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/logistics/drivers/${driverId}/ping`, { locationName }));
  }

  async fetchDeliveryRoutes(tenantId?: string): Promise<DeliveryRoute[]> {
    const url = tenantId
      ? `/api/logistics/routes?tenantId=${tenantId}`
      : '/api/logistics/routes';
    const data = await firstValueFrom(this.http.get<DeliveryRoute[]>(url));
    this.deliveryRoutes.set(data);

    if (this.firebase.isBrowser && this.firebase.auth?.currentUser) {
      if (this.routesSubscription) {
        this.routesSubscription();
        this.routesSubscription = null;
      }

      const uid = this.firebase.auth.currentUser.uid;
      const role = this.security.currentSession()?.role;
      const activeTenant = tenantId || this.security.currentSession()?.tenantId;

      if (role === 'driver') {
        this.routesSubscription = this.firebase.listenDeliveryRoutes(
          { driverId: uid },
          (updatedRoutes) => this.deliveryRoutes.set(updatedRoutes)
        );
      } else if (
        activeTenant &&
        (role === 'tenant_owner' || role === 'operator')
      ) {
        this.routesSubscription = this.firebase.listenDeliveryRoutes(
          { tenantId: activeTenant, staffUid: uid },
          (updatedRoutes) => this.deliveryRoutes.set(updatedRoutes)
        );
      }
    }

    return data;
  }

  async acceptDeliveryRoute(routeId: string, driverId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`/api/logistics/routes/${routeId}/accept`, { driverId })
    );
  }

  async advanceWaypointStatus(routeId: string, waypointId: string, status: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`/api/logistics/routes/${routeId}/waypoints/${waypointId}/status`, {
        status
      })
    );
  }

  async confirmPickup(routeId: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/logistics/routes/${routeId}/pickup`, {}));
  }

  async markArrivedAtStore(routeId: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/logistics/routes/${routeId}/arrive`, {}));
  }

  async clockInDriver(driverId: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/logistics/drivers/${driverId}/clock-in`, {}));
  }
}
