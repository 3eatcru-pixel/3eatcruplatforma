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
    const url = tenantId ? `/api/hr/employees?tenantId=${tenantId}` : '/api/hr/employees';
    const data = await firstValueFrom(this.http.get<Employee[]>(url));
    this.employees.set(data);
    return data;
  }

  async addEmployee(employee: Partial<Employee>): Promise<Employee> {
    const data = await firstValueFrom(this.http.post<Employee>('/api/hr/employees', employee));
    this.employees.update(cur => [...cur, data]);
    return data;
  }

  async deleteEmployee(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/hr/employees/${id}`));
    this.employees.update(cur => cur.filter(e => e.id !== id));
  }

  async toggleClock(employeeId: string): Promise<void> {
    const data = await firstValueFrom(this.http.post<ClockEvent>(`/api/hr/employees/${employeeId}/clock`, {}));
    this.clockEvents.update(cur => [data, ...cur]);
  }
}
