import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RegionalMarketplaceConfig } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { DEFAULT_REGIONAL_MARKETPLACE_CONFIG, normalizeRegionalMarketplaceConfig } from '../../shared/constants/regional-marketplace';
import { SecurityService } from './security.service';

export type GeolocationStatus = 'idle' | 'locating' | 'success' | 'denied' | 'error';

@Injectable({
  providedIn: 'root'
})
export class MarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly security = inject(SecurityService);
  
  readonly regionalConfig = signal<RegionalMarketplaceConfig>({ ...DEFAULT_REGIONAL_MARKETPLACE_CONFIG });
  readonly regionalConfigStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly regionalConfigError = signal<string | null>(null);

  readonly maxDiscoveryRadiusKm = signal<number>(DEFAULT_REGIONAL_MARKETPLACE_CONFIG.defaultSearchRadiusKm);
  readonly userReferenceAddress = signal<string>('Localização não informada');
  readonly userReferenceCoords = signal<{ lat: number; lng: number } | null>(null);
  
  readonly geoStatus = signal<GeolocationStatus>('idle');
  readonly geoErrorMessage = signal<string | null>(null);
  readonly isRealLocationActive = signal<boolean>(false);

  resetForExecutionMode(simulation: boolean) {
    const config = { ...DEFAULT_REGIONAL_MARKETPLACE_CONFIG, featuredTenantIds: [] };
    this.regionalConfig.set(config);
    this.maxDiscoveryRadiusKm.set(config.defaultSearchRadiusKm);
    this.regionalConfigError.set(null);
    this.regionalConfigStatus.set(simulation ? 'loaded' : 'idle');
    this.clearUserLocation();
  }

  requestRealUserLocation(): Promise<boolean> {
    if (this.security.isSimulated()) {
      this.clearUserLocation();
      this.geoErrorMessage.set('O GPS do dispositivo não é solicitado durante a simulação.');
      return Promise.resolve(false);
    }
    const modeRevision = this.security.executionModeRevision();
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        this.geoStatus.set('error');
        this.geoErrorMessage.set('Geolocalização não é suportada por este navegador.');
        this.isRealLocationActive.set(false);
        resolve(false);
        return;
      }

      this.geoStatus.set('locating');
      this.geoErrorMessage.set(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!this.isCurrentLocationContext(modeRevision)) {
            this.clearUserLocation();
            resolve(false);
            return;
          }
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.userReferenceCoords.set({ lat, lng });
          this.userReferenceAddress.set(`Minha Localização GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          this.isRealLocationActive.set(true);
          this.geoStatus.set('success');
          resolve(true);
        },
        (error) => {
          if (!this.isCurrentLocationContext(modeRevision)) {
            this.clearUserLocation();
            resolve(false);
            return;
          }
          this.geoStatus.set(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
          this.isRealLocationActive.set(false);
          this.userReferenceCoords.set(null);
          this.userReferenceAddress.set('Localização não informada');
          const msg = error.code === error.PERMISSION_DENIED
            ? 'Permissão de localização recusada pelo navegador.'
            : 'Não foi possível obter sua posição GPS real.';
          this.geoErrorMessage.set(msg);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  calculateDistanceKm(storeLat?: number, storeLng?: number): number | null {
    const user = this.userReferenceCoords();
    if (storeLat === undefined || storeLng === undefined || !user) return null;
    const R = 6371; // Earth radius in kilometers
    const dLat = (storeLat - user.lat) * (Math.PI / 180);
    const dLng = (storeLng - user.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(user.lat * (Math.PI / 180)) * Math.cos(storeLat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return parseFloat(dist.toFixed(1));
  }

  async fetchRegionalConfig(): Promise<RegionalMarketplaceConfig> {
    if (this.security.isSimulated()) {
      this.regionalConfigStatus.set('loaded');
      this.regionalConfigError.set(null);
      return this.regionalConfig();
    }
    const modeRevision = this.security.executionModeRevision();
    this.regionalConfigStatus.set('loading');
    this.regionalConfigError.set(null);
    try {
      const data = await firstValueFrom(this.http.get<Partial<RegionalMarketplaceConfig>>('/api/hq/regional'));
      if (modeRevision !== this.security.executionModeRevision()) return this.regionalConfig();
      const config = normalizeRegionalMarketplaceConfig(data);
      this.regionalConfig.set(config);
      this.maxDiscoveryRadiusKm.set(config.defaultSearchRadiusKm);
      this.regionalConfigStatus.set('loaded');
      return config;
    } catch (error) {
      if (modeRevision !== this.security.executionModeRevision()) return this.regionalConfig();
      this.regionalConfigStatus.set('error');
      this.regionalConfigError.set('Não foi possível carregar as configurações salvas do marketplace.');
      throw error;
    }
  }

  async updateRegionalConfig(config: Partial<RegionalMarketplaceConfig>, persist = true): Promise<boolean> {
    const modeRevision = this.security.executionModeRevision();
    const merged = normalizeRegionalMarketplaceConfig({ ...this.regionalConfig(), ...config });
    const shouldPersist = persist && !this.security.isSimulated();
    if (shouldPersist) {
      this.regionalConfigError.set(null);
      try {
        await firstValueFrom(this.http.post('/api/hq/regional', merged));
      } catch {
        if (modeRevision !== this.security.executionModeRevision()) return false;
        this.regionalConfigError.set('Não foi possível publicar as configurações. Revise a conexão e tente novamente.');
        return false;
      }
      if (modeRevision !== this.security.executionModeRevision() || this.security.isSimulated()) return false;
    }
    this.regionalConfig.set(merged);
    this.maxDiscoveryRadiusKm.set(merged.defaultSearchRadiusKm);
    this.regionalConfigStatus.set('loaded');
    return true;
  }

  openStorefront(tenantId: string) {
    this.router.navigate(['/p', tenantId]);
  }

  private clearUserLocation() {
    this.userReferenceCoords.set(null);
    this.userReferenceAddress.set('Localização não informada');
    this.isRealLocationActive.set(false);
    this.geoStatus.set('idle');
    this.geoErrorMessage.set(null);
  }

  private isCurrentLocationContext(modeRevision: number): boolean {
    return !this.security.isSimulated() && modeRevision === this.security.executionModeRevision();
  }
}
