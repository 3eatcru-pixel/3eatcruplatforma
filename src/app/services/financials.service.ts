import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FinancialRecord } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class FinancialsService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);

  readonly isSimulation = computed(() => this.security.isSimulated());

  readonly records = signal<FinancialRecord[]>([]);

  async fetchRecords(tenantId?: string): Promise<FinancialRecord[]> {
    if (this.isSimulation()) return this.records();
    
    const url = tenantId ? `/api/financials?tenantId=${tenantId}` : '/api/financials';
    const data = await firstValueFrom(this.http.get<FinancialRecord[]>(url));
    this.records.set(data);
    return data;
  }

  async addRecord(record: Partial<FinancialRecord>): Promise<FinancialRecord> {
    if (this.isSimulation()) {
      const simFin: FinancialRecord = {
        ...record,
        id: record.id || `sim-fin-${Date.now()}`,
        date: new Date().toISOString(),
        mode: 'simulation',
        isSimulated: true
      } as FinancialRecord;
      this.records.update(cur => [simFin, ...cur]);
      return simFin;
    }

    const data = await firstValueFrom(this.http.post<FinancialRecord>('/api/financials', record));
    this.records.update((cur) => [data, ...cur]);
    return data;
  }
}
