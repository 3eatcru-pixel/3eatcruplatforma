import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Employee, ClockEvent } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HrService {
  private readonly http = inject(HttpClient);
  
  readonly employees = signal<Employee[]>([]);
  readonly clockEvents = signal<ClockEvent[]>([]);

  async fetchEmployees(tenantId?: string): Promise<Employee[]> {
    const url = tenantId ? `/api/hr/employees?tenantId=${encodeURIComponent(tenantId)}` : '/api/hr/employees';
    const data = await firstValueFrom(this.http.get<Employee[]>(url));
    this.employees.set(data);
    return data;
  }

  async fetchClockEvents(tenantId?: string): Promise<ClockEvent[]> {
    const url = tenantId ? `/api/hr/clock-events?tenantId=${encodeURIComponent(tenantId)}` : '/api/hr/clock-events';
    const data = await firstValueFrom(this.http.get<ClockEvent[]>(url));
    this.clockEvents.set(data);
    return data;
  }

  async addEmployee(employee: Partial<Employee>): Promise<Employee> {
    const data = await firstValueFrom(this.http.post<Employee>('/api/hr/employees', employee));
    this.employees.update(cur => [...cur, data]);
    return data;
  }

  async deleteEmployee(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/hr/employees/${id}`));
    this.employees.update(cur => cur.map(e => e.id === id ? { ...e, status: 'fired' } : e));
  }

  async toggleClock(employeeId: string): Promise<void> {
    const data = await firstValueFrom(this.http.post<ClockEvent>(`/api/hr/employees/${employeeId}/clock`, {}));
    this.clockEvents.update(cur => [data, ...cur]);
  }
}
