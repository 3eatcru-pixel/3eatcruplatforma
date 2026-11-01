import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SystemAuditReport, AuditLog, POSDevice, LicensePlan } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

const DEFAULT_PLANS: LicensePlan[] = [
  { id: 'Starter', name: 'Starter (Iniciante)', priceMonthly: 149.00, maxDevices: 2, includedModules: ['PDV Caixa'], description: 'Pequenos comércios.' },
  { id: 'Professional', name: 'Professional (Avançado)', priceMonthly: 299.00, maxDevices: 5, includedModules: ['PDV', 'KDS', 'Mesas'], description: 'Restaurantes e lojas.' },
  { id: 'Enterprise', name: 'Enterprise (Corporativo)', priceMonthly: 599.00, maxDevices: 20, includedModules: ['Total'], description: 'Franquias.' }
];

@Injectable({
  providedIn: 'root'
})
export class HqService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);

  readonly isSimulation = computed(() => this.security.isSimulated());
  
  readonly devices = signal<POSDevice[]>([]);
  readonly auditLogs = signal<AuditLog[]>([]);
  readonly maintenanceMode = signal<boolean>(false);
  readonly globalBroadcastMessage = signal<string | null>(null);
  readonly hqCommissionRate = signal<number>(0.08);
  readonly licensePlans = signal<LicensePlan[]>(DEFAULT_PLANS);

  readonly activeSessionsCount = signal<number>(120);
  readonly avgLatencyMs = signal<number>(15);
  readonly hqTotalCommissionRevenue = signal<number>(15420.50);
  readonly hqPublicSalesTotal = signal<number>(192756.25);

  async getOverview(): Promise<Record<string, unknown> | null> {
    if (this.isSimulation()) return null;
    try {
      const data = await firstValueFrom(this.http.get<Record<string, unknown>>('/api/hq/overview'));
      if (data && typeof data === 'object' && !('error' in data)) {
        if (data['maintenanceMode'] !== undefined) this.maintenanceMode.set(!!data['maintenanceMode']);
        if (data['globalBroadcastMessage'] !== undefined) this.globalBroadcastMessage.set(data['globalBroadcastMessage'] as string);
        if (typeof data['defaultCommissionPercent'] === 'number') this.hqCommissionRate.set(data['defaultCommissionPercent'] / 100);
        if (Array.isArray(data['plans'])) this.licensePlans.set(data['plans'] as LicensePlan[]);
      }
      return data;
    } catch {
      return null;
    }
  }

  async updatePlanPrice(planId: string, price: number, maxDevices?: number): Promise<void> {
    if (this.isSimulation()) {
      this.licensePlans.update(cur => cur.map(p => p.id === planId ? { 
        ...p, 
        priceMonthly: price, 
        maxDevices: maxDevices !== undefined ? maxDevices : p.maxDevices 
      } : p));
      return;
    }

    await firstValueFrom(
      this.http.patch(`/api/hq/plans/${planId}`, {
        priceMonthly: price,
        ...(maxDevices !== undefined ? { maxDevices } : {})
      })
    );
    this.licensePlans.update(cur => cur.map(p => p.id === planId ? { 
      ...p, 
      priceMonthly: price, 
      maxDevices: maxDevices !== undefined ? maxDevices : p.maxDevices 
    } : p));
  }

  async setMaintenance(enabled: boolean): Promise<void> {
    if (this.isSimulation()) {
      this.maintenanceMode.set(enabled);
      return;
    }
    await firstValueFrom(this.http.post('/api/hq/system/maintenance', { enabled }));
    this.maintenanceMode.set(enabled);
  }

  async setBroadcast(message: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/hq/system/broadcast', { message }));
    this.globalBroadcastMessage.set(message);
  }

  async setCommissionRate(rate: number): Promise<void> {
    await firstValueFrom(this.http.post('/api/hq/system/commission', { percent: rate }));
    this.hqCommissionRate.set(rate / 100);
  }

  async logAudit(action: string, module: AuditLog['module'], details: string, severity: AuditLog['severity'] = 'info'): Promise<void> {
    // Audit logging is usually server-side, but this can be a client bridge if needed.
    // For now, we update local signal for UI feedback.
    this.auditLogs.update(cur => [{
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: 'User',
      action,
      module,
      details,
      severity
    }, ...cur]);
  }

  async createDevice(device: Partial<POSDevice>): Promise<POSDevice> {
    const data = await firstValueFrom(this.http.post<POSDevice>('/api/hq/devices', device));
    this.devices.update(cur => [...cur, data]);
    return data;
  }

  async runAudit(): Promise<SystemAuditReport> {
    return firstValueFrom(this.http.post<SystemAuditReport>('/api/hq/audit/run', {}));
  }

  async fetchDevices(tenantId?: string): Promise<POSDevice[]> {
    try {
      const url = tenantId ? `/api/hq/devices?tenantId=${tenantId}` : '/api/hq/devices';
      const data = await firstValueFrom(this.http.get<POSDevice[]>(url));
      if (data && Array.isArray(data)) this.devices.set(data);
      return data || [];
    } catch {
      return [];
    }
  }

  async fetchAuditLogs(): Promise<AuditLog[]> {
    try {
      const data = await firstValueFrom(this.http.get<AuditLog[]>('/api/hq/audit'));
      if (data && Array.isArray(data)) this.auditLogs.set(data);
      return data || [];
    } catch {
      return [];
    }
  }

  async restartDevice(deviceId: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/hq/devices/${deviceId}/restart`, {}));
    await this.fetchDevices();
  }

  async lockDevice(deviceId: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/hq/devices/${deviceId}/lock`, {}));
    await this.fetchDevices();
  }

  readonly totalActiveTenants = signal<number>(42);
  readonly uptimePercent = signal<number>(99.98);
}
