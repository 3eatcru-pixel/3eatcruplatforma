import { Injectable, signal, inject, effect } from '@angular/core';
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
  private lastModeRevision = this.security.executionModeRevision();
  private lastIsSimulation = this.security.isSimulated();
  
  readonly consumerAccounts = signal<ConsumerAccount[]>([]);
  readonly consumerDirectory = signal<ConsumerDirectoryEntry[]>([]);
  readonly consumerDirectoryStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly consumerDirectoryNextPageToken = signal<string | null>(null);
  readonly consumerDirectoryLoadingMore = signal(false);
  readonly consumerDirectoryLoadMoreError = signal(false);
  readonly customers = signal<CustomerProfile[]>([]);
  readonly activeConsumer = signal<ConsumerAccount | null>(null);
  readonly marketingCampaigns = signal<MarketingCampaign[]>([]);

  constructor() {
    effect(() => {
      const isSimulation = this.security.isSimulated();
      const modeRevision = this.security.executionModeRevision();
      if (isSimulation === this.lastIsSimulation && modeRevision === this.lastModeRevision) return;
      this.lastIsSimulation = isSimulation;
      this.lastModeRevision = modeRevision;
      this.resetConsumerDirectory();
      this.consumerAccounts.set([]);
      this.activeConsumer.set(null);
      this.customers.set([]);
      this.marketingCampaigns.set([]);
    });
  }

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
    if (this.security.isSimulated()) {
      const data = this.createSimulatedConsumer(consumer);
      this.consumerAccounts.update((cur) => [...cur, data]);
      this.activeConsumer.set(data);
      return data;
    }
    const modeRevision = this.security.executionModeRevision();
    const response = await firstValueFrom(this.http.post<Partial<ConsumerAccount> & { address?: string }>(
      '/api/crm/consumers',
      this.toConsumerProfilePayload(consumer)
    ));
    this.assertRealContext(modeRevision);
    const data = this.toConsumerAccount(response);
    this.consumerAccounts.update(cur => [...cur, data]);
    this.activeConsumer.set(data);
    return data;
  }

  async fetchOwnConsumerProfile(): Promise<ConsumerAccount | null> {
    if (this.security.isSimulated()) return this.activeConsumer();
    const session = this.security.currentSession();
    if (session?.role !== 'consumer' || !session.id) return null;
    const modeRevision = this.security.executionModeRevision();
    try {
      const response = await firstValueFrom(
        this.http.get<Partial<ConsumerAccount> & { address?: string }>('/api/crm/consumers/me')
      );
      this.assertRealContext(modeRevision);
      const data = this.toConsumerAccount(response);
      this.consumerAccounts.set([data]);
      this.activeConsumer.set(data);
      return data;
    } catch (error: unknown) {
      this.assertRealContext(modeRevision);
      if ((error as { status?: number })?.status === 404) {
        this.consumerAccounts.set([]);
        this.activeConsumer.set(null);
        return null;
      }
      throw error;
    }
  }

  async createConsumer(consumer: Partial<ConsumerAccount>): Promise<ConsumerAccount> {
    if (this.security.isSimulated()) {
      const data = this.createSimulatedConsumer(consumer);
      this.consumerAccounts.update((cur) => [...cur, data]);
      return data;
    }
    const modeRevision = this.security.executionModeRevision();
    const response = await firstValueFrom(this.http.post<Partial<ConsumerAccount> & { address?: string }>(
      '/api/crm/consumers',
      this.toConsumerProfilePayload(consumer)
    ));
    this.assertRealContext(modeRevision);
    const data = this.toConsumerAccount(response);
    this.consumerAccounts.update(cur => [...cur, data]);
    return data;
  }

  async updateConsumerProfile(id: string, updates: Partial<ConsumerAccount>): Promise<ConsumerAccount> {
    if (this.security.isSimulated()) {
      const existing = this.consumerAccounts().find((consumer) => consumer.id === id) ||
        (this.activeConsumer()?.id === id ? this.activeConsumer() : null);
      if (!existing) throw new Error('Consumidor demonstrativo não encontrado nesta sessão.');
      const data = { ...existing, ...updates, id };
      this.consumerAccounts.update((cur) => cur.map((consumer) => consumer.id === id ? data : consumer));
      if (this.activeConsumer()?.id === id) this.activeConsumer.set(data);
      return data;
    }
    const modeRevision = this.security.executionModeRevision();
    const existing = this.consumerAccounts().find((consumer) => consumer.id === id) ||
      (this.activeConsumer()?.id === id ? this.activeConsumer() : undefined) || undefined;
    const response = await firstValueFrom(this.http.patch<Partial<ConsumerAccount> & { address?: string }>(
      `/api/crm/consumers/${encodeURIComponent(id)}`,
      this.toConsumerProfilePayload(updates)
    ));
    this.assertRealContext(modeRevision);
    const data = this.toConsumerAccount(response, existing);
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
    if (this.security.isSimulated()) {
      this.consumerAccounts.update((cur) => cur.map((consumer) => consumer.id === consumerId
        ? { ...consumer, loyaltyPoints: (consumer.loyaltyPoints || 0) + points }
        : consumer
      ));
      const active = this.activeConsumer();
      if (active?.id === consumerId) this.activeConsumer.set({ ...active, loyaltyPoints: (active.loyaltyPoints || 0) + points });
      return;
    }
    const modeRevision = this.security.executionModeRevision();
    await firstValueFrom(this.http.post('/api/crm/loyalty', { consumerId, points }));
    this.assertRealContext(modeRevision);
    this.consumerAccounts.update(cur => cur.map(c => {
      if (c.id === consumerId) {
        return { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + points };
      }
      return c;
    }));
  }

  async createMarketingCampaign(campaign: Partial<MarketingCampaign>): Promise<void> {
    if (this.security.isSimulated()) {
      const data: MarketingCampaign = {
        ...campaign,
        id: `sim-campaign-${Date.now()}`,
        title: campaign.title?.trim() || 'Rascunho demonstrativo',
        platform: campaign.platform || 'whatsapp',
        status: 'draft',
        reach: 0,
        conversions: 0,
        sentAt: ''
      };
      this.marketingCampaigns.update((cur) => [data, ...cur]);
      return;
    }
    const modeRevision = this.security.executionModeRevision();
    const data = await firstValueFrom(this.http.post<MarketingCampaign>('/api/crm/campaigns', campaign));
    this.assertRealContext(modeRevision);
    this.marketingCampaigns.update(cur => [data, ...cur]);
  }

  async dispatchCampaign(id: string): Promise<void> {
    if (this.security.isSimulated()) {
      throw new Error('O envio de campanhas não está disponível no modo de simulação.');
    }
    const modeRevision = this.security.executionModeRevision();
    await firstValueFrom(this.http.post(`/api/crm/campaigns/${id}/dispatch`, {}));
    this.assertRealContext(modeRevision);
    this.marketingCampaigns.update(cur => cur.map(c => c.id === id ? { ...c, status: 'sent' } : c));
  }

  private createSimulatedConsumer(consumer: Partial<ConsumerAccount>): ConsumerAccount {
    const now = new Date().toISOString();
    return {
      id: `sim-consumer-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`}`,
      name: consumer.name?.trim() || 'Cliente de demonstração',
      email: consumer.email?.trim().toLowerCase() || '',
      phone: consumer.phone?.trim() || '',
      ...(consumer.cpf ? { cpf: consumer.cpf } : {}),
      primaryAddress: consumer.primaryAddress?.trim() || '',
      neighborhood: consumer.neighborhood?.trim() || '',
      city: consumer.city?.trim() || '',
      totalOrders: consumer.totalOrders ?? 0,
      totalSpent: consumer.totalSpent ?? 0,
      loyaltyPoints: consumer.loyaltyPoints ?? 0,
      status: consumer.status || 'active',
      registeredAt: consumer.registeredAt || now
    };
  }

  private toConsumerProfilePayload(consumer: Partial<ConsumerAccount>): Record<string, unknown> {
    return {
      ...(typeof consumer.name === 'string' ? { name: consumer.name } : {}),
      ...(typeof consumer.phone === 'string' ? { phone: consumer.phone } : {}),
      ...(typeof consumer.primaryAddress === 'string' ? { primaryAddress: consumer.primaryAddress } : {}),
      ...(typeof consumer.neighborhood === 'string' ? { neighborhood: consumer.neighborhood } : {}),
      ...(typeof consumer.city === 'string' ? { city: consumer.city } : {})
    };
  }

  private toConsumerAccount(
    response: Partial<ConsumerAccount> & { address?: string },
    fallback?: Partial<ConsumerAccount>
  ): ConsumerAccount {
    return {
      id: response.id || fallback?.id || this.security.currentSession()?.id || '',
      name: response.name || fallback?.name || this.security.currentSession()?.name || 'Consumidor',
      email: response.email || fallback?.email || this.security.currentSession()?.email || '',
      phone: response.phone || fallback?.phone || '',
      ...(response.cpf || fallback?.cpf ? { cpf: response.cpf || fallback?.cpf } : {}),
      primaryAddress: response.primaryAddress || response.address || fallback?.primaryAddress || '',
      neighborhood: response.neighborhood || fallback?.neighborhood || '',
      city: response.city || fallback?.city || '',
      totalOrders: response.totalOrders ?? fallback?.totalOrders ?? 0,
      totalSpent: response.totalSpent ?? fallback?.totalSpent ?? 0,
      loyaltyPoints: response.loyaltyPoints ?? fallback?.loyaltyPoints ?? 0,
      status: response.status || fallback?.status || 'active',
      registeredAt: response.registeredAt || fallback?.registeredAt || new Date().toISOString()
    };
  }

  private assertRealContext(modeRevision: number): void {
    if (this.security.isSimulated() || modeRevision !== this.security.executionModeRevision()) {
      throw new Error('O contexto mudou durante a operação de CRM. Atualize antes de continuar.');
    }
  }
}
