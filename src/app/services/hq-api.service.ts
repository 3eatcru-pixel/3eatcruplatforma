import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CompanyTenant, POSDevice, AuditLog, SystemAuditReport, LicensePlan, RegionalMarketplaceConfig, StoreDriver, ConsumerAccount } from '../models/ecosystem.model';

export interface HqOverviewResponse {
  tenantsCount: number;
  activeTenantsCount: number;
  totalDevices: number;
  onlineDevices: number;
  totalOrders: number;
  grossPlatformVolume: number;
  hqCommissionRevenue: number;
  defaultCommissionPercent: number;
  maintenanceMode: boolean;
  globalBroadcastMessage: string | null;
  serverUptimeSeconds: number;
  timestamp: string;
}

export interface HqLedgerEntry {
  orderId: string;
  orderNumber: string;
  tenantId: string;
  channel: string;
  date: string;
  orderTotal: number;
  platformFeeRate: string;
  platformFeeAmount: number;
  storeNetAmount: number;
}

export interface HqLedgerResponse {
  totalPlatformFees: number;
  platformSplitPercent: number;
  recordsCount: number;
  entries: HqLedgerEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class HqApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  // 1. Overview & SaaS Metrics
  async getOverview(): Promise<HqOverviewResponse> {
    try {
      const res = await firstValueFrom(this.http.get<HqOverviewResponse>(`${this.baseUrl}/hq/overview`));
      return res;
    } catch {
      return {
        tenantsCount: 0,
        activeTenantsCount: 0,
        totalDevices: 0,
        onlineDevices: 0,
        totalOrders: 0,
        grossPlatformVolume: 0,
        hqCommissionRevenue: 0,
        defaultCommissionPercent: 8,
        maintenanceMode: false,
        globalBroadcastMessage: null,
        serverUptimeSeconds: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 2. MDM Devices Fleet
  async getDevices(tenantId?: string): Promise<POSDevice[]> {
    const url = tenantId && tenantId !== 'all'
      ? `${this.baseUrl}/hq/devices?tenantId=${encodeURIComponent(tenantId)}`
      : `${this.baseUrl}/hq/devices`;
    return firstValueFrom(this.http.get<POSDevice[]>(url));
  }

  async pairDevice(device: {
    tenantId: string;
    deviceName: string;
    serialNumber: string;
    type?: string;
    location?: string;
    ipAddress?: string;
    macAddress?: string;
  }): Promise<POSDevice> {
    return firstValueFrom(this.http.post<POSDevice>(`${this.baseUrl}/hq/devices`, device));
  }

  async lockDevice(deviceId: string): Promise<POSDevice> {
    return firstValueFrom(this.http.post<POSDevice>(`${this.baseUrl}/hq/devices/${deviceId}/lock`, {}));
  }

  async restartDevice(deviceId: string): Promise<{ message: string; status: string }> {
    return firstValueFrom(this.http.post<{ message: string; status: string }>(`${this.baseUrl}/hq/devices/${deviceId}/restart`, {}));
  }

  // 3. Audit Trail & Verification
  async getAuditLogs(severity?: string): Promise<AuditLog[]> {
    const url = severity
      ? `${this.baseUrl}/hq/audit?severity=${encodeURIComponent(severity)}`
      : `${this.baseUrl}/hq/audit`;
    return firstValueFrom(this.http.get<AuditLog[]>(url));
  }

  async runAudit(): Promise<SystemAuditReport> {
    return firstValueFrom(this.http.post<SystemAuditReport>(`${this.baseUrl}/hq/audit/run`, {}));
  }

  // 4. System Governance (Broadcast & Maintenance)
  async setBroadcast(message: string | null): Promise<{ globalBroadcastMessage: string | null }> {
    return firstValueFrom(this.http.post<{ globalBroadcastMessage: string | null }>(`${this.baseUrl}/hq/system/broadcast`, { message }));
  }

  async setMaintenance(enabled?: boolean): Promise<{ maintenanceMode: boolean }> {
    return firstValueFrom(this.http.post<{ maintenanceMode: boolean }>(`${this.baseUrl}/hq/system/maintenance`, { enabled }));
  }

  // 5. Consolidated SaaS Ledger (8% split)
  async getLedger(): Promise<HqLedgerResponse> {
    return firstValueFrom(this.http.get<HqLedgerResponse>(`${this.baseUrl}/hq/ledger`));
  }

  // 6. Tenants Governance
  async getTenants(): Promise<CompanyTenant[]> {
    return firstValueFrom(this.http.get<CompanyTenant[]>(`${this.baseUrl}/tenants`));
  }

  async createTenant(tenant: Partial<CompanyTenant>): Promise<CompanyTenant> {
    return firstValueFrom(this.http.post<CompanyTenant>(`${this.baseUrl}/tenants`, tenant));
  }

  async updateTenant(tenantId: string, updates: Partial<CompanyTenant>): Promise<CompanyTenant> {
    return firstValueFrom(this.http.patch<CompanyTenant>(`${this.baseUrl}/tenants/${tenantId}`, updates));
  }

  // 7. SaaS License Plans
  async getPlans(): Promise<LicensePlan[]> {
    return firstValueFrom(this.http.get<LicensePlan[]>(`${this.baseUrl}/hq/plans`));
  }

  async updatePlan(planId: string, updates: Partial<LicensePlan>): Promise<LicensePlan> {
    return firstValueFrom(this.http.patch<LicensePlan>(`${this.baseUrl}/hq/plans/${planId}`, updates));
  }

  // 8. Regional Marketplace Configuration
  async getRegionalConfig(): Promise<RegionalMarketplaceConfig> {
    return firstValueFrom(this.http.get<RegionalMarketplaceConfig>(`${this.baseUrl}/hq/regional`));
  }

  async updateRegionalConfig(config: RegionalMarketplaceConfig): Promise<{ config: RegionalMarketplaceConfig }> {
    return firstValueFrom(this.http.post<{ config: RegionalMarketplaceConfig }>(`${this.baseUrl}/hq/regional`, config));
  }

  // 9. MDM Drivers Telematics
  async getDrivers(): Promise<StoreDriver[]> {
    return firstValueFrom(this.http.get<StoreDriver[]>(`${this.baseUrl}/logistics/drivers`));
  }

  async createDriver(driver: Partial<StoreDriver>): Promise<StoreDriver> {
    return firstValueFrom(this.http.post<StoreDriver>(`${this.baseUrl}/logistics/drivers`, driver));
  }

  async updateDriver(driverId: string, updates: Partial<StoreDriver>): Promise<StoreDriver> {
    return firstValueFrom(this.http.patch<StoreDriver>(`${this.baseUrl}/logistics/drivers/${driverId}`, updates));
  }

  async pingDriverGps(driverId: string, data?: { locationName?: string; batteryLevel?: number }): Promise<StoreDriver> {
    return firstValueFrom(this.http.post<StoreDriver>(`${this.baseUrl}/logistics/drivers/${driverId}/ping`, data || {}));
  }

  // 10. Global CRM Consumers
  async getConsumers(): Promise<ConsumerAccount[]> {
    return firstValueFrom(this.http.get<ConsumerAccount[]>(`${this.baseUrl}/crm/consumers`));
  }

  async saveConsumer(consumer: Partial<ConsumerAccount>): Promise<ConsumerAccount> {
    return firstValueFrom(this.http.post<ConsumerAccount>(`${this.baseUrl}/crm/consumers`, consumer));
  }

  // 11. System Platform Commission
  async setCommissionRate(rate: number): Promise<{ defaultCommissionPercent: number }> {
    return firstValueFrom(this.http.post<{ defaultCommissionPercent: number }>(`${this.baseUrl}/hq/system/commission`, { percent: rate }));
  }
}
