import { Injectable, signal, inject, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TableInfo } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { FirebaseService } from '../core/firebase/firebase.service';
import { SecurityService } from './security.service';
import { Unsubscribe } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class TablesService {
  private readonly http = inject(HttpClient);
  private readonly firebase = inject(FirebaseService);
  private readonly security = inject(SecurityService);

  readonly isSimulation = computed(() => this.security.isSimulated());

  readonly tables = signal<TableInfo[]>([]);
  private tablesSubscription: Unsubscribe | null = null;
  private lastModeIsSimulation = this.security.isSimulated();
  private lastTenantId = this.security.currentSession()?.tenantId;
  private latestFetchId = 0;
  private modeGeneration = 0;

  constructor() {
    effect(() => this.syncExecutionMode());
    if (this.lastModeIsSimulation) this.seedSimulationTables();
  }

  async fetchTables(tenantId?: string): Promise<TableInfo[]> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
      return this.tables().filter((table) => !activeTenantId || table.tenantId === activeTenantId);
    }

    const fetchId = ++this.latestFetchId;
    const url = tenantId ? `/api/tables?tenantId=${tenantId}` : '/api/tables';
    const data = await firstValueFrom(this.http.get<TableInfo[]>(url));
    this.syncExecutionMode();
    if (fetchId !== this.latestFetchId || this.lastModeIsSimulation) return this.tables();

    this.tables.set(data);

    if (this.firebase.isBrowser && this.firebase.auth?.currentUser) {
      if (this.tablesSubscription) {
        this.tablesSubscription();
        this.tablesSubscription = null;
      }

      const uid = this.firebase.auth.currentUser.uid;
      const role = this.security.currentSession()?.role;
      const activeTenant = tenantId || this.security.currentSession()?.tenantId || '';

      if (
        activeTenant &&
        (role === 'tenant_owner' || role === 'operator' || role === 'waiter')
      ) {
        this.tablesSubscription = this.firebase.listenTables(
          activeTenant,
          uid,
          (updatedTables) => {
            if (fetchId !== this.latestFetchId || this.isSimulation()) return;
            const list = updatedTables as unknown as TableInfo[];
            const sorted = [...list].sort((a, b) => a.number - b.number);
            this.tables.set(sorted);
          }
        );
      }
    }

    return data;
  }

  async createTable(table: Partial<TableInfo>): Promise<TableInfo> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const tenantId = this.security.currentSession()?.tenantId || table.tenantId;
      const simTable: TableInfo = {
        ...table,
        id: table.id || `sim-tab-${Date.now()}`,
        tenantId,
        status: 'available',
        isSimulated: true,
        mode: 'simulation'
      } as TableInfo;
      this.tables.update((current) => [
        ...current.filter((item) => item.id !== simTable.id),
        simTable
      ]);
      return simTable;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.post<TableInfo>('/api/tables', table));
    this.assertRealMode(generation);
    this.tables.update((cur) => [...cur, data]);
    return data;
  }

  async updateTable(id: string, updates: Partial<TableInfo>): Promise<TableInfo> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = this.security.currentSession()?.tenantId;
      let updated: TableInfo | null = null;
      this.tables.update((tables) => tables.map((table) => {
        if (table.id !== id || (activeTenantId && table.tenantId !== activeTenantId)) return table;
        updated = {
          ...table,
          ...updates,
          id: table.id,
          tenantId: table.tenantId,
          isSimulated: true,
          mode: 'simulation'
        };
        return updated;
      }));
      if (!updated) throw new Error('Simulated table not found');
      return updated;
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(this.http.patch<TableInfo>(`/api/tables/${id}`, updates));
    this.assertRealMode(generation);
    this.tables.update((cur) => cur.map((t) => (t.id === id ? data : t)));
    return data;
  }

  private syncExecutionMode() {
    const isSimulation = this.isSimulation();
    const tenantId = this.security.currentSession()?.tenantId;
    if (isSimulation === this.lastModeIsSimulation && tenantId === this.lastTenantId) return;

    this.lastModeIsSimulation = isSimulation;
    this.lastTenantId = tenantId;
    this.modeGeneration += 1;
    this.latestFetchId += 1;
    if (this.tablesSubscription) {
      this.tablesSubscription();
      this.tablesSubscription = null;
    }
    this.tables.set([]);
    if (isSimulation) this.seedSimulationTables();
  }

  private seedSimulationTables() {
    const tenantId = this.security.currentSession()?.tenantId || 'tenant-sp-001';
    if (this.tables().some((table) => table.tenantId === tenantId)) return;

    this.tables.update((tables) => [
      ...tables,
      { id: `sim-table-${tenantId}-01`, tenantId, number: 1, capacity: 4, status: 'available', zone: 'Salão', isSimulated: true, mode: 'simulation' },
      { id: `sim-table-${tenantId}-02`, tenantId, number: 2, capacity: 4, status: 'available', zone: 'Salão', isSimulated: true, mode: 'simulation' },
      { id: `sim-table-${tenantId}-03`, tenantId, number: 3, capacity: 2, status: 'available', zone: 'Varanda', isSimulated: true, mode: 'simulation' },
      { id: `sim-table-${tenantId}-04`, tenantId, number: 4, capacity: 6, status: 'available', zone: 'Salão', isSimulated: true, mode: 'simulation' }
    ]);
  }

  private assertRealMode(generation: number) {
    this.syncExecutionMode();
    if (generation !== this.modeGeneration || this.lastModeIsSimulation) {
      throw new Error('Execution mode changed while saving table.');
    }
  }
}
