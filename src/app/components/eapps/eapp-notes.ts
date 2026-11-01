import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { NotesService } from '../../services/notes.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center"><mat-icon>description</mat-icon></div>
          <div><h2 class="text-sm font-serif font-black text-white">Notas da unidade</h2><p class="text-[10px] text-stone-400">Notas privadas da sua conta, com filtro pela unidade ativa.</p></div>
        </div>
        <button type="button" (click)="refresh()" [disabled]="isLoading()" aria-label="Atualizar notas" class="px-3 py-2 border border-[#593017] rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button>
      </header>

      @if (canUseNotes() && isSimulation()) {
        <div class="shrink-0 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">Modo de simulação: notas reais estão protegidas e esta janela não envia alterações ao servidor.</div>
      } @else if (canUseNotes()) {
        <form (ngSubmit)="addNote()" class="grid gap-2 sm:grid-cols-[1fr_2fr_auto] bg-[#180b04] border border-[#381c0c] rounded-2xl p-3 shrink-0">
          <input name="title" required maxlength="100" [ngModel]="draftTitle()" (ngModelChange)="draftTitle.set($event)" placeholder="Título" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <textarea name="content" required maxlength="2000" [ngModel]="draftContent()" (ngModelChange)="draftContent.set($event)" placeholder="Anotação operacional" rows="2" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white resize-y"></textarea>
          <button type="submit" [disabled]="isSaving()" class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">{{ isSaving() ? 'Salvando…' : 'Salvar nota' }}</button>
        </form>
      }

      @if (loadError()) {
        <div role="alert" class="rounded-xl border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200">{{ loadError() }} <button type="button" (click)="refresh()" class="ml-2 underline">Tentar novamente</button></div>
      }
      @if (actionError()) { <div role="alert" class="text-xs text-rose-300">{{ actionError() }}</div> }
      @if (!canUseNotes()) {
        <div class="flex-1 flex items-center justify-center text-sm text-amber-300">Entre na conta para consultar suas notas.</div>
      } @else if (isLoading()) {
        <div class="flex-1 flex items-center justify-center text-sm text-stone-400">Carregando notas…</div>
      } @else if (notes().length === 0) {
        <div class="flex-1 flex items-center justify-center text-center text-sm text-stone-500">Nenhuma nota salva nesta unidade.</div>
      } @else {
        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          @for (note of notes(); track note.id) {
            <article class="bg-[#24140a] border border-amber-600/30 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md">
              <div class="space-y-2">
                <div class="flex justify-between items-start gap-2"><strong class="text-xs text-amber-300 font-bold">{{ note.title }}</strong><button type="button" (click)="deleteNote(note.id)" [disabled]="deletingId() === note.id" [attr.aria-label]="'Excluir ' + note.title" class="text-stone-500 hover:text-rose-400 disabled:opacity-50"><mat-icon class="!text-base">delete</mat-icon></button></div>
                <p class="text-xs text-stone-300 whitespace-pre-wrap leading-relaxed">{{ note.content }}</p>
              </div>
              <div class="text-[9px] text-stone-500 border-t border-[#381c0c] pt-2">{{ note.updatedAt || note.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
            </article>
          }
        </div>
      }
    </div>
  `
})
export class EAppNotesWindow {
  private readonly ecosystem = inject(EcosystemService);
  private readonly notesService = inject(NotesService);
  readonly notes = this.notesService.notes;
  readonly isSimulation = this.ecosystem.isSimulationMode;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly draftTitle = signal('');
  readonly draftContent = signal('');
  readonly canUseNotes = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return Boolean(role && role !== 'guest');
  });
  private requestGeneration = 0;

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canUseNotes();
      const simulation = this.isSimulation();
      const generation = ++this.requestGeneration;
      if (!tenantId || !allowed || simulation) {
        this.isLoading.set(false);
        this.loadError.set(null);
        this.notesService.notes.set([]);
        return;
      }
      this.notesService.notes.set([]);
      void this.load(tenantId, generation);
    });
  }

  async refresh(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canUseNotes() || this.isSimulation()) return;
    await this.load(tenantId, ++this.requestGeneration);
  }

  async addNote(): Promise<void> {
    const title = this.draftTitle().trim();
    const content = this.draftContent().trim();
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!title || !content || !tenantId || !this.canUseNotes() || this.isSimulation()) return;
    this.isSaving.set(true);
    this.actionError.set(null);
    try {
      await this.notesService.addNote({ title, content, tenantId, category: 'Geral' });
      this.draftTitle.set('');
      this.draftContent.set('');
    } catch {
      this.actionError.set('Não foi possível salvar a nota.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteNote(id: string): Promise<void> {
    if (this.isSimulation()) return;
    this.deletingId.set(id);
    this.actionError.set(null);
    try {
      await this.notesService.deleteNote(id);
    } catch {
      this.actionError.set('Não foi possível excluir a nota.');
    } finally {
      this.deletingId.set(null);
    }
  }

  private async load(tenantId: string, generation: number): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.notesService.notes.set([]);
    try {
      await this.notesService.fetchNotes(tenantId);
    } catch {
      if (generation === this.requestGeneration) this.loadError.set('Não foi possível carregar as notas desta unidade.');
    } finally {
      if (generation === this.requestGeneration) this.isLoading.set(false);
    }
  }
}
