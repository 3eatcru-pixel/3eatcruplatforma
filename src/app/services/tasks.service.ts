import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StoreTask } from '../models/ecosystem.model';
import { SecurityService } from './security.service';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  readonly tasks = signal<StoreTask[]>([]);
  private lastTenantId = this.security.currentSession()?.tenantId;
  private lastModeRevision = this.security.executionModeRevision();
  private lastSimulation = this.security.isSimulated();
  private contextGeneration = 0;

  constructor() {
    effect(() => this.syncContext());
  }

  async fetchTasks(tenantId: string): Promise<StoreTask[]> {
    this.syncContext();
    const activeTenantId = this.resolveTenant(tenantId);
    if (this.security.isSimulated()) return this.tasks().filter((task) => task.tenantId === activeTenantId);
    const context = this.captureContext(activeTenantId);
    const data = await firstValueFrom(this.http.get<StoreTask[]>(`/api/tasks?tenantId=${encodeURIComponent(activeTenantId)}`));
    if (!this.isCurrentContext(context)) return this.tasks();
    const scoped = Array.isArray(data) ? data.filter((task) => task.tenantId === activeTenantId) : [];
    this.tasks.set(scoped);
    return scoped;
  }

  async createTask(tenantId: string, title: string, sector: string): Promise<StoreTask> {
    this.syncContext();
    const activeTenantId = this.resolveTenant(tenantId);
    const cleanTitle = title.trim().slice(0, 160);
    const cleanSector = sector.trim().slice(0, 60);
    if (!cleanTitle || !cleanSector) throw new Error('Título e setor da tarefa são obrigatórios.');
    const now = new Date().toISOString();
    if (this.security.isSimulated()) {
      const simulated: StoreTask = {
        id: `sim-task-${Date.now()}`,
        tenantId: activeTenantId,
        title: cleanTitle,
        sector: cleanSector,
        completed: false,
        createdByUid: this.security.currentSession()?.id || 'simulation',
        createdAt: now,
        updatedAt: now,
        isSimulated: true,
        mode: 'simulation'
      };
      this.tasks.update((current) => [simulated, ...current]);
      return simulated;
    }
    const context = this.captureContext(activeTenantId);
    const data = await firstValueFrom(this.http.post<StoreTask>('/api/tasks', { tenantId: activeTenantId, title: cleanTitle, sector: cleanSector }));
    this.assertCurrentContext(context);
    this.tasks.update((current) => [data, ...current]);
    return data;
  }

  async setCompleted(task: StoreTask, completed: boolean): Promise<void> {
    this.syncContext();
    const activeTenantId = this.resolveTenant(task.tenantId);
    if (this.security.isSimulated()) {
      const now = new Date().toISOString();
      let found = false;
      this.tasks.update((current) => current.map((item) => {
        if (item.id !== task.id || item.tenantId !== activeTenantId) return item;
        found = true;
        return {
          ...item,
          completed,
          updatedAt: now,
          ...(completed ? { completedAt: now } : { completedAt: undefined }),
          isSimulated: true,
          mode: 'simulation'
        };
      }));
      if (!found) throw new Error('Tarefa não encontrada nesta simulação.');
      return;
    }
    const context = this.captureContext(activeTenantId);
    const updated = await firstValueFrom(this.http.patch<StoreTask>(`/api/tasks/${encodeURIComponent(task.id)}/completed`, { completed }));
    this.assertCurrentContext(context);
    this.tasks.update((current) => current.map((item) => item.id === task.id ? updated : item));
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
    if (!this.isCurrentContext(context)) throw new Error('O contexto mudou durante a operação de tarefas. Confira o modo real antes de tentar novamente.');
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
    this.tasks.set([]);
  }
}
