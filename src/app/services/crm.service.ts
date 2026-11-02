import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConsumerAccount, ConsumerDirectoryEntry, ConsumerDirectoryPage, CustomerProfile, MarketingCampaign } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class CrmService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  private consumerDirectoryGeneration = 0;
  
  readonly consumerAccounts = signal<ConsumerAccount[]>([]);
  readonly consumerDirectory = signal<ConsumerDirectoryEntry[]>([]);
  readonly consumerDirectoryStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly consumerDirectoryNextPageToken = signal<string | null>(null);
  readonly consumerDirectoryLoadingMore = signal(false);
  readonly consumerDirectoryLoadMoreError = signal(false);
  readonly customers = signal<CustomerProfile[]>([]);
  readonly activeConsumer = signal<ConsumerAccount | null>(null);
  readonly marketingCampaigns = signal<MarketingCampaign[]>([]);

  resetConsumerDirectory() {
    this.consumerDirectoryGeneration += 1;
    this.consumerDirectory.set([]);
    this.consumerDirectoryStatus.set('idle');
    this.consumerDirectoryNextPageToken.set(null);
    this.consumerDirectoryLoadingMore.set(false);
    this.consumerDirectoryLoadMoreError.set(false);
  }

  async fetchConsumerDirectoryPage(pageToken?: string): Promise<ConsumerDirectoryPage | null> {
    const loadingMore = Boolean(pageToken);
    const generation = this.consumerDirectoryGeneration;
    const modeRevision = this.security.executionModeRevision();
    if (this.security.isSimulated()) return null;
    if (loadingMore) {
      if (this.consumerDirectoryLoadingMore() || pageToken !== this.consumerDirectoryNextPageToken()) return null;
      this.consumerDirectoryLoadingMore.set(true);
      this.consumerDirectoryLoadMoreError.set(false);
    } else {
      if (this.consumerDirectoryStatus() === 'loading' || this.consumerDirectoryLoadingMore()) return null;
      this.consumerDirectoryStatus.set('loading');
      this.consumerDirectoryNextPageToken.set(null);
      this.consumerDirectoryLoadMoreError.set(false);
    }

    try {
      const data = await firstValueFrom(this.http.get<ConsumerDirectoryPage>('/api/crm/consumers', {
        params: pageToken ? { pageToken } : {}
      }));
      if (generation !== this.consumerDirectoryGeneration || modeRevision !== this.security.executionModeRevision()) return null;
      if (!data || !Array.isArray(data.items) || !(data.nextPageToken === null || typeof data.nextPageToken === 'string')) {
        throw new Error('Invalid consumer directory response.');
      }
      this.consumerDirectory.update(current => {
        if (!loadingMore) return data.items;
        const byId = new Map(current.map(entry => [entry.id, entry]));
        data.items.forEach(entry => byId.set(entry.id, entry));
        return [...byId.values()];
      });
      this.consumerDirectoryNextPageToken.set(data.nextPageToken);
      this.consumerDirectoryStatus.set('loaded');
      return data;
    } catch (err) {
      if (generation !== this.consumerDirectoryGeneration || modeRevision !== this.security.executionModeRevision()) return null;
      console.warn('CrmService.fetchConsumerDirectoryPage deferred:', err);
      if (loadingMore) {
        this.consumerDirectoryLoadMoreError.set(true);
      } else {
        this.consumerDirectory.set([]);
        this.consumerDirectoryStatus.set('error');
      }
      return null;
    } finally {
      if (loadingMore && generation === this.consumerDirectoryGeneration && modeRevision === this.security.executionModeRevision()) {
        this.consumerDirectoryLoadingMore.set(false);
      }
    }
  }

  async registerConsumer(consumer: Partial<ConsumerAccount>): Promise<ConsumerAccount> {
    const data = await firstValueFrom(this.http.post<ConsumerAccount>('/api/crm/consumers', consumer));
    this.consumerAccounts.update(cur => [...cur, data]);
    this.activeConsumer.set(data);
    return data;
  }

  async createConsumer(consumer: Partial<ConsumerAccount>): Promise<ConsumerAccount> {
    const data = await firstValueFrom(this.http.post<ConsumerAccount>('/api/crm/consumers', consumer));
    this.consumerAccounts.update(cur => [...cur, data]);
    return data;
  }

  async updateConsumerProfile(id: string, updates: Partial<ConsumerAccount>): Promise<ConsumerAccount> {
    const data = await firstValueFrom(this.http.patch<ConsumerAccount>(`/api/crm/consumers/${id}`, updates));
    this.consumerAccounts.update(cur => cur.map(c => c.id === id ? data : c));
    if (this.activeConsumer()?.id === id) this.activeConsumer.set(data);
    return data;
  }

  loginConsumer(consumer: ConsumerAccount) {
    this.activeConsumer.set(consumer);
  }

  logoutConsumer() {
    this.activeConsumer.set(null);
  }

  async addLoyaltyPoints(consumerId: string, points: number): Promise<void> {
    await firstValueFrom(this.http.post('/api/crm/loyalty', { consumerId, points }));
    this.consumerAccounts.update(cur => cur.map(c => {
      if (c.id === consumerId) {
        return { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + points };
      }
      return c;
    }));
  }

  async createMarketingCampaign(campaign: Partial<MarketingCampaign>): Promise<void> {
    const data = await firstValueFrom(this.http.post<MarketingCampaign>('/api/crm/campaigns', campaign));
    this.marketingCampaigns.update(cur => [data, ...cur]);
  }

  async dispatchCampaign(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/crm/campaigns/${id}/dispatch`, {}));
    this.marketingCampaigns.update(cur => cur.map(c => c.id === id ? { ...c, status: 'sent' } : c));
  }
}
