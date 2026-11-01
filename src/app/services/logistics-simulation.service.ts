import { Injectable, inject, signal } from '@angular/core';
import { DeliveryRoute, DeliveryWaypoint, StoreDriver } from '../models/ecosystem.model';
import { SecurityService } from './security.service';

@Injectable({ providedIn: 'root' })
export class LogisticsSimulationService {
  private readonly security = inject(SecurityService);

  readonly drivers = signal<StoreDriver[]>([]);
  readonly deliveryRoutes = signal<DeliveryRoute[]>([]);

  reset() {
    this.drivers.set([]);
    this.deliveryRoutes.set([]);
  }

  seedForTenant(tenantId = this.security.currentSession()?.tenantId || 'tenant-sp-001') {
    if (!this.drivers().some((driver) => driver.id === 'drv-3')) {
      this.drivers.update((drivers) => [...drivers, {
        id: 'drv-3',
        tenantId,
        name: 'Entregador Simulado',
        phone: '(11) 99999-0003',
        vehicleType: 'moto',
        status: 'delivering',
        activeDeliveriesCount: 1,
        rating: 5,
        completedTodayCount: 3,
        driverType: 'private',
        isSimulated: true,
        mode: 'simulation'
      }]);
    }

    if (!this.deliveryRoutes().some((route) => route.tenantId === tenantId)) {
      const waypoint = {
        id: `sim-waypoint-${tenantId}-01`,
        customerName: 'Ana Cliente',
        customerPhone: '(11) 98888-0001',
        address: 'Rua das Palmeiras, 120',
        cityState: 'São Paulo, SP',
        distanceKm: 2.4,
        etaMinutes: 18,
        productSummary: 'Pedido de demonstração',
        status: 'pending' as const,
        sequenceNumber: 1,
        lat: -23.56,
        lng: -46.65
      };
      const now = new Date().toISOString();
      this.deliveryRoutes.update((routes) => [...routes,
        {
          id: `sim-route-active-${tenantId}`,
          routeCode: 'ROT-SIM-001',
          driverId: 'drv-3',
          driverName: 'Entregador Simulado',
          tenantId,
          date: now,
          timeWindow: 'Imediato',
          totalDistanceKm: 2.4,
          estimatedDuration: '18 min',
          totalEarnings: 0,
          waypoints: [waypoint],
          status: 'accepted',
          totalDeliveredCount: 0,
          isSimulated: true,
          mode: 'simulation'
        },
        {
          id: `sim-route-available-${tenantId}`,
          routeCode: 'ROT-SIM-002',
          tenantId,
          date: now,
          timeWindow: 'Imediato',
          totalDistanceKm: 4.1,
          estimatedDuration: '25 min',
          totalEarnings: 0,
          waypoints: [{ ...waypoint, id: `sim-waypoint-${tenantId}-02`, customerName: 'Bruno Cliente' }],
          status: 'available',
          totalDeliveredCount: 0,
          isSimulated: true,
          mode: 'simulation'
        }
      ]);
    }
  }

  fetchDrivers(tenantId?: string): StoreDriver[] {
    const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
    return this.drivers().filter((driver) =>
      !activeTenantId || !driver.tenantId || driver.tenantId === activeTenantId
    );
  }

  fetchRoutes(tenantId?: string): DeliveryRoute[] {
    const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
    return this.deliveryRoutes().filter((route) =>
      !activeTenantId || route.tenantId === activeTenantId
    );
  }

  createDriver(driver: Partial<StoreDriver>): StoreDriver {
    const tenantId = this.security.currentSession()?.tenantId || driver.tenantId;
    const simulated: StoreDriver = {
      ...driver,
      tenantId,
      id: driver.id || `sim-drv-${Date.now()}`,
      status: 'available',
      activeDeliveriesCount: 0,
      rating: 5,
      completedTodayCount: 0,
      isSimulated: true,
      mode: 'simulation'
    } as StoreDriver;
    this.drivers.update((drivers) => [
      ...drivers.filter((item) => item.id !== simulated.id),
      simulated
    ]);
    return simulated;
  }

  createRoute(waypoints: DeliveryWaypoint[], storeDriverCompensation = 0): DeliveryRoute {
    const tenantId = this.security.currentSession()?.tenantId;
    if (!tenantId) throw new Error('Selecione uma unidade para criar uma rota.');
    const now = new Date().toISOString();
    const route: DeliveryRoute = {
      id: `sim-route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      routeCode: `SIM-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId,
      date: now,
      timeWindow: 'Imediato',
      totalDistanceKm: waypoints.reduce((sum, waypoint) => sum + (waypoint.distanceKm || 0), 0),
      estimatedDuration: `${waypoints.reduce((sum, waypoint) => sum + (waypoint.etaMinutes || 0), 0)} min`,
      totalEarnings: storeDriverCompensation,
      waypoints: waypoints.map((waypoint, index) => ({
        ...waypoint,
        sequenceNumber: index + 1,
        status: 'pending'
      })),
      status: 'available',
      totalDeliveredCount: 0,
      isSimulated: true,
      mode: 'simulation'
    };
    this.deliveryRoutes.update((routes) => [route, ...routes]);
    return route;
  }

  updateDriver(id: string, updates: Partial<StoreDriver>): StoreDriver {
    const activeTenantId = this.security.currentSession()?.tenantId;
    let updated: StoreDriver | null = null;
    this.drivers.update((drivers) => drivers.map((driver) => {
      if (
        driver.id !== id ||
        (activeTenantId && driver.tenantId && driver.tenantId !== activeTenantId)
      ) return driver;
      updated = {
        ...driver,
        ...updates,
        id: driver.id,
        tenantId: driver.tenantId,
        isSimulated: true,
        mode: 'simulation'
      };
      return updated;
    }));
    if (!updated) throw new Error('Simulated driver not found');
    return updated;
  }

