import { Injectable, signal, inject, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Appointment } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';
import { TablesService } from './tables.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  private readonly tablesService = inject(TablesService);

  readonly appointments = signal<Appointment[]>([]);
  readonly isSimulation = computed(() => this.security.isSimulated());
  private lastModeIsSimulation = this.security.isSimulated();
  private lastTenantId = this.security.currentSession()?.tenantId;
  private lastModeRevision = this.security.executionModeRevision();
  private latestFetchId = 0;
  private modeGeneration = 0;

  constructor() {
    effect(() => this.syncExecutionMode());
  }

  async fetchAppointments(tenantId?: string, date?: string): Promise<Appointment[]> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = tenantId || this.security.currentSession()?.tenantId;
      return this.appointments().filter((appointment) =>
        (!activeTenantId || appointment.tenantId === activeTenantId) && (!date || appointment.date === date)
      );
    }

    const fetchId = ++this.latestFetchId;
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', tenantId);
    if (date) params.set('date', date);
    const qs = params.toString();
    const url = qs ? `/api/reservations?${qs}` : '/api/reservations';
    const data = await firstValueFrom(this.http.get<Appointment[]>(url));
    this.syncExecutionMode();
    if (fetchId !== this.latestFetchId || this.lastModeIsSimulation) return this.appointments();
    this.appointments.set(Array.isArray(data) ? data : []);
    return this.appointments();
  }

  async addAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      return this.saveSimulationAppointment(appointment, {
        status: appointment.status || 'pending',
        channel: appointment.channel || 'pos'
      });
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<Appointment>('/api/reservations', appointment)
    );
    this.assertRealMode(generation);
    this.appointments.update((cur) => {
      const filtered = cur.filter((a) => a.id !== data.id);
      return [...filtered, data];
    });
    return data;
  }

  async createPublicReservation(payload: Partial<Appointment>): Promise<Appointment> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      return this.saveSimulationAppointment(payload, { status: 'pending', channel: 'storefront' });
    }

    const generation = this.modeGeneration;
    const data = await firstValueFrom(
      this.http.post<Appointment>('/api/reservations/public', payload)
    );
    this.assertRealMode(generation);
    this.appointments.update((cur) => [...cur.filter((a) => a.id !== data.id), data]);
    return data;
  }

  async updateStatus(
    id: string,
    status: Appointment['status'],
    tableId?: string
  ): Promise<Appointment> {
    this.syncExecutionMode();
    if (this.lastModeIsSimulation) {
      const activeTenantId = this.security.currentSession()?.tenantId;
      const appointment = this.appointments().find((item) =>
        item.id === id && (!activeTenantId || item.tenantId === activeTenantId)
      );
      if (!appointment) throw new Error('Simulated appointment not found');

      const generation = this.modeGeneration;
      const modeRevision = this.security.executionModeRevision();
      const table = await this.applySimulationTableStatus(appointment, status, tableId);
      this.assertSimulationContext(generation, activeTenantId, modeRevision);
      const updated: Appointment = {
        ...appointment,
        status,
        ...(tableId !== undefined ? { tableId } : {}),
        ...(table ? { tableNumber: table.number } : {}),
        isSimulated: true,
        mode: 'simulation'
      };
      this.appointments.update((items) => items.map((item) => item.id === id ? updated : item));
      return updated;
    }

    const generation = this.modeGeneration;
    const body: { status: Appointment['status']; tableId?: string } = { status };
    if (tableId !== undefined) {
      body.tableId = tableId;
    }
    const updated = await firstValueFrom(
      this.http.patch<Appointment>(`/api/reservations/${id}/status`, body)
    );
    this.assertRealMode(generation);
    this.appointments.update((cur) =>
      cur.map((a) => (a.id === id ? { ...a, ...updated, status } : a))
    );
    return updated;
  }

  private async saveSimulationAppointment(
    appointment: Partial<Appointment>,
    defaults: Pick<Appointment, 'status' | 'channel'>
  ): Promise<Appointment> {
    const generation = this.modeGeneration;
    const tenantId = this.security.currentSession()?.tenantId;
    const modeRevision = this.security.executionModeRevision();
    const candidate: Appointment = {
      ...appointment,
      id: appointment.id || `sim-res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: tenantId || appointment.tenantId,
      customerName: appointment.customerName || 'Cliente simulado',
      date: appointment.date || new Date().toISOString().slice(0, 10),
      time: appointment.time || new Date().toTimeString().slice(0, 5),
      status: defaults.status,
      channel: defaults.channel,
      createdAt: new Date().toISOString(),
      isSimulated: true,
      mode: 'simulation'
    };
    const table = await this.applySimulationTableStatus(candidate, defaults.status);
    this.assertSimulationContext(generation, tenantId, modeRevision);
    const simulated: Appointment = {
      ...candidate,
      ...(table ? { tableNumber: table.number } : {}),
      isSimulated: true,
      mode: 'simulation'
    };
    this.appointments.update((items) => [
      ...items.filter((item) => item.id !== simulated.id),
      simulated
    ]);
    return simulated;
  }

  private async applySimulationTableStatus(
    appointment: Appointment,
    status: Appointment['status'],
    explicitTableId?: string
  ) {
    const tableId = explicitTableId || appointment.tableId;
    if (!tableId) return undefined;

    const table = this.tablesService.tables().find((item) => item.id === tableId);
    if (!table) {
      if (explicitTableId) throw new Error('Simulated table not found');
      return undefined;
    }
    if (table.tenantId !== appointment.tenantId) {
      throw new Error('Simulated table belongs to another tenant');
    }
    if (
      (status === 'confirmed' || status === 'seated') &&
      (table.status === 'occupied' || table.status === 'billing')
    ) {
      throw new Error('Simulated table is occupied');
    }

    if (status === 'seated') {
      await this.tablesService.updateTable(tableId, {
        status: 'occupied',
        guests: appointment.partySize || 2
      });
    } else if (status === 'confirmed' && table.status === 'available') {
      await this.tablesService.updateTable(tableId, {
        status: 'reserved',
        guests: appointment.partySize || 2
      });
    } else if ((status === 'cancelled' || status === 'no_show') && table.status === 'reserved') {
      await this.tablesService.updateTable(tableId, { status: 'available', guests: 0 });
    }
    return table;
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
    this.latestFetchId += 1;
    this.appointments.set([]);
  }

  private assertRealMode(generation: number) {
    this.syncExecutionMode();
    if (generation !== this.modeGeneration || this.lastModeIsSimulation) {
      throw new Error('Execution mode changed while saving reservation.');
    }
  }

  private assertSimulationContext(generation: number, tenantId: string | undefined, modeRevision: number) {
    this.syncExecutionMode();
    if (
      !this.lastModeIsSimulation ||
      generation !== this.modeGeneration ||
      tenantId !== this.security.currentSession()?.tenantId ||
      modeRevision !== this.security.executionModeRevision()
    ) {
      throw new Error('Execution context changed while saving simulated reservation.');
    }
  }
}

