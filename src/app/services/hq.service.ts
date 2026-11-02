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
  private dataGeneration = 0;

  readonly isSimulation = computed(() => this.security.isSimulated());
  
  readonly devices = signal<POSDevice[]>([]);
  readonly devicesStatus = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
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

  resetForExecutionMode(simulation: boolean) {
    this.dataGeneration += 1;
    this.devices.set([]);
    this.devicesStatus.set(simulation ? 'loaded' : 'idle');
    this.auditLogs.set([]);
    this.overview.set(null);
    this.maintenanceMode.set(false);
    this.globalBroadcastMessage.set(null);
    this.hqCommissionRate.set(0.08);
    this.hqEstimatedCommissionRevenue.set(null);
    this.hqPublicSalesTotal.set(null);
    this.totalActiveTenants.set(null);
    this.activeSessionsCount.set(null);
    this.avgLatencyMs.set(null);
    this.uptimePercent.set(null);
    this.licensePlans.set(DEFAULT_SAAS_PLANS.map((plan) => ({ ...plan, includedModules: [...plan.includedModules] })));
    this.licensePlansStatus.set(simulation ? 'loaded' : 'idle');
    this.licensePlansSource.set(simulation ? 'demo' : 'unknown');
  }

  async getOverview(): Promise<HqOverviewResponse | null> {
    if (this.isSimulation()) {
      this.overview.set(null);
      return null;
    }
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    try {
      const data = await firstValueFrom(this.http.get<HqOverviewResponse>('/api/hq/overview'));
      if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return null;
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
      if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return null;
      this.overview.set(null);
      this.hqEstimatedCommissionRevenue.set(null);
      this.hqPublicSalesTotal.set(null);
      this.totalActiveTenants.set(null);
      return null;
    }
  }

  async getTenantMetrics(tenantId: string): Promise<HqTenantMetricsResponse | null> {
    if (this.isSimulation()) return null;
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    const data = await firstValueFrom(
      this.http.get<HqTenantMetricsResponse>(`/api/hq/tenants/${encodeURIComponent(tenantId)}/metrics`)
    );
    if (this.isSimulation() || generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return null;
    return data;
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

    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    await firstValueFrom(
      this.http.patch(`/api/hq/plans/${planId}`, {
        priceMonthly: price,
        ...(maxDevices !== undefined ? { maxDevices } : {})
      })
    );
    if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return;
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
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    this.licensePlansStatus.set('loading');
    try {
      const response = await firstValueFrom(this.http.get<LicensePlan[]>('/api/hq/plans', { observe: 'response' }));
      if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return;
      const plans = response.body;
      if (!Array.isArray(plans)) throw new Error('Invalid plan catalog response.');
      this.licensePlans.set(plans);
      const source = response.headers.get('X-HQ-Plan-Catalog-Source');
      this.licensePlansSource.set(source === 'defaults' || source === 'mixed' ? source : 'firestore');
      this.licensePlansStatus.set('loaded');
    } catch {
      if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return;
      this.licensePlansSource.set('unknown');
      this.licensePlansStatus.set('error');
    }
  }

  async setMaintenance(enabled: boolean): Promise<void> {
    if (this.isSimulation()) {
      this.maintenanceMode.set(enabled);
      return;
    }
    const modeRevision = this.security.executionModeRevision();
    const generation = this.dataGeneration;
    await firstValueFrom(this.http.post('/api/hq/system/maintenance', { enabled }));
    if (modeRevision !== this.security.executionModeRevision() || generation !== this.dataGeneration) return;
    this.maintenanceMode.set(enabled);
  }

  async setBroadcast(message: string): Promise<void> {
    if (this.isSimulation()) {
      this.globalBroadcastMessage.set(message.trim().slice(0, 500) || null);
      return;
    }
    const modeRevision = this.security.executionModeRevision();
    const generation = this.dataGeneration;
    const response = await firstValueFrom(this.http.post<{ globalBroadcastMessage: string | null }>('/api/hq/system/broadcast', { message }));
    if (modeRevision !== this.security.executionModeRevision() || generation !== this.dataGeneration) return;
    this.globalBroadcastMessage.set(response.globalBroadcastMessage);
  }

  async setCommissionRate(rate: number): Promise<void> {
    if (this.isSimulation()) {
      this.hqCommissionRate.set(rate / 100);
      return;
    }
    const modeRevision = this.security.executionModeRevision();
    const generation = this.dataGeneration;
    await firstValueFrom(this.http.post('/api/hq/system/commission', { percent: rate }));
    if (modeRevision !== this.security.executionModeRevision() || generation !== this.dataGeneration) return;
    this.hqCommissionRate.set(rate / 100);
  }

  async keepPlatformCommissionComingSoon(): Promise<void> {
    const modeRevision = this.security.executionModeRevision();
    const generation = this.dataGeneration;
    if (!this.isSimulation()) {
      await firstValueFrom(this.http.post<{ platformDeliveryCommissionStatus: 'coming_soon' }>(
        '/api/hq/system/platform-delivery-commission',
        { status: 'coming_soon' }
      ));
    }
    if (modeRevision !== this.security.executionModeRevision() || generation !== this.dataGeneration) return;

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
    const modeRevision = this.security.executionModeRevision();
    const generation = this.dataGeneration;
    const data = await firstValueFrom(this.http.get<{ maintenanceMode: boolean; globalBroadcastMessage: string | null }>('/api/hq/public-status'));
    if (modeRevision !== this.security.executionModeRevision() || generation !== this.dataGeneration) return;
    this.maintenanceMode.set(data.maintenanceMode);
    this.globalBroadcastMessage.set(data.globalBroadcastMessage);
  }

  async logAudit(action: string, module: AuditLog['module'], details: string, severity: AuditLog['severity'] = 'info'): Promise<void> {
    // Real audit records are written by the server with the authorized mutation.
    // Keep client-only entries in the demo context so they cannot look authoritative.
    if (!this.isSimulation()) return;
    this.auditLogs.update(cur => [{
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: 'User',
      action,
      module,
      details,
      severity,
      isSimulated: true,
      mode: 'simulation'
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
        status: 'unverified',
        isSimulated: true,
        mode: 'simulation'
      };
      this.devices.update((cur) => [simulatedDevice, ...cur]);
      return simulatedDevice;
    }

    const modeRevision = this.security.executionModeRevision();
    const generation = this.dataGeneration;
    const data = await firstValueFrom(this.http.post<POSDevice>('/api/hq/devices', device));
    if (modeRevision !== this.security.executionModeRevision() || generation !== this.dataGeneration) return data;
    this.devices.update(cur => [...cur, data]);
    return data;
  }

  async runAudit(): Promise<SystemAuditReport> {
    if (this.isSimulation()) throw new Error('A varredura estrutural requer acesso ao servidor e não está disponível no modo de simulação.');
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    const report = await firstValueFrom(this.http.post<SystemAuditReport>('/api/hq/audit/run', {}));
    if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) {
      throw new Error('O ambiente mudou durante a varredura. O resultado não foi aplicado à tela atual.');
    }
    return report;
  }

  async fetchDevices(tenantId?: string): Promise<POSDevice[]> {
    if (this.isSimulation()) {
      this.devicesStatus.set('loaded');
      return this.devices();
    }
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    this.devicesStatus.set('loading');
    try {
      const url = tenantId ? `/api/hq/devices?tenantId=${encodeURIComponent(tenantId)}` : '/api/hq/devices';
      const data = await firstValueFrom(this.http.get<POSDevice[]>(url));
      if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return this.devices();
      if (!Array.isArray(data)) throw new Error('Invalid device inventory response.');
      this.devices.set(data);
      this.devicesStatus.set('loaded');
      return data;
    } catch {
      if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return this.devices();
      this.devicesStatus.set('error');
      return [];
    }
  }

  async fetchAuditLogs(): Promise<AuditLog[]> {
    if (this.isSimulation()) return this.auditLogs();
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    try {
      const data = await firstValueFrom(this.http.get<AuditLog[]>('/api/hq/audit'));
      if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return this.auditLogs();
      if (data && Array.isArray(data)) this.auditLogs.set(data);
      return data || [];
    } catch {
      return generation === this.dataGeneration && modeRevision === this.security.executionModeRevision()
        ? []
        : this.auditLogs();
    }
  }

  async restartDevice(deviceId: string): Promise<void> {
    if (this.isSimulation()) return;
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    await firstValueFrom(this.http.post(`/api/hq/devices/${deviceId}/restart`, {}));
    if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return;
    await this.fetchDevices();
  }

  async lockDevice(deviceId: string): Promise<void> {
    if (this.isSimulation()) {
      this.devices.update((cur) => cur.map((device) => device.id === deviceId
        ? { ...device, status: device.status === 'locked' ? 'unverified' : 'locked', isSimulated: true, mode: 'simulation' }
        : device));
      return;
    }
    const generation = this.dataGeneration;
    const modeRevision = this.security.executionModeRevision();
    await firstValueFrom(this.http.post(`/api/hq/devices/${deviceId}/lock`, {}));
    if (generation !== this.dataGeneration || modeRevision !== this.security.executionModeRevision()) return;
    await this.fetchDevices();
  }

}
