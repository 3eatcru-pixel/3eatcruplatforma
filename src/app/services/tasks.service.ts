import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StoreTask } from '../models/ecosystem.model';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  readonly tasks = signal<StoreTask[]>([]);

  async fetchTasks(tenantId: string): Promise<StoreTask[]> {
    const data = await firstValueFrom(this.http.get<StoreTask[]>(`/api/tasks?tenantId=${encodeURIComponent(tenantId)}`));
    this.tasks.set(data);
    return data;
  }

  async createTask(tenantId: string, title: string, sector: string): Promise<StoreTask> {
    const data = await firstValueFrom(this.http.post<StoreTask>('/api/tasks', { tenantId, title, sector }));
    this.tasks.update((current) => [data, ...current]);
    return data;
  }

  async setCompleted(task: StoreTask, completed: boolean): Promise<void> {
    const updated = await firstValueFrom(this.http.patch<StoreTask>(`/api/tasks/${encodeURIComponent(task.id)}/completed`, { completed }));
    this.tasks.update((current) => current.map((item) => item.id === task.id ? updated : item));
  }
}
