import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { TasksService } from '../../services/tasks.service';
import { StoreTask } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 flex items-center justify-center"><mat-icon>task_alt</mat-icon></div><div><h2 class="text-sm font-serif font-black text-white">Tarefas da unidade</h2><p class="text-[10px] text-stone-400">Checklist operacional simples, persistido por loja. Atribuições individuais ainda não estão disponíveis.</p></div></div>
        <span class="px-2.5 py-1 rounded-xl bg-[#261207] text-amber-400 text-xs font-bold border border-[#482814]">{{ completedCount() }} / {{ tasks().length }} concluídas</span>
      </header>
      @if (!canManage()) { <div class="flex-1 flex items-center justify-center text-center text-amber-300">Tarefas estão restritas ao proprietário ou operador da unidade.</div> }
      @else {
        @if (isSimulation()) { <div class="shrink-0 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">Modo de simulação: tarefas reais estão protegidas; esta janela não envia alterações ao servidor.</div> }
        <form (ngSubmit)="createTask()" class="grid gap-2 sm:grid-cols-[2fr_1fr_auto] bg-[#180b04] border border-[#381c0c] rounded-2xl p-3 shrink-0"><input name="title" required maxlength="160" [ngModel]="draftTitle()" (ngModelChange)="draftTitle.set($event)" placeholder="Descreva a tarefa" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" /><input name="sector" required maxlength="60" [ngModel]="draftSector()" (ngModelChange)="draftSector.set($event)" placeholder="Setor" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" /><button type="submit" [disabled]="isSimulation() || isSaving()" class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">{{ isSaving() ? 'Salvando…' : 'Criar tarefa' }}</button></form>
        @if (error()) { <div role="alert" class="rounded-xl border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200">{{ error() }} <button type="button" (click)="refresh()" class="ml-2 underline">Tentar novamente</button></div> }
        @if (isLoading()) { <div class="flex-1 flex items-center justify-center text-sm text-stone-400">Carregando tarefas…</div> }
        @else if (tasks().length === 0) { <div class="flex-1 flex items-center justify-center text-center text-sm text-stone-500">Nenhuma tarefa cadastrada nesta unidade.</div> }
        @else { <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2">@for (task of tasks(); track task.id) { <button type="button" (click)="toggle(task)" [disabled]="isSimulation() || busyId() === task.id" [class]="task.completed ? 'bg-[#180b04]/60 border-[#2a1307] opacity-60' : 'bg-[#1c0d06] border-[#381c0c]'" class="w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 hover:border-amber-600/60 disabled:cursor-wait"><div class="flex items-center gap-2.5"><mat-icon [class]="task.completed ? 'text-emerald-400' : 'text-stone-600'">{{ task.completed ? 'check_box' : 'check_box_outline_blank' }}</mat-icon><div><span [class]="task.completed ? 'line-through text-stone-500' : 'text-white font-bold'" class="text-xs block">{{ task.title }}</span><span class="text-[9px] text-amber-500/80 uppercase">{{ task.sector }} · {{ task.createdAt | date:'dd/MM HH:mm' }}</span></div></div><span class="text-[10px] text-stone-500">{{ task.completed ? 'Concluída' : 'Pendente' }}</span></button> }</div> }
        @if (actionError()) { <div role="alert" class="text-xs text-rose-300">{{ actionError() }}</div> }
      }
    </div>
  `
})
export class EAppTasksWindow {
  private readonly ecosystem = inject(EcosystemService);
  private readonly tasksService = inject(TasksService);
  readonly tasks = this.tasksService.tasks;
  readonly isSimulation = this.ecosystem.isSimulationMode;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly draftTitle = signal('');
  readonly draftSector = signal('');
  readonly canManage = computed(() => ['tenant_owner', 'operator'].includes(this.ecosystem.currentSession()?.role || ''));
  readonly completedCount = computed(() => this.tasks().filter((task) => task.completed).length);
  private generation = 0;

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canManage();
      const simulation = this.isSimulation();
      const generation = ++this.generation;
      this.tasksService.tasks.set([]);
      if (!tenantId || !allowed || simulation) { this.isLoading.set(false); return; }
      void this.load(tenantId, generation);
    });
  }

  async refresh(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (tenantId && this.canManage() && !this.isSimulation()) await this.load(tenantId, ++this.generation);
  }

  async createTask(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    const title = this.draftTitle().trim(); const sector = this.draftSector().trim();
    if (!tenantId || !this.canManage() || !title || !sector || this.isSimulation()) return;
    this.isSaving.set(true); this.actionError.set(null);
    try { await this.tasksService.createTask(tenantId, title, sector); this.draftTitle.set(''); }
    catch { this.actionError.set('Não foi possível criar a tarefa.'); }
    finally { this.isSaving.set(false); }
  }

  async toggle(task: StoreTask): Promise<void> {
    if (this.isSimulation()) return;
    this.busyId.set(task.id); this.actionError.set(null);
    try { await this.tasksService.setCompleted(task, !task.completed); }
    catch { this.actionError.set('Não foi possível atualizar a tarefa.'); }
    finally { this.busyId.set(null); }
  }

  private async load(tenantId: string, generation: number): Promise<void> {
    this.isLoading.set(true); this.error.set(null);
    try { await this.tasksService.fetchTasks(tenantId); }
    catch { if (generation === this.generation) this.error.set('Não foi possível carregar as tarefas desta unidade.'); }
    finally { if (generation === this.generation) this.isLoading.set(false); }
  }
}
