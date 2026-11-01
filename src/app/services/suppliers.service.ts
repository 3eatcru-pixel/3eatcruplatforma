import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Supplier } from '../models/ecosystem.model';

export type StoreSupplier = Supplier & { tenantId: string; createdAt?: string };

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);
  readonly suppliers = signal<StoreSupplier[]>([]);

  async fetchSuppliers(tenantId: string): Promise<StoreSupplier[]> {
    const data = await firstValueFrom(this.http.get<StoreSupplier[]>(`/api/suppliers?tenantId=${encodeURIComponent(tenantId)}`));
    this.suppliers.set(data);
    return data;
  }

  async createSupplier(input: Partial<StoreSupplier>): Promise<StoreSupplier> {
    const data = await firstValueFrom(this.http.post<StoreSupplier>('/api/suppliers', input));
    this.suppliers.update((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    return data;
  }

  async setStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    const updated = await firstValueFrom(this.http.patch<StoreSupplier>(`/api/suppliers/${encodeURIComponent(id)}/status`, { status }));
    this.suppliers.update((current) => current.map((supplier) => supplier.id === id ? updated : supplier));
  }
}
