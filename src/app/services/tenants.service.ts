import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyTenant, PublicStorefront, TenantUpdate } from '../models/ecosystem.model';
import { MOCK_TENANTS } from '../models/mock-data';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';
import { roundCurrencyAmount } from '../../shared/utils/money.util';

@Injectable({
  providedIn: 'root'
})
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  private contextGeneration = 0;
  private latestPublicStorefrontFetchId = 0;

  readonly isSimulation = computed(() => this.security.isSimulated());
  
  readonly tenants = signal<CompanyTenant[]>(this.security.isSimulated() ? MOCK_TENANTS : []);
  readonly publicStorefronts = signal<PublicStorefront[]>([]);
  readonly publicStorefrontsStatus = signal<'idle' | 'loading' | 'loaded' | 'error' | 'simulation'>(
    this.security.isSimulated() ? 'simulation' : 'idle'
  );
  readonly activeTenantId = signal<string | null>(null);

  constructor() {
    effect(() => this.resetForExecutionMode(this.isSimulation()));
  }

  resetForExecutionMode(simulation = this.isSimulation()): void {
    this.contextGeneration += 1;
    this.latestPublicStorefrontFetchId += 1;
    this.tenants.set(simulation ? MOCK_TENANTS : []);
    this.publicStorefronts.set(simulation
      ? MOCK_TENANTS.filter(tenant => tenant.status === 'active').map(tenant => this.toDemoStorefront(tenant))
      : []);
    this.publicStorefrontsStatus.set(simulation ? 'simulation' : 'idle');
  }

  readonly currentTenant = computed(() => {
    const id = this.activeTenantId();
    return this.tenants().find(t => t.id === id) || null;
  });

  async fetchPublicStorefronts(): Promise<PublicStorefront[]> {
    const requestId = ++this.latestPublicStorefrontFetchId;
    if (this.isSimulation()) {
      const storefronts = this.tenants().filter(tenant => tenant.status === 'active').map(tenant => this.toDemoStorefront(tenant));
      this.publicStorefronts.set(storefronts);
      this.publicStorefrontsStatus.set('simulation');
      return storefronts;
    }

    const modeRevision = this.security.executionModeRevision();
    const generation = this.contextGeneration;
    this.publicStorefrontsStatus.set('loading');
    try {
      const data = await firstValueFrom(this.http.get<PublicStorefront[]>('/api/tenants/public'));
      if (!this.isCurrentPublicStorefrontRequest(requestId, generation, modeRevision)) return this.publicStorefronts();
      if (Array.isArray(data)) {
        this.publicStorefronts.set(data);
        this.publicStorefrontsStatus.set('loaded');
        return data;
      }
      throw new Error('Resposta inválida ao carregar vitrines públicas.');
    } catch {
      if (!this.isCurrentPublicStorefrontRequest(requestId, generation, modeRevision)) return this.publicStorefronts();
      this.publicStorefronts.set([]);
      this.publicStorefrontsStatus.set('error');
      return [];
    }
  }

  async fetchPublicTenants(): Promise<PublicStorefront[]> {
    return this.fetchPublicStorefronts();
  }

  async fetchAllTenants(): Promise<CompanyTenant[]> {
    if (this.isSimulation()) return this.tenants();
    const generation = this.contextGeneration;
    const modeRevision = this.security.executionModeRevision();
    try {
      const data = await firstValueFrom(this.http.get<CompanyTenant[]>('/api/tenants'));
      if (!this.isCurrentRealContext(generation, modeRevision)) return this.tenants();
      if (Array.isArray(data)) {
        this.tenants.set(data);
        return data;
      }
      this.tenants.set([]);
      return [];
    } catch {
      if (!this.isCurrentRealContext(generation, modeRevision)) return this.tenants();
      this.tenants.set([]);
      return [];
    }
  }

  async getTenantById(id: string): Promise<CompanyTenant | PublicStorefront> {
    if (this.isSimulation()) {
      const found = this.tenants().find(t => t.id === id);
      if (found) return found;
      throw new Error('Simulated tenant not found');
    }
    const generation = this.contextGeneration;
    const modeRevision = this.security.executionModeRevision();
    const tenant = await firstValueFrom(this.http.get<CompanyTenant | PublicStorefront>(`/api/tenants/${id}`));
    if (!this.isCurrentRealContext(generation, modeRevision)) {
      if (this.isSimulation()) {
        const demoTenant = this.tenants().find((candidate) => candidate.id === id);
        if (demoTenant) return demoTenant;
      }
      throw new Error('O contexto mudou durante a consulta da loja. Atualize a tela antes de continuar.');
    }
    return tenant;
  }

  async updateTenant(id: string, updates: TenantUpdate): Promise<CompanyTenant> {
    if (this.isSimulation()) {
      let updated: CompanyTenant | null = null;
      this.tenants.update(cur => cur.map(t => {
        if (t.id === id) {
          const next = {
            ...t,
            ...updates,
            ...(typeof updates.deliveryFee === 'number' ? { deliveryFee: roundCurrencyAmount(updates.deliveryFee) } : {}),
            ...(typeof updates.storeDeliveryContribution === 'number'
              ? { storeDeliveryContribution: roundCurrencyAmount(updates.storeDeliveryContribution) }
              : {})
          } as CompanyTenant;
          for (const field of ['deliveryFee', 'storeDeliveryContribution', 'minOrderValue', 'aboutText', 'pixKey'] as const) {
            if (updates[field] === null) delete next[field];
          }
          updated = next;
          return updated;
        }
        return t;
      }));
      if (!updated) throw new Error('Simulated tenant not found');
      const publicStorefront = this.toDemoStorefront(updated);
      this.publicStorefronts.update(cur => updated!.status === 'active'
        ? cur.some(store => store.id === id)
          ? cur.map(store => store.id === id ? publicStorefront : store)
          : [...cur, publicStorefront]
        : cur.filter(store => store.id !== id));
      return updated;
    }

    const modeRevision = this.security.executionModeRevision();
    const generation = this.contextGeneration;
    const data = await firstValueFrom(this.http.patch<CompanyTenant>(`/api/tenants/${id}`, updates));
    if (!this.isCurrentRealContext(generation, modeRevision)) return data;
    this.tenants.update(cur => cur.map(t => {
      if (t.id !== id) return t;
      const next = { ...t, ...data };
      for (const field of ['deliveryFee', 'storeDeliveryContribution', 'minOrderValue', 'aboutText', 'pixKey'] as const) {
        if (updates[field] === null) delete next[field];
      }
      return next;
    }));
    await this.fetchPublicStorefronts();
    return data;
  }

  async linkOwner(id: string, email: string): Promise<{ tenantId: string; ownerUid: string; ownerEmail: string; role: 'tenant_owner' }> {
    if (this.isSimulation()) {
      throw new Error('A vinculação de responsável exige o modo real e uma conta verificada no servidor.');
    }

    const generation = this.contextGeneration;
    const modeRevision = this.security.executionModeRevision();
    const data = await firstValueFrom(this.http.post<{
      tenantId: string;
      ownerUid: string;
      ownerEmail: string;
      role: 'tenant_owner';
    }>(`/api/tenants/${encodeURIComponent(id)}/owner`, { email }));

    if (!this.isCurrentRealContext(generation, modeRevision)) return data;

    this.tenants.update(cur => cur.map(tenant => tenant.id === id
      ? { ...tenant, ownerUid: data.ownerUid, staffUids: [...new Set([...(tenant.staffUids || []), data.ownerUid])] }
      : tenant));
    return data;
  }

  async getOwner(id: string): Promise<{ tenantId: string; ownerUid: string | null; ownerEmail: string | null; emailVerified: boolean | null }> {
    if (this.isSimulation()) {
      const tenant = this.tenants().find(candidate => candidate.id === id);
      return {
        tenantId: id,
        ownerUid: tenant?.ownerUid || null,
        ownerEmail: null,
        emailVerified: null
      };
    }

    const generation = this.contextGeneration;
    const modeRevision = this.security.executionModeRevision();
    const owner = await firstValueFrom(this.http.get<{
      tenantId: string;
      ownerUid: string | null;
      ownerEmail: string | null;
      emailVerified: boolean | null;
    }>(`/api/tenants/${encodeURIComponent(id)}/owner`));
    if (!this.isCurrentRealContext(generation, modeRevision)) {
      return { tenantId: id, ownerUid: null, ownerEmail: null, emailVerified: null };
    }
    return owner;
  }

  async createTenant(tenant: Partial<CompanyTenant>): Promise<CompanyTenant> {
    if (this.isSimulation()) {
      const plan = tenant.plan || 'Starter';
      const simTenant: CompanyTenant = {
        ...tenant,
        id: tenant.id || `sim-ten-${Date.now()}`,
        plan,
        status: 'trial',
        activeDevicesCount: 0,
        devicesLimit: tenant.devicesLimit ?? (plan === 'Enterprise' ? 20 : plan === 'Professional' ? 5 : 2),
        createdAt: new Date().toISOString(),
        isOpen: false,
        supportsDelivery: false,
        supportsTakeout: true,
        storeDeliveryContribution: 0
      } as CompanyTenant;
      this.tenants.update(cur => [...cur, simTenant]);
      return simTenant;
    }

    const generation = this.contextGeneration;
    const modeRevision = this.security.executionModeRevision();
    const data = await firstValueFrom(this.http.post<CompanyTenant>('/api/tenants', tenant));
    if (!this.isCurrentRealContext(generation, modeRevision)) return data;
    this.tenants.update(cur => [...cur, data]);
    return data;
  }

  private isCurrentRealContext(generation: number, modeRevision: number): boolean {
    return !this.isSimulation() &&
      generation === this.contextGeneration &&
      modeRevision === this.security.executionModeRevision();
  }

  private isCurrentPublicStorefrontRequest(requestId: number, generation: number, modeRevision: number): boolean {
    return requestId === this.latestPublicStorefrontFetchId &&
      generation === this.contextGeneration &&
      modeRevision === this.security.executionModeRevision() &&
      !this.isSimulation();
  }

  private toDemoStorefront(tenant: CompanyTenant): PublicStorefront {
    return {
      id: tenant.id,
      name: tenant.name,
      category: tenant.category,
      status: tenant.status,
      aboutText: typeof tenant.aboutText === 'string' ? tenant.aboutText.trim().slice(0, 500) : undefined,
      tagline: tenant.tagline,
      badgeCategory: tenant.badgeCategory,
      supportsDelivery: tenant.supportsDelivery,
      supportsTakeout: tenant.supportsTakeout,
      supportsReservation: tenant.supportsReservation,
      pixAvailable: Boolean(tenant.pixKey?.trim() && tenant.pixKey.trim().length <= 77),
      isOpen: tenant.isOpen,
      estimatedDeliveryMinutes: tenant.estimatedDeliveryMinutes,
      deliveryFee: tenant.deliveryFee,
      minOrderValue: tenant.minOrderValue,
      deliveryRadiusKm: tenant.deliveryRadiusKm,
      openingHours: tenant.openingHours,
      address: {
        city: tenant.address.city,
        neighborhood: tenant.address.neighborhood,
        state: tenant.address.state,
        street: tenant.address.street,
        number: tenant.address.number,
        zipCode: tenant.address.zipCode
      },
      lat: tenant.lat,
      lng: tenant.lng,
      logo: tenant.logo,
      coverImage: tenant.coverImage,
      specialties: tenant.specialties,
      storeSlug: tenant.storeSlug,
      themeColor: tenant.themeColor,
      announcementText: tenant.announcementText,
      showAnnouncement: tenant.showAnnouncement,
      announcementType: tenant.announcementType,
      whatsappNumber: tenant.whatsappNumber,
      highlightedProductIds: tenant.highlightedProductIds
    };
  }
}
