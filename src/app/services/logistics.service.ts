import { Injectable, inject, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DeliveryCompensationBreakdown, DeliveryRoute, DeliveryWaypoint, StoreDriver } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SecurityService } from './security.service';
import { LogisticsSimulationService } from './logistics-simulation.service';
import { Unsubscribe } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private readonly http = inject(HttpClient);
  private readonly firebase = inject(FirebaseService);
  private readonly security = inject(SecurityService);
  private readonly simulation = inject(LogisticsSimulationService);

  readonly isSimulation = computed(() => this.security.isSimulated());
  readonly drivers = this.simulation.drivers;
  readonly deliveryRoutes = this.simulation.deliveryRoutes;
  private routesSubscription: Unsubscribe | null = null;
  private lastModeIsSimulation = this.security.isSimulated();
  private lastTenantId = this.security.currentSession()?.tenantId;
  private lastModeRevision = this.security.executionModeRevision();
  private latestDriversFetchId = 0;
  private latestRoutesFetchId = 0;
  private modeGeneration = 0;

  constructor() {
    effect(() => this.syncExecutionMode());
    if (this.lastModeIsSimulation) {
      this.simulation.seedForTenant(this.lastTenantId);
    }
  }

  async fetchDrivers(): Promise<StoreDriver[]> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      this.simulation.seedForTenant(this.lastTenantId);
      return this.simulation.fetchDrivers();
    }

    const fetchId = ++this.latestDriversFetchId;
    try {
      const data = await firstValueFrom(this.http.get<StoreDriver[]>('/api/logistics/drivers'));
      this.syncExecutionMode();
      if (fetchId !== this.latestDriversFetchId || this.lastModeIsSimulation) return this.drivers();
      this.drivers.set(data || []);
      return data || [];
    } catch (err) {
      console.warn('LogisticsService.fetchDrivers deferred:', err);
      return [];
    }
  }

  async createDriver(driver: Partial<StoreDriver>): Promise<StoreDriver> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) return this.simulation.createDriver(driver);

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.post<StoreDriver>('/api/logistics/drivers', driver));
    this.assertRealMode(generation);
    this.upsertDriver(data);
    return data;
  }

  async updateDriver(id: string, updates: Partial<StoreDriver>): Promise<StoreDriver> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) return this.simulation.updateDriver(id, updates);

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.patch<StoreDriver>('/api/logistics/drivers/' + id, updates)
    );
    this.assertRealMode(generation);
    this.upsertDriver(data);
    return data;
  }

  async linkDriverAccount(driverId: string, email: string): Promise<void> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      throw new Error('Vínculo de conta não está disponível na simulação.');
    }
    const generation = this.modeGeneration;
    await firstValueFrom(this.http.post('/api/auth/assign-role', {
      targetEmail: email.trim().toLowerCase(),
      role: 'driver',
      driverId
    }));
    this.assertRealMode(generation);
  }

  async pingDriverGps(driverId: string, location: {
    sharing: boolean;
    routeId?: string;
    lat?: number;
    lng?: number;
    accuracyMeters?: number;
  }): Promise<void> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) return;

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<Partial<StoreDriver> & { id: string }>(
        '/api/logistics/drivers/' + driverId + '/ping',
        location
      )
    );
    this.assertRealMode(generation);
    this.drivers.update((drivers) => drivers.map((driver) => driver.id === driverId
      ? {
          ...driver,
          ...data,
          ...(location.sharing ? {} : {
            lat: undefined,
            lng: undefined,
            gpsAccuracyMeters: undefined,
            lastGpsPing: undefined,
            gpsRouteId: undefined,
            currentLocationName: undefined
          })
        }
      : driver
    ));
  }

  async fetchDeliveryRoutes(tenantId?: string): Promise<DeliveryRoute[]> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      this.simulation.seedForTenant(this.lastTenantId);
      return this.simulation.fetchRoutes(tenantId);
    }

    const fetchId = ++this.latestRoutesFetchId;
    const url = tenantId
      ? '/api/logistics/routes?tenantId=' + encodeURIComponent(tenantId)
      : '/api/logistics/routes';
    const data = await firstValueFrom(this.http.get<DeliveryRoute[]>(url));
    this.syncExecutionMode();
    if (fetchId !== this.latestRoutesFetchId || this.lastModeIsSimulation) return this.deliveryRoutes();

    this.deliveryRoutes.set(Array.isArray(data) ? data : []);
    if (this.firebase.isBrowser && this.firebase.auth?.currentUser) {
      if (this.routesSubscription) {
        this.routesSubscription();
        this.routesSubscription = null;
      }

      const uid = this.firebase.auth.currentUser.uid;
      const role = this.security.currentSession()?.role;
      const activeTenant = tenantId || this.security.currentSession()?.tenantId;
      const applyRealtimeRoutes = (updatedRoutes: DeliveryRoute[]) => {
        if (fetchId === this.latestRoutesFetchId && !this.isSimulation()) {
          this.deliveryRoutes.set(updatedRoutes);
        }
      };

      if (role === 'driver') {
        this.routesSubscription = this.firebase.listenDeliveryRoutes(
          { driverId: uid },
          applyRealtimeRoutes
        );
      } else if (activeTenant && (role === 'tenant_owner' || role === 'operator')) {
        this.routesSubscription = this.firebase.listenDeliveryRoutes(
          { tenantId: activeTenant, staffUid: uid },
          applyRealtimeRoutes
        );
      }
    }

    return this.deliveryRoutes();
  }

  async createDeliveryRoute(
    waypoints: DeliveryWaypoint[],
    storeDriverCompensation = 0,
    compensationBreakdown?: DeliveryCompensationBreakdown
  ): Promise<DeliveryRoute> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      return this.simulation.createRoute(waypoints, storeDriverCompensation, compensationBreakdown);
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.post<DeliveryRoute>('/api/logistics/routes', {
      waypoints,
      storeDriverCompensation,
      ...(compensationBreakdown || {})
    }));
    this.assertRealMode(generation);
    this.replaceRoute(data);
    return data;
  }

  async acceptDeliveryRoute(routeId: string, driverId: string): Promise<void> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      this.simulation.acceptRoute(routeId, driverId);
      return;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<DeliveryRoute>('/api/logistics/routes/' + routeId + '/accept', { driverId })
    );
    this.assertRealMode(generation);
    this.replaceRoute(data);
  }

  async advanceWaypointStatus(routeId: string, waypointId: string, status: string): Promise<void> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      this.simulation.advanceWaypoint(routeId, waypointId, status);
      return;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<DeliveryRoute>(
        '/api/logistics/routes/' + routeId + '/waypoints/' + waypointId + '/status',
        { status }
      )
    );
    this.assertRealMode(generation);
    this.replaceRoute(data);
  }

  async confirmPickup(routeId: string): Promise<void> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      this.simulation.confirmPickup(routeId);
      return;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<DeliveryRoute>('/api/logistics/routes/' + routeId + '/pickup', {})
    );
    this.assertRealMode(generation);
    this.replaceRoute(data);
  }

  async markArrivedAtStore(routeId: string): Promise<void> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      this.simulation.markArrivedAtStore(routeId);
      return;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<DeliveryRoute>('/api/logistics/routes/' + routeId + '/arrive', {})
    );
    this.assertRealMode(generation);
    this.replaceRoute(data);
  }

  async clockInDriver(driverId: string): Promise<void> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      this.simulation.clockIn(driverId);
      return;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<StoreDriver>('/api/logistics/drivers/' + driverId + '/clock-in', {})
    );
    this.assertRealMode(generation);
    this.upsertDriver(data);
  }

  private syncExecutionMode() {
    const isSimulation = this.isSimulation();
    const tenantId = this.security.currentSession()?.tenantId;
    const modeRevision = this.security.executionModeRevision();
    if (isSimulation === this.lastModeIsSimulation && tenantId === this.lastTenantId && modeRevision === this.lastModeRevision) return;

    this.lastModeIsSimulation = isSimulation;
    this.lastTenantId = tenantId;
    this.lastModeRevision = modeRevision;
    this.modeGeneration += 1;
    this.latestDriversFetchId += 1;
    this.latestRoutesFetchId += 1;
    if (this.routesSubscription) {
      this.routesSubscription();
      this.routesSubscription = null;
    }
    this.simulation.reset();
    if (isSimulation) this.simulation.seedForTenant(tenantId);
  }

  private assertRealMode(generation: number) {
    this.syncExecutionMode();
    if (generation !== this.modeGeneration || this.lastModeIsSimulation) {
      throw new Error('Execution mode changed while saving logistics data.');
    }
  }

  private replaceRoute(route: DeliveryRoute) {
    this.deliveryRoutes.update((routes) => {
      const exists = routes.some((item) => item.id === route.id);
      return exists
        ? routes.map((item) => item.id === route.id ? route : item)
        : [route, ...routes];
    });
  }

  private upsertDriver(driver: StoreDriver) {
    this.drivers.update((drivers) => {
      const exists = drivers.some((item) => item.id === driver.id);
      return exists
        ? drivers.map((item) => item.id === driver.id ? driver : item)
        : [driver, ...drivers];
    });
  }
}
