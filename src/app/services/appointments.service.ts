import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Appointment } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  private readonly http = inject(HttpClient);

  readonly appointments = signal<Appointment[]>([]);

  async fetchAppointments(tenantId?: string, date?: string): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', tenantId);
    if (date) params.set('date', date);
    const qs = params.toString();
    const url = qs ? `/api/reservations?${qs}` : '/api/reservations';
    const data = await firstValueFrom(this.http.get<Appointment[]>(url));
    this.appointments.set(Array.isArray(data) ? data : []);
    return this.appointments();
  }

  async addAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    const data = await firstValueFrom(
      this.http.post<Appointment>('/api/reservations', appointment)
    );
    this.appointments.update((cur) => {
      const filtered = cur.filter((a) => a.id !== data.id);
      return [...filtered, data];
    });
    return data;
  }

  async createPublicReservation(payload: Partial<Appointment>): Promise<Appointment> {
    const data = await firstValueFrom(
      this.http.post<Appointment>('/api/reservations/public', payload)
    );
    this.appointments.update((cur) => [...cur.filter((a) => a.id !== data.id), data]);
    return data;
  }

  async updateStatus(
    id: string,
    status: Appointment['status'],
    tableId?: string
  ): Promise<Appointment> {
    const body: { status: Appointment['status']; tableId?: string } = { status };
    if (tableId !== undefined) {
      body.tableId = tableId;
    }
    const updated = await firstValueFrom(
      this.http.patch<Appointment>(`/api/reservations/${id}/status`, body)
    );
    this.appointments.update((cur) =>
      cur.map((a) => (a.id === id ? { ...a, ...updated, status } : a))
    );
    return updated;
  }
}