  pingDriver(driverId: string, locationName: string) {
    this.ensureDriver(driverId);
    this.drivers.update((drivers) => drivers.map((driver) => driver.id === driverId
      ? {
          ...driver,
          currentLocationName: locationName,
          lastGpsPing: new Date().toISOString(),
          isSimulated: true,
          mode: 'simulation'
        }
      : driver
    ));
  }

  acceptRoute(routeId: string, driverId: string) {
    const route = this.findRoute(routeId);
    if (route.status !== 'available') throw new Error('Simulated route is not available');
    const driver = this.ensureDriver(driverId);
    if (driver.driverType === 'private' && driver.tenantId && driver.tenantId !== route.tenantId) {
      throw new Error('Simulated driver belongs to another tenant');
    }

    this.deliveryRoutes.update((routes) => routes.map((item) => item.id === routeId
      ? {
          ...item,
          status: 'accepted',
          driverId,
          driverName: driver.name,
          isSimulated: true,
          mode: 'simulation'
        }
      : item
    ));
    this.drivers.update((drivers) => drivers.map((item) => item.id === driverId
      ? {
          ...item,
          status: 'delivering',
          activeDeliveriesCount: item.activeDeliveriesCount + 1,
          isSimulated: true,
          mode: 'simulation'
        }
      : item
    ));
  }

  advanceWaypoint(routeId: string, waypointId: string, status: string) {
    const route = this.findRoute(routeId);
    const validStatuses = ['pending', 'in_transit', 'arrived', 'completed', 'failed'];
    if (!validStatuses.includes(status)) throw new Error('Invalid simulated waypoint status');
    if (!route.waypoints.some((waypoint) => waypoint.id === waypointId)) {
      throw new Error('Simulated waypoint not found');
    }

    const waypoints = route.waypoints.map((waypoint) => waypoint.id === waypointId
      ? { ...waypoint, status: status as DeliveryRoute['waypoints'][number]['status'] }
      : waypoint
    );
    const allDone = waypoints.every((waypoint) =>
      waypoint.status === 'completed' || waypoint.status === 'failed'
    );
    const completedCount = waypoints.filter((waypoint) => waypoint.status === 'completed').length;
    this.deliveryRoutes.update((routes) => routes.map((item) => item.id === routeId
      ? {
          ...item,
          waypoints,
          status: allDone ? 'completed' : item.status,
          totalDeliveredCount: completedCount,
          ...(allDone ? { completedAt: new Date().toISOString() } : {}),
          isSimulated: true,
          mode: 'simulation'
        }
      : item
    ));

    if (allDone && route.driverId && route.status !== 'completed') {
      this.drivers.update((drivers) => drivers.map((driver) => driver.id === route.driverId
        ? {
            ...driver,
            status: 'available',
            activeDeliveriesCount: Math.max(0, driver.activeDeliveriesCount - 1),
            completedTodayCount: driver.completedTodayCount + completedCount,
            isSimulated: true,
            mode: 'simulation'
          }
        : driver
      ));
    }
  }

  confirmPickup(routeId: string) {
    this.setRouteStatus(routeId, 'at_store', 'in_progress');
  }

  markArrivedAtStore(routeId: string) {
    this.setRouteStatus(routeId, 'accepted', 'at_store');
  }

  clockIn(driverId: string) {
    this.ensureDriver(driverId);
    this.drivers.update((drivers) => drivers.map((driver) => driver.id === driverId
      ? {
          ...driver,
          status: 'available',
          lastGpsPing: new Date().toISOString(),
          isSimulated: true,
          mode: 'simulation'
        }
      : driver
    ));
  }

  private ensureDriver(driverId: string): StoreDriver {
    const existing = this.drivers().find((driver) => driver.id === driverId);
    const activeTenantId = this.security.currentSession()?.tenantId;
    if (existing) {
      if (activeTenantId && existing.tenantId && existing.tenantId !== activeTenantId) {
        throw new Error('Simulated driver belongs to another tenant');
      }
      return existing;
    }

    const session = this.security.currentSession();
    if (!session?.tenantId) {
      throw new Error('O entregador precisa estar vinculado a uma loja para usar as rotas nesta versão.');
    }
    const driver: StoreDriver = {
      id: driverId,
      tenantId: session?.tenantId,
      name: session?.name || 'Entregador simulado',
      phone: '',
      vehicleType: 'moto',
      status: 'available',
      activeDeliveriesCount: 0,
      rating: 5,
      completedTodayCount: 0,
      driverType: 'private',
      isSimulated: true,
      mode: 'simulation'
    };
    this.drivers.update((drivers) => [...drivers, driver]);
    return driver;
  }

  private findRoute(routeId: string): DeliveryRoute {
    const route = this.deliveryRoutes().find((item) => item.id === routeId);
    const tenantId = this.security.currentSession()?.tenantId;
    if (!route || (tenantId && route.tenantId !== tenantId)) {
      throw new Error('Simulated delivery route not found');
    }
    return route;
  }

  private setRouteStatus(
    routeId: string,
    current: DeliveryRoute['status'],
    next: DeliveryRoute['status']
  ) {
    const route = this.findRoute(routeId);
    if (route.status !== current) {
      throw new Error('Invalid simulated route transition: ' + route.status + ' -> ' + next);
    }
    this.deliveryRoutes.update((routes) => routes.map((item) => item.id === routeId
      ? { ...item, status: next, isSimulated: true, mode: 'simulation' }
      : item
    ));
  }
}
