import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MemoNote } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private readonly http = inject(HttpClient);
  private readonly security = inject(SecurityService);
  
  readonly notes = signal<MemoNote[]>([]);
  private lastTenantId = this.security.currentSession()?.tenantId;
  private lastModeRevision = this.security.executionModeRevision();
  private lastSimulation = this.security.isSimulated();
  private contextGeneration = 0;

  constructor() {
    effect(() => this.syncContext());
  }

  async fetchNotes(tenantId?: string): Promise<MemoNote[]> {
    this.syncContext();
    const activeTenantId = this.resolveTenant(tenantId);
    if (this.security.isSimulated()) {
      const uid = this.security.currentSession()?.id;
      return this.notes().filter((note) => note.tenantId === activeTenantId && (!uid || note.createdByUid === uid));
    }
    const context = this.captureContext(activeTenantId);
    const url = `/api/notes?tenantId=${encodeURIComponent(activeTenantId)}`;
    const data = await firstValueFrom(this.http.get<MemoNote[]>(url));
    if (!this.isCurrentContext(context)) return this.notes();
    const scoped = Array.isArray(data) ? data.filter((note) => !note.tenantId || note.tenantId === activeTenantId) : [];
    this.notes.set(scoped);
    return scoped;
  }

  async addNote(note: Partial<MemoNote>): Promise<MemoNote> {
    this.syncContext();
    const tenantId = this.resolveTenant(note.tenantId);
    const title = note.title?.trim().slice(0, 100) || '';
    const content = note.content?.trim().slice(0, 2000) || '';
    if (!title || !content) throw new Error('Título e conteúdo são obrigatórios.');
    const now = new Date().toISOString();
    if (this.security.isSimulated()) {
      const simulated: MemoNote = {
        ...note,
        id: note.id || `sim-note-${Date.now()}`,
        title,
        content,
        tenantId,
        createdByUid: this.security.currentSession()?.id,
        createdAt: now,
        updatedAt: now,
        isSimulated: true,
        mode: 'simulation'
      };
      this.notes.update((current) => [simulated, ...current]);
      return simulated;
    }
    const context = this.captureContext(tenantId);
    const data = await firstValueFrom(this.http.post<MemoNote>('/api/notes', { ...note, title, content, tenantId }));
    this.assertCurrentContext(context);
    this.notes.update(cur => [data, ...cur]);
    return data;
  }

  async deleteNote(id: string): Promise<void> {
    this.syncContext();
    if (this.security.isSimulated()) {
      const tenantId = this.security.currentSession()?.tenantId;
      const uid = this.security.currentSession()?.id;
      const target = this.notes().find((note) => note.id === id && note.tenantId === tenantId && (!uid || note.createdByUid === uid));
      if (!target) throw new Error('Nota não encontrada nesta simulação.');
      this.notes.update((current) => current.filter((note) => note.id !== id));
      return;
    }
    const context = this.captureContext(this.security.currentSession()?.tenantId);
    await firstValueFrom(this.http.delete(`/api/notes/${encodeURIComponent(id)}`));
    this.assertCurrentContext(context);
    this.notes.update(cur => cur.filter(n => n.id !== id));
  }

  private resolveTenant(requestedTenantId?: string): string {
    const activeTenantId = this.security.currentSession()?.tenantId;
    if (!activeTenantId || (requestedTenantId && requestedTenantId !== activeTenantId)) {
      throw new Error('A unidade solicitada não corresponde à sessão ativa.');
    }
    return activeTenantId;
  }

  private captureContext(tenantId?: string) {
    return { generation: this.contextGeneration, modeRevision: this.security.executionModeRevision(), tenantId };
  }

  private isCurrentContext(context: ReturnType<NotesService['captureContext']>): boolean {
    this.syncContext();
    return !this.security.isSimulated() && context.generation === this.contextGeneration &&
      context.modeRevision === this.security.executionModeRevision() &&
      context.tenantId === this.security.currentSession()?.tenantId;
  }

  private assertCurrentContext(context: ReturnType<NotesService['captureContext']>) {
    if (!this.isCurrentContext(context)) throw new Error('O contexto mudou durante a operação de notas. Confira o modo real antes de tentar novamente.');
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
    this.notes.set([]);
  }
}
