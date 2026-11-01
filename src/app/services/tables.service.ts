import { Injectable, signal, inject, computed } from '@angular/core';
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

  async fetchTables(tenantId?: string): Promise<TableInfo[]> {
    if (this.isSimulation()) return this.tables();
    const url = tenantId ? `/api/tables?tenantId=${tenantId}` : '/api/tables';
    const data = await firstValueFrom(this.http.get<TableInfo[]>(url));
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
    if (this.isSimulation()) {
      const simTable: TableInfo = {
        ...table,
        id: table.id || `sim-tab-${Date.now()}`,
        status: 'available'
      } as TableInfo;
      this.tables.update(cur => [...cur, simTable]);
      return simTable;
    }

    const data = await firstValueFrom(this.http.post<TableInfo>('/api/tables', table));
    this.tables.update((cur) => [...cur, data]);
    return data;
  }

  async updateTable(id: string, updates: Partial<TableInfo>): Promise<TableInfo> {
    const data = await firstValueFrom(this.http.patch<TableInfo>(`/api/tables/${id}`, updates));
    this.tables.update((cur) => cur.map((t) => (t.id === id ? data : t)));
    return data;
  }
}
