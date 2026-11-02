import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SystemAuditReport, AuditLog, POSDevice, LicensePlan } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';
import type { HqOverviewResponse } from './hq-api.service';
import { DEFAULT_SAAS_PLANS } from '../../shared/constants/saas-plans';

export interface HqTenantMetricsResponse {
  tenantId: string;
  eligibleOrderCount: number;
  eligibleOrderVolume: number;
  capturedAt: string;
}

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
  readonly licensePlans = signal<LicensePlan[]>(DEFAULT_SAAS_PLANS.map((plan) => ({ ...plan, includedModules: [...plan.includedModules] })));
  readonly licensePlansStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly licensePlansSource = signal<'unknown' | 'firestore' | 'mixed' | 'defaults' | 'demo'>('unknown');
  readonly overview = signal<HqOverviewResponse | null>(null);

  readonly activeSessionsCount = signal<number | null>(null);
  readonly avgLatencyMs = signal<number | null>(null);
  readonly hqEstimatedCommissionRevenue = signal<number | null>(null);
  readonly hqPublicSalesTotal = signal<number | null>(null);
  readonly totalActiveTenants = signal<number | null>(null);
  readonly uptimePercent = signal<number | null>(null);

  async getOverview(): Promise<HqOverviewResponse | null> {
    if (this.isSimulation()) {
      this.overview.set(null);
      return null;
    }
    try {
      const data = await firstValueFrom(this.http.get<HqOverviewResponse>('/api/hq/overview'));
      this.overview.set(data);
      this.maintenanceMode.set(data.maintenanceMode);
      this.globalBroadcastMessage.set(data.globalBroadcastMessage);
      if (data.defaultCommissionPercent !== null) {
        this.hqCommissionRate.set(data.defaultCommissionPercent / 100);
      }
      this.hqEstimatedCommissionRevenue.set(data.estimatedCommissionRevenue);
      this.hqPublicSalesTotal.set(data.grossPlatformVolume);
      this.totalActiveTenants.set(data.activeTenantsCount);
      return data;
    } catch {
      this.overview.set(null);
      this.hqEstimatedCommissionRevenue.set(null);
      this.hqPublicSalesTotal.set(null);
      this.totalActiveTenants.set(null);
      return null;
    }
  }

  async getTenantMetrics(tenantId: string): Promise<HqTenantMetricsResponse | null> {
    if (this.isSimulation()) return null;
    return firstValueFrom(
      this.http.get<HqTenantMetricsResponse>(`/api/hq/tenants/${encodeURIComponent(tenantId)}/metrics`)
    );
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
    if (this.licensePlansSource() === 'defaults') this.licensePlansSource.set('mixed');
  }

  async fetchPlans(): Promise<void> {
    if (this.isSimulation()) {
      this.licensePlansStatus.set('loaded');
      this.licensePlansSource.set('demo');
      return;
    }
    this.licensePlansStatus.set('loading');
    try {
      const response = await firstValueFrom(this.http.get<LicensePlan[]>('/api/hq/plans', { observe: 'response' }));
      const plans = response.body;
      if (!Array.isArray(plans)) throw new Error('Invalid plan catalog response.');
      this.licensePlans.set(plans);
      const source = response.headers.get('X-HQ-Plan-Catalog-Source');
      this.licensePlansSource.set(source === 'defaults' || source === 'mixed' ? source : 'firestore');
      this.licensePlansStatus.set('loaded');
    } catch {
      this.licensePlansSource.set('unknown');
      this.licensePlansStatus.set('error');
    }
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
    if (this.isSimulation()) {
      this.globalBroadcastMessage.set(message.trim().slice(0, 500) || null);
      return;
    }
    const response = await firstValueFrom(this.http.post<{ globalBroadcastMessage: string | null }>('/api/hq/system/broadcast', { message }));
    this.globalBroadcastMessage.set(response.globalBroadcastMessage);
  }

  async setCommissionRate(rate: number): Promise<void> {
    if (this.isSimulation()) {
      this.hqCommissionRate.set(rate / 100);
      return;
    }
    await firstValueFrom(this.http.post('/api/hq/system/commission', { percent: rate }));
    this.hqCommissionRate.set(rate / 100);
  }

  async keepPlatformCommissionComingSoon(): Promise<void> {
    if (!this.isSimulation()) {
      await firstValueFrom(this.http.post<{ platformDeliveryCommissionStatus: 'coming_soon' }>(
        '/api/hq/system/platform-delivery-commission',
        { status: 'coming_soon' }
      ));
    }

    this.overview.update((current) => current ? {
      ...current,
      platformDeliveryCommissionStatus: 'coming_soon',
      platformDeliveryOrdersCount: null,
      platformDeliveryGrossVolume: null,
      estimatedCommissionRevenue: null,
      defaultCommissionPercent: null
    } : current);
    this.hqEstimatedCommissionRevenue.set(null);
  }

  async fetchPublicStatus(): Promise<void> {
    if (this.isSimulation()) return;
    const data = await firstValueFrom(this.http.get<{ maintenanceMode: boolean; globalBroadcastMessage: string | null }>('/api/hq/public-status'));
    this.maintenanceMode.set(data.maintenanceMode);
    this.globalBroadcastMessage.set(data.globalBroadcastMessage);
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
    if (this.isSimulation()) {
      const simulatedDevice: POSDevice = {
        ...device,
        id: device.id || `sim-dev-${Date.now()}`,
        tenantId: device.tenantId || 'hq',
        tenantName: device.tenantName || (device.tenantId === 'hq' ? 'HQ Central (Infraestrutura)' : 'Unidade não carregada'),
        deviceName: device.deviceName || 'Dispositivo sem nome',
        type: device.type || 'terminal',
        serialNumber: device.serialNumber || '',
        status: 'unverified'
      };
      this.devices.update((cur) => [simulatedDevice, ...cur]);
      return simulatedDevice;
    }

    const data = await firstValueFrom(this.http.post<POSDevice>('/api/hq/devices', device));
    this.devices.update(cur => [...cur, data]);
    return data;
  }

  async runAudit(): Promise<SystemAuditReport> {
    if (this.isSimulation()) throw new Error('A varredura estrutural requer acesso ao servidor e não está disponível no modo de simulação.');
    return firstValueFrom(this.http.post<SystemAuditReport>('/api/hq/audit/run', {}));
  }

  async fetchDevices(tenantId?: string): Promise<POSDevice[]> {
    if (this.isSimulation()) return this.devices();
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
    if (this.isSimulation()) return;
    await firstValueFrom(this.http.post(`/api/hq/devices/${deviceId}/restart`, {}));
    await this.fetchDevices();
  }

  async lockDevice(deviceId: string): Promise<void> {
    if (this.isSimulation()) {
      this.devices.update((cur) => cur.map((device) => device.id === deviceId
        ? { ...device, status: device.status === 'locked' ? 'unverified' : 'locked' }
        : device));
      return;
    }
    await firstValueFrom(this.http.post(`/api/hq/devices/${deviceId}/lock`, {}));
    await this.fetchDevices();
  }

}
