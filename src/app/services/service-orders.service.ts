import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ServiceOrder } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceOrdersService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  
  readonly serviceOrders = signal<ServiceOrder[]>([]);
  private lastTenantId = this.security.currentSession()?.tenantId;
  private lastModeRevision = this.security.executionModeRevision();
  private lastSimulation = this.security.isSimulated();
  private contextGeneration = 0;

  constructor() {
    effect(() => this.syncContext());
  }

  async fetchServiceOrders(tenantId?: string): Promise<ServiceOrder[]> {
    this.syncContext();
    const activeTenantId = this.resolveTenant(tenantId);
    if (this.security.isSimulated()) return this.serviceOrders().filter((order) => order.tenantId === activeTenantId);
    const context = this.captureContext(activeTenantId);
    const url = `/api/service-orders?tenantId=${encodeURIComponent(activeTenantId)}`;
    const data = await firstValueFrom(this.http.get<ServiceOrder[]>(url));
    if (!this.isCurrentContext(context)) return this.serviceOrders();
    const scoped = Array.isArray(data) ? data.filter((order) => order.tenantId === activeTenantId) : [];
    this.serviceOrders.set(scoped);
    return scoped;
  }

  async addServiceOrder(so: Partial<ServiceOrder>): Promise<ServiceOrder> {
    this.syncContext();
    const tenantId = this.resolveTenant(so.tenantId);
    const customerName = so.customerName?.trim().slice(0, 100) || '';
    const description = so.description?.trim().slice(0, 1000) || '';
    if (!customerName || !description) throw new Error('Nome do cliente e descrição do serviço são obrigatórios.');
    const now = new Date().toISOString();
    if (this.security.isSimulated()) {
      const simulated: ServiceOrder = {
        ...so,
        id: so.id || `sim-so-${Date.now()}`,
        tenantId,
        osNumber: so.osNumber || `SIM-${now.slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        customerName,
        description,
        equipment: so.equipment?.trim().slice(0, 120) || undefined,
        priority: so.priority || 'medium',
        progressPercent: 0,
        status: 'open',
        createdAt: now,
        isSimulated: true,
        mode: 'simulation'
      };
      this.serviceOrders.update((current) => [simulated, ...current]);
      return simulated;
    }
    const context = this.captureContext(tenantId);
    const data = await firstValueFrom(this.http.post<ServiceOrder>('/api/service-orders', { ...so, tenantId, customerName, description }));
    this.assertCurrentContext(context);
    this.serviceOrders.update(cur => [...cur, data]);
    return data;
  }

  async updateStatus(id: string, status: ServiceOrder['status'], progress?: number): Promise<void> {
    this.syncContext();
    const tenantId = this.security.currentSession()?.tenantId;
    const current = this.serviceOrders().find((order) => order.id === id && order.tenantId === tenantId);
    if (this.security.isSimulated()) {
      if (!current || !ALLOWED_TRANSITIONS[current.status]?.includes(status)) {
        throw new Error('Transição de status inválida para esta ordem simulada.');
      }
      const now = new Date().toISOString();
      const progressPercent = status === 'ready' || status === 'delivered' || status === 'finalizado'
        ? 100
        : status === 'in_progress' || status === 'execucao'
          ? Math.max(1, Math.min(99, Number(progress) || 25))
          : current.progressPercent || 0;
      this.serviceOrders.update((orders) => orders.map((order) => order.id === id && order.tenantId === tenantId
        ? {
            ...order,
            status,
            progressPercent,
            updatedAt: now,
            ...(['delivered', 'finalizado'].includes(status) ? { finishedAt: now } : {}),
            isSimulated: true,
            mode: 'simulation'
          }
        : order));
      return;
    }
    if (!tenantId || !current) throw new Error('Ordem de serviço não encontrada nesta unidade.');
    const context = this.captureContext(tenantId);
    const updated = await firstValueFrom(this.http.patch<ServiceOrder>(`/api/service-orders/${encodeURIComponent(id)}/status`, { status, progress }));
    this.assertCurrentContext(context);
    this.serviceOrders.update(cur => cur.map(s => s.id === id ? updated : s));
  }

  private resolveTenant(requestedTenantId?: string): string {
    const activeTenantId = this.security.currentSession()?.tenantId;
    const role = this.security.currentSession()?.role;
    if (!activeTenantId || !['tenant_owner', 'operator'].includes(role || '') || (requestedTenantId && requestedTenantId !== activeTenantId)) {
      throw new Error('A unidade solicitada não corresponde à sessão ativa.');
    }
    return activeTenantId;
  }

  private captureContext(tenantId?: string) {
    return { generation: this.contextGeneration, modeRevision: this.security.executionModeRevision(), tenantId };
  }

  private isCurrentContext(context: { generation: number; modeRevision: number; tenantId?: string }): boolean {
    this.syncContext();
    return !this.security.isSimulated() && context.generation === this.contextGeneration &&
      context.modeRevision === this.security.executionModeRevision() &&
      context.tenantId === this.security.currentSession()?.tenantId;
  }

  private assertCurrentContext(context: { generation: number; modeRevision: number; tenantId?: string }) {
    if (!this.isCurrentContext(context)) throw new Error('O contexto mudou durante a operação da ordem de serviço. Confira o modo real antes de tentar novamente.');
  }

  private syncContext() {
    const tenantId = this.security.currentSession()?.tenantId;
    const modeRevision = this.security.executionModeRevision();
    const simulation = this.security.isSimulated();
    if (tenantId === this.lastTenantId && modeRevision === this.lastModeRevision && simulation === this.lastSimulation) return;
    this.lastTenantId = tenantId;
    this.lastModeRevision = modeRevision;
    this.lastSimulation = simulation;
    this.contextGeneration += 1;
    this.serviceOrders.set([]);
  }
}

const ALLOWED_TRANSITIONS: Partial<Record<ServiceOrder['status'], ServiceOrder['status'][]>> = {
  draft: ['open'],
  open: ['in_progress', 'parts_pending', 'triagem'],
  parts_pending: ['in_progress'],
  in_progress: ['parts_pending', 'ready'],
  ready: ['delivered'],
  triagem: ['execucao'],
  execucao: ['finalizado']
};
