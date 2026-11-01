import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RegionalMarketplaceConfig } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

export type GeolocationStatus = 'idle' | 'locating' | 'success' | 'denied' | 'error';

@Injectable({
  providedIn: 'root'
})
export class MarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  readonly regionalConfig = signal<RegionalMarketplaceConfig>({
    heroTitle: 'Ecossistema 3eatcru',
    heroSubtitle: 'Explore lojistas locais',
    heroTag: 'DIRETÓRIO REGIONAL',
    heroBannerImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
    heroCtaText: 'Explorar',
    heroAnnouncement: 'Boas-vindas!',
    showHeroAnnouncement: true,
    featuredTenantIds: [],
    defaultSearchRadiusKm: 15,
    activeRegionName: 'São Paulo'
  });

  readonly maxDiscoveryRadiusKm = signal<number>(30);
  readonly userReferenceAddress = signal<string>('Avenida Paulista, 1000, São Paulo');
  readonly userReferenceCoords = signal<{ lat: number; lng: number }>({ lat: -23.5651, lng: -46.6521 });
  
  readonly geoStatus = signal<GeolocationStatus>('idle');
  readonly geoErrorMessage = signal<string | null>(null);
  readonly isRealLocationActive = signal<boolean>(false);

  requestRealUserLocation(): Promise<boolean> {
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
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.userReferenceCoords.set({ lat, lng });
          this.userReferenceAddress.set(`Minha Localização GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          this.isRealLocationActive.set(true);
          this.geoStatus.set('success');
          resolve(true);
        },
        (error) => {
          this.geoStatus.set(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
          this.isRealLocationActive.set(false);
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

  calculateDistanceKm(storeLat?: number, storeLng?: number): number {
    if (storeLat === undefined || storeLng === undefined) return 2.5;
    const user = this.userReferenceCoords();
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
    try {
      const data = await firstValueFrom(this.http.get<RegionalMarketplaceConfig>('/api/hq/regional'));
      this.regionalConfig.set(data);
      return data;
    } catch {
      return this.regionalConfig();
    }
  }

  async updateRegionalConfig(config: Partial<RegionalMarketplaceConfig>): Promise<void> {
    const merged = { ...this.regionalConfig(), ...config };
    try {
      await firstValueFrom(this.http.post('/api/hq/regional', merged));
    } catch {
      // Degrade gracefully
    }
    this.regionalConfig.set(merged);
  }

  openStorefront(tenantId: string) {
    this.router.navigate(['/storefront', tenantId]);
  }
}
