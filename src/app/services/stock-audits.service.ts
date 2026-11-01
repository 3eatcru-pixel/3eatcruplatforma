import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StockAuditEntry, StockAuditRecord } from '../models/ecosystem.model';

@Injectable({ providedIn: 'root' })
export class StockAuditsService {
  private readonly http = inject(HttpClient);
  readonly audits = signal<StockAuditRecord[]>([]);

  async fetchAudits(tenantId: string): Promise<StockAuditRecord[]> {
    const data = await firstValueFrom(this.http.get<StockAuditRecord[]>(`/api/stock-audits?tenantId=${encodeURIComponent(tenantId)}`));
    this.audits.set(data);
    return data;
  }

  async createAudit(tenantId: string, entries: Pick<StockAuditEntry, 'productId' | 'countedStock'>[]): Promise<StockAuditRecord> {
    const data = await firstValueFrom(this.http.post<StockAuditRecord>('/api/stock-audits', { tenantId, entries }));
    this.audits.update((current) => [data, ...current]);
    return data;
  }
}
