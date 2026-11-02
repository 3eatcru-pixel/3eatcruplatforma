import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Supplier } from '../models/ecosystem.model';
import { SecurityService } from './security.service';

export type StoreSupplier = Supplier & { tenantId: string; createdAt?: string };

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  readonly suppliers = signal<StoreSupplier[]>([]);
  private requestGeneration = 0;
  private lastContext = '';

  constructor() {
    effect(() => {
      const context = `${this.security.executionMode()}:${this.security.executionModeRevision()}:${this.security.currentSession()?.tenantId || ''}`;
      if (context === this.lastContext) return;
      this.lastContext = context;
      this.requestGeneration += 1;
      this.suppliers.set([]);
    });
  }

  async fetchSuppliers(tenantId: string): Promise<StoreSupplier[]> {
    const session = this.security.currentSession();
    if (this.security.isSimulated() || !session || tenantId !== session.tenantId || !this.canManage()) {
      this.suppliers.set([]);
      return [];
    }
    const generation = ++this.requestGeneration;
    const modeRevision = this.security.executionModeRevision();
    const data = await firstValueFrom(this.http.get<StoreSupplier[]>(`/api/suppliers?tenantId=${encodeURIComponent(tenantId)}`));
    if (generation !== this.requestGeneration || modeRevision !== this.security.executionModeRevision() ||
        this.security.isSimulated() || this.security.currentSession()?.tenantId !== tenantId) {
      return this.suppliers();
    }
    const scopedData = data.filter((supplier) => supplier.tenantId === tenantId);
    this.suppliers.set(scopedData);
    return scopedData;
  }

  async createSupplier(input: Partial<StoreSupplier>): Promise<StoreSupplier> {
    if (!this.canManage() || this.security.isSimulated() || input.tenantId !== this.security.currentSession()?.tenantId) {
      throw new Error('O cadastro de fornecedor exige modo real e acesso à unidade ativa.');
    }
    const generation = this.requestGeneration;
    const modeRevision = this.security.executionModeRevision();
    const data = await firstValueFrom(this.http.post<StoreSupplier>('/api/suppliers', input));
    if (generation !== this.requestGeneration || modeRevision !== this.security.executionModeRevision() || this.security.isSimulated()) {
      return data;
    }
    this.suppliers.update((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    return data;
  }

  async setStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    if (!this.canManage() || this.security.isSimulated()) {
      throw new Error('A alteração do fornecedor exige modo real e acesso de gestão.');
    }
    const generation = this.requestGeneration;
    const modeRevision = this.security.executionModeRevision();
    const updated = await firstValueFrom(this.http.patch<StoreSupplier>(`/api/suppliers/${encodeURIComponent(id)}/status`, { status }));
    if (generation !== this.requestGeneration || modeRevision !== this.security.executionModeRevision() || this.security.isSimulated()) return;
    this.suppliers.update((current) => current.map((supplier) => supplier.id === id ? updated : supplier));
  }

  private canManage(): boolean {
    const role = this.security.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  }
}
