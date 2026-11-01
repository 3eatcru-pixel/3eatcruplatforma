import { Injectable, inject } from '@angular/core';
import { CompanyTenant, DeliveryRoute, DeliveryWaypoint, DriverRateConfig, StoreDriver, SystemExecutionMode } from '../../models/ecosystem.model';
import { MapToolsService } from '../../services/map-tools.service';

export interface RouteCalculationResult {
  totalDistanceKm: number;
  totalEarnings: number;
  estimatedDurationMinutes: number;
  waypoints: DeliveryWaypoint[];
}

@Injectable({
  providedIn: 'root'
})
export class LogisticsCoreEngine {
  private readonly mapTools = inject(MapToolsService);

  /**
   * Calculates delivery fee for a specific distance based on store rate config.
   * Rate formula: baseFee + extraKm * extraKmFee + extraStopBonus
   */
  calculateDeliveryFee(distanceKm: number, rateConfig?: DriverRateConfig): number {
    const config = rateConfig || { baseFee: 7.00, includedKm: 3.0, extraKmFee: 1.50, extraStopBonus: 3.00 };
    const extraKm = Math.max(0, distanceKm - config.includedKm);
    const fee = config.baseFee + (extraKm * config.extraKmFee);
    return Number(fee.toFixed(2));
  }

  /**
   * Builds an optimized delivery route given a list of stop waypoints and store location.
   */
  buildOptimizedRoute(
    tenant: CompanyTenant,
    waypointsInput: DeliveryWaypoint[],
    driver?: StoreDriver,
    mode: SystemExecutionMode = 'real'
  ): DeliveryRoute {
    let totalDistanceKm = 0;
    const storeCoord = { lat: tenant.lat || -23.5651, lng: tenant.lng || -46.6521 };
    let currentCoord = storeCoord;

    const orderedWaypoints: DeliveryWaypoint[] = waypointsInput.map((wp, idx) => {
      const destCoord = { lat: wp.lat || storeCoord.lat + 0.01, lng: wp.lng || storeCoord.lng + 0.01 };
      const dist = this.mapTools.calculateDistance(currentCoord, destCoord).km;
      totalDistanceKm += dist;
      currentCoord = destCoord;

      return {
        ...wp,
        sequenceNumber: idx + 1,
        distanceKm: Number(dist.toFixed(2)),
        etaMinutes: Math.ceil(dist * 4) + 10, // ~15km/h city traffic speed estimate
        status: mode === 'real' ? 'pending' : 'pending'
      };
    });

    const rateConfig = tenant.driverRateConfig;
    const baseFee = rateConfig?.baseFee || 7.00;
    const extraKmFee = rateConfig?.extraKmFee || 1.50;
    const includedKm = rateConfig?.includedKm || 3.0;
    const extraStopBonus = (orderedWaypoints.length - 1) * (rateConfig?.extraStopBonus || 3.00);

    const extraKm = Math.max(0, totalDistanceKm - includedKm);
    const totalEarnings = Number((baseFee + (extraKm * extraKmFee) + extraStopBonus).toFixed(2));
    const estimatedDuration = `${Math.ceil(totalDistanceKm * 4 + 12)} min`;

    return {
      id: `route-${mode}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      routeCode: `ROT-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tenant.id,
      driverId: driver?.id,
      driverName: driver?.name,
      date: new Date().toISOString().split('T')[0],
      timeWindow: 'Imediato',
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedDuration,
      totalEarnings,
      waypoints: orderedWaypoints,
      status: driver ? 'accepted' : 'available',
      totalDeliveredCount: 0
    };
  }
}
