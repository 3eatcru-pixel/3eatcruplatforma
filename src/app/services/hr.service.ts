import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Employee, ClockEvent } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class HrService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  
  readonly employees = signal<Employee[]>([]);
  readonly clockEvents = signal<ClockEvent[]>([]);
  private lastTenantId = this.security.currentSession()?.tenantId;
  private lastModeRevision = this.security.executionModeRevision();
  private lastSimulation = this.security.isSimulated();
  private contextGeneration = 0;

  constructor() {
    effect(() => this.syncContext());
  }

  async fetchEmployees(tenantId?: string): Promise<Employee[]> {
    this.syncContext();
    const activeTenantId = this.resolveTenant(tenantId);
    if (this.security.isSimulated()) return this.employees().filter((employee) => employee.tenantId === activeTenantId);
    const context = this.captureContext(activeTenantId);
    const url = `/api/hr/employees?tenantId=${encodeURIComponent(activeTenantId)}`;
    const data = await firstValueFrom(this.http.get<Employee[]>(url));
    if (!this.isCurrentContext(context)) return this.employees();
    const scoped = Array.isArray(data) ? data.filter((employee) => employee.tenantId === activeTenantId) : [];
    this.employees.set(scoped);
    return scoped;
  }

  async fetchClockEvents(tenantId?: string): Promise<ClockEvent[]> {
    this.syncContext();
    const activeTenantId = this.resolveTenant(tenantId);
    if (this.security.isSimulated()) return this.clockEvents().filter((event) => !event.tenantId || event.tenantId === activeTenantId);
    const context = this.captureContext(activeTenantId);
    const url = `/api/hr/clock-events?tenantId=${encodeURIComponent(activeTenantId)}`;
    const data = await firstValueFrom(this.http.get<ClockEvent[]>(url));
    if (!this.isCurrentContext(context)) return this.clockEvents();
    const scoped = Array.isArray(data) ? data.filter((event) => !event.tenantId || event.tenantId === activeTenantId) : [];
    this.clockEvents.set(scoped);
    return scoped;
  }

  async addEmployee(employee: Partial<Employee>): Promise<Employee> {
    this.syncContext();
    const tenantId = this.resolveTenant(employee.tenantId);
    const name = employee.name?.trim().slice(0, 100) || '';
    if (!name || !employee.role || !employee.shift) throw new Error('Nome, função e turno são obrigatórios.');
    if (this.security.isSimulated()) {
      const simulated: Employee = {
        id: `sim-employee-${Date.now()}`,
        tenantId,
        name,
        role: employee.role,
        shift: employee.shift,
        hireDate: employee.hireDate || new Date().toISOString().slice(0, 10),
        status: 'active',
        isSimulated: true,
        mode: 'simulation'
      };
      this.employees.update((current) => [simulated, ...current]);
      return simulated;
    }
    const context = this.captureContext(tenantId);
    const data = await firstValueFrom(this.http.post<Employee>('/api/hr/employees', { ...employee, tenantId, name }));
    this.assertCurrentContext(context);
    this.employees.update(cur => [...cur, data]);
    return data;
  }

  async deleteEmployee(id: string): Promise<void> {
    this.syncContext();
    if (this.security.isSimulated()) {
      this.updateSimulatedEmployee(id, (employee) => ({ ...employee, status: 'fired', isSimulated: true, mode: 'simulation' }));
      return;
    }
    const context = this.captureContext(this.security.currentSession()?.tenantId);
    await firstValueFrom(this.http.delete(`/api/hr/employees/${encodeURIComponent(id)}`));
    this.assertCurrentContext(context);
    this.employees.update(cur => cur.map(e => e.id === id ? { ...e, status: 'fired' } : e));
  }

  async toggleClock(employeeId: string): Promise<void> {
    this.syncContext();
    if (this.security.isSimulated()) {
      const tenantId = this.security.currentSession()?.tenantId;
      const employee = this.employees().find((item) => item.id === employeeId && item.tenantId === tenantId && item.status === 'active');
      if (!employee) throw new Error('Colaborador ativo não encontrado nesta simulação.');
      const latest = this.clockEvents().find((event) => event.employeeId === employeeId);
      const event: ClockEvent = {
        id: `sim-clock-${Date.now()}`,
        tenantId,
        employeeId,
        employeeName: employee.name,
        timestamp: new Date().toISOString(),
        type: latest?.type === 'in' ? 'out' : 'in',
        isSimulated: true,
        mode: 'simulation'
      };
      this.clockEvents.update((current) => [event, ...current]);
      return;
    }
    const context = this.captureContext(this.security.currentSession()?.tenantId);
    const data = await firstValueFrom(this.http.post<ClockEvent>(`/api/hr/employees/${encodeURIComponent(employeeId)}/clock`, {}));
    this.assertCurrentContext(context);
    this.clockEvents.update(cur => [data, ...cur]);
  }

  private updateSimulatedEmployee(id: string, update: (employee: Employee) => Employee) {
    let found = false;
    this.employees.update((current) => current.map((employee) => {
      if (employee.id !== id || employee.tenantId !== this.security.currentSession()?.tenantId) return employee;
      found = true;
      return update(employee);
    }));
    if (!found) throw new Error('Colaborador não encontrado nesta simulação.');
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

  private isCurrentContext(context: ReturnType<HrService['captureContext']>): boolean {
    this.syncContext();
    return !this.security.isSimulated() && context.generation === this.contextGeneration &&
      context.modeRevision === this.security.executionModeRevision() &&
      context.tenantId === this.security.currentSession()?.tenantId;
  }

  private assertCurrentContext(context: ReturnType<HrService['captureContext']>) {
    if (!this.isCurrentContext(context)) throw new Error('O contexto mudou durante a operação de RH. Confira o modo real antes de tentar novamente.');
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
    this.employees.set([]);
    this.clockEvents.set([]);
  }
}
