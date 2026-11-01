import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyTenant, PublicStorefront } from '../models/ecosystem.model';
import { MOCK_TENANTS } from '../models/mock-data';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);

  readonly isSimulation = computed(() => this.security.isSimulated());
  
  readonly tenants = signal<CompanyTenant[]>(MOCK_TENANTS);
  readonly publicStorefronts = signal<PublicStorefront[]>([]);
  readonly activeTenantId = signal<string | null>(null);

  readonly currentTenant = computed(() => {
    const id = this.activeTenantId();
    return this.tenants().find(t => t.id === id) || null;
  });

  async fetchPublicStorefronts(): Promise<PublicStorefront[]> {
    try {
      const data = await firstValueFrom(this.http.get<PublicStorefront[]>('/api/tenants/public'));
      if (Array.isArray(data)) {
        this.publicStorefronts.set(data);
        return data;
      }
      return this.publicStorefronts();
    } catch {
      return this.publicStorefronts();
    }
  }

  async fetchPublicTenants(): Promise<PublicStorefront[]> {
    return this.fetchPublicStorefronts();
  }

  async fetchAllTenants(): Promise<CompanyTenant[]> {
    if (this.isSimulation()) return this.tenants();
    try {
      const data = await firstValueFrom(this.http.get<CompanyTenant[]>('/api/tenants'));
      if (Array.isArray(data)) {
        this.tenants.set(data);
        return data;
      }
      return this.tenants();
    } catch {
      return this.tenants();
    }
  }

  async getTenantById(id: string): Promise<CompanyTenant | PublicStorefront> {
    if (this.isSimulation()) {
      const found = this.tenants().find(t => t.id === id);
      if (found) return found;
      throw new Error('Simulated tenant not found');
    }
    return firstValueFrom(this.http.get<CompanyTenant | PublicStorefront>(`/api/tenants/${id}`));
  }

  async updateTenant(id: string, updates: Partial<CompanyTenant>): Promise<CompanyTenant> {
    if (this.isSimulation()) {
      let updated: CompanyTenant | null = null;
      this.tenants.update(cur => cur.map(t => {
        if (t.id === id) {
          updated = { ...t, ...updates };
          return updated;
        }
        return t;
      }));
      if (!updated) throw new Error('Simulated tenant not found');
      return updated;
    }

    const data = await firstValueFrom(this.http.patch<CompanyTenant>(`/api/tenants/${id}`, updates));
    this.tenants.update(cur => cur.map(t => t.id === id ? { ...t, ...data } : t));
    this.publicStorefronts.update(cur => cur.map(t => t.id === id ? { ...t, ...data } : t));
    return data;
  }

  async linkOwner(id: string, email: string): Promise<{ tenantId: string; ownerUid: string; ownerEmail: string; role: 'tenant_owner' }> {
    if (this.isSimulation()) {
      throw new Error('A vinculação de responsável exige o modo real e uma conta verificada no servidor.');
    }

    const data = await firstValueFrom(this.http.post<{
      tenantId: string;
      ownerUid: string;
      ownerEmail: string;
      role: 'tenant_owner';
    }>(`/api/tenants/${encodeURIComponent(id)}/owner`, { email }));

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

    return firstValueFrom(this.http.get<{
      tenantId: string;
      ownerUid: string | null;
      ownerEmail: string | null;
      emailVerified: boolean | null;
    }>(`/api/tenants/${encodeURIComponent(id)}/owner`));
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
        isOpen: false
      } as CompanyTenant;
      this.tenants.update(cur => [...cur, simTenant]);
      return simTenant;
    }

    const data = await firstValueFrom(this.http.post<CompanyTenant>('/api/tenants', tenant));
    this.tenants.update(cur => [...cur, data]);
    return data;
  }
}
