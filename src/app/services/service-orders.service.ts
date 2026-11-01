import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ServiceOrder } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServiceOrdersService {
  private readonly http = inject(HttpClient);
  
  readonly serviceOrders = signal<ServiceOrder[]>([]);

  async fetchServiceOrders(tenantId?: string): Promise<ServiceOrder[]> {
    const url = tenantId ? `/api/service-orders?tenantId=${encodeURIComponent(tenantId)}` : '/api/service-orders';
    const data = await firstValueFrom(this.http.get<ServiceOrder[]>(url));
    this.serviceOrders.set(data);
    return data;
  }

  async addServiceOrder(so: Partial<ServiceOrder>): Promise<ServiceOrder> {
    const data = await firstValueFrom(this.http.post<ServiceOrder>('/api/service-orders', so));
    this.serviceOrders.update(cur => [...cur, data]);
    return data;
  }

  async updateStatus(id: string, status: ServiceOrder['status'], progress?: number): Promise<void> {
    const updated = await firstValueFrom(this.http.patch<ServiceOrder>(`/api/service-orders/${id}/status`, { status, progress }));
    this.serviceOrders.update(cur => cur.map(s => s.id === id ? updated : s));
  }
}
