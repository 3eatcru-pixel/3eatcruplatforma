import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from '../../../services/security.service';
import { DeliveryMarketplaceConnectionSummary } from '../types/delivery-marketplace-connection.model';

@Injectable({ providedIn: 'root' })
export class DeliveryMarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  private fetchGeneration = 0;

  readonly connections = signal<DeliveryMarketplaceConnectionSummary[]>([]);
  readonly activeConnectionsCount = computed(() => this.connections().filter((connection) => connection.status === 'active').length);

  clearConnections(): void {
    this.fetchGeneration++;
    this.connections.set([]);
  }

  async fetchConnections(): Promise<DeliveryMarketplaceConnectionSummary[]> {
    const generation = ++this.fetchGeneration;
    this.connections.set([]);
    if (this.security.isSimulated()) {
      this.connections.set([]);
      return [];
    }
    const connections = await firstValueFrom(
      this.http.get<DeliveryMarketplaceConnectionSummary[]>('/api/marketplace-delivery/connections')
    );
    if (generation !== this.fetchGeneration || this.security.isSimulated()) return this.connections();
    this.connections.set(connections || []);
    return connections || [];
  }
}
