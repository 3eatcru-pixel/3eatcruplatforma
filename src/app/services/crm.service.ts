import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConsumerAccount, CustomerProfile, MarketingCampaign } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CrmService {
  private readonly http = inject(HttpClient);
  
  readonly consumerAccounts = signal<ConsumerAccount[]>([]);
  readonly consumerAccountsStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly customers = signal<CustomerProfile[]>([]);
  readonly activeConsumer = signal<ConsumerAccount | null>(null);
  readonly marketingCampaigns = signal<MarketingCampaign[]>([]);

  async fetchConsumers(): Promise<ConsumerAccount[]> {
    this.consumerAccountsStatus.set('loading');
    try {
      const data = await firstValueFrom(this.http.get<ConsumerAccount[]>('/api/crm/consumers'));
      if (!Array.isArray(data)) throw new Error('Invalid consumer directory response.');
      this.consumerAccounts.set(data);
      this.consumerAccountsStatus.set('loaded');
      return data;
    } catch (err) {
      console.warn('CrmService.fetchConsumers deferred:', err);
      this.consumerAccounts.set([]);
      this.consumerAccountsStatus.set('error');
      return [];
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
    await firstValueFrom(this.http.post(`/api/crm/consumers/${consumerId}/loyalty`, { points }));
    this.consumerAccounts.update(cur => cur.map(c => {
      if (c.id === consumerId) {
        return { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + points };
      }
      return c;
    }));
  }

  async createMarketingCampaign(campaign: Partial<MarketingCampaign>): Promise<void> {
    const data = await firstValueFrom(this.http.post<MarketingCampaign>('/api/crm/marketing/campaigns', campaign));
    this.marketingCampaigns.update(cur => [data, ...cur]);
  }

  async dispatchCampaign(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/crm/marketing/campaigns/${id}/dispatch`, {}));
    this.marketingCampaigns.update(cur => cur.map(c => c.id === id ? { ...c, status: 'sent' } : c));
  }
}
