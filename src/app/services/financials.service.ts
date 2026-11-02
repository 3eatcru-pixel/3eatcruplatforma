import { Injectable, signal, inject, computed, effect } from '@angular/core';
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
  private lastModeIsSimulation = this.security.isSimulated();
  private lastTenantId = this.security.currentSession()?.tenantId;
  private lastModeRevision = this.security.executionModeRevision();
  private modeGeneration = 0;

  constructor() {
    effect(() => this.syncExecutionMode());
  }

  async fetchRecords(tenantId?: string): Promise<FinancialRecord[]> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
      return this.records().filter((record) => !activeTenantId || record.tenantId === activeTenantId);
    }
    
    const generation = this.modeGeneration;
    const url = tenantId ? `/api/financials?tenantId=${tenantId}` : '/api/financials';
    const data = await firstValueFrom(this.http.get<FinancialRecord[]>(url));
    this.syncExecutionMode();
    if (generation !== this.modeGeneration || this.lastModeIsSimulation) return this.records();
    this.records.set(data);
    return data;
  }

  async addRecord(record: Partial<FinancialRecord>): Promise<FinancialRecord> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const simFin: FinancialRecord = {
        ...record,
        tenantId: this.security.currentSession()?.tenantId || record.tenantId,
        id: record.id || `sim-fin-${Date.now()}`,
        date: new Date().toISOString(),
        mode: 'simulation',
        isSimulated: true
      } as FinancialRecord;
      this.records.update(cur => [simFin, ...cur]);
      return simFin;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.post<FinancialRecord>('/api/financials', record));
    this.syncExecutionMode();
    if (generation !== this.modeGeneration || this.lastModeIsSimulation) {
      throw new Error('Execution mode changed while saving financial record.');
    }
    this.records.update((cur) => [data, ...cur]);
    return data;
  }

  private syncExecutionMode() {
    const isSimulation = this.isSimulation();
    const tenantId = this.security.currentSession()?.tenantId;
    const modeRevision = this.security.executionModeRevision();
    if (isSimulation === this.lastModeIsSimulation && tenantId === this.lastTenantId && modeRevision === this.lastModeRevision) return;

    this.lastModeIsSimulation = isSimulation;
    this.lastTenantId = tenantId;
    this.lastModeRevision = modeRevision;
    this.modeGeneration += 1;
    this.records.set([]);
  }
}
