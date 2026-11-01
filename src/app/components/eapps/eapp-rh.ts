import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Employee } from '../../models/ecosystem.model';
import { EcosystemService } from '../../services/ecosystem.service';
import { HrService } from '../../services/hr.service';

function localHireDateValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-rh',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center"><mat-icon>badge</mat-icon></div><div><h2 class="text-sm font-serif font-black text-white">Equipe da unidade</h2><p class="text-[10px] text-stone-400">Cadastro operacional e registro manual de entrada/saída. Sem folha de pagamento.</p></div></div>
        <button type="button" (click)="refresh()" [disabled]="isLoading() || !canManage()" aria-label="Atualizar equipe" class="px-3 py-2 border border-[#593017] rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button>
      </header>

      @if (!canManage()) {
        <div class="flex-1 flex items-center justify-center p-8 text-center text-amber-300">O RH está restrito ao proprietário ou operador da unidade.</div>
      } @else {
        @if (isSimulation()) {
          <div class="shrink-0 rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">Modo de simulação: dados de RH reais estão protegidos e esta janela não envia alterações ao servidor.</div>
        } @else {
        <form (ngSubmit)="addEmployee()" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5 bg-[#180b04] border border-[#381c0c] rounded-2xl p-3 shrink-0">
          <input name="name" required maxlength="100" [ngModel]="draftName()" (ngModelChange)="draftName.set($event)" placeholder="Nome do colaborador" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <select name="role" [ngModel]="draftRole()" (ngModelChange)="draftRole.set($event)" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white"><option value="atendente">Atendente</option><option value="caixa">Caixa</option><option value="cozinheiro">Cozinheiro</option><option value="garçom">Garçom</option><option value="entregador">Entregador</option><option value="gerente">Gerente</option></select>
          <select name="shift" [ngModel]="draftShift()" (ngModelChange)="draftShift.set($event)" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white"><option value="integral">Integral</option><option value="manhã">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select>
          <input name="hireDate" type="date" [ngModel]="draftHireDate()" (ngModelChange)="draftHireDate.set($event)" class="rounded-lg bg-[#100803] border border-[#593017] px-3 py-2 text-xs text-white" />
          <button type="submit" [disabled]="isSaving()" class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">{{ isSaving() ? 'Salvando…' : 'Cadastrar' }}</button>
        </form>
        }
        @if (loadError()) { <div role="alert" class="rounded-xl border border-rose-800 bg-rose-950/30 p-3 text-xs text-rose-200">{{ loadError() }} <button type="button" (click)="refresh()" class="ml-2 underline">Tentar novamente</button></div> }
        @if (actionError()) { <div role="alert" class="text-xs text-rose-300">{{ actionError() }}</div> }
        @if (isLoading()) { <div class="flex-1 flex items-center justify-center text-sm text-stone-400">Carregando equipe…</div> }
        @else if (employees().length === 0) { <div class="flex-1 flex items-center justify-center text-center text-sm text-stone-500">Nenhum colaborador cadastrado nesta unidade.</div> }
        @else {
          <div class="flex-1 min-h-0 overflow-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
            <table class="w-full min-w-[760px] text-left text-xs">
              <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0"><tr><th class="p-3">Nome</th><th class="p-3">Função</th><th class="p-3">Turno</th><th class="p-3">Status</th><th class="p-3">Ponto</th><th class="p-3 text-right">Ações</th></tr></thead>
              <tbody class="divide-y divide-[#2a1307]">
                @for (employee of employees(); track employee.id) {
                  <tr class="hover:bg-[#200e05]/60" [class.opacity-50]="employee.status !== 'active'"><td class="p-3 font-bold text-white">{{ employee.name }}</td><td class="p-3 text-stone-300">{{ employee.role }}</td><td class="p-3 text-stone-400">{{ employee.shift }}</td><td class="p-3">{{ employee.status === 'active' ? 'Ativo' : 'Desativado' }}</td><td class="p-3">{{ clockState(employee.id) }}</td><td class="p-3 text-right whitespace-nowrap"><button type="button" (click)="toggleClock(employee)" [disabled]="employee.status !== 'active' || busyEmployeeId() === employee.id" class="rounded-lg border border-emerald-800 px-2 py-1 text-emerald-300 disabled:opacity-40">{{ clockState(employee.id) === 'Entrada registrada' ? 'Registrar saída' : 'Registrar entrada' }}</button><button type="button" (click)="deactivate(employee)" [disabled]="employee.status !== 'active' || busyEmployeeId() === employee.id" class="ml-2 rounded-lg border border-rose-900 px-2 py-1 text-rose-300 disabled:opacity-40">Desativar</button></td></tr>
                }
              </tbody>
            </table>
          </div>
          <section class="shrink-0 max-h-32 overflow-auto rounded-2xl border border-[#381c0c] bg-[#180b04] p-3"><h3 class="mb-2 text-[10px] font-black uppercase tracking-wider text-stone-400">Últimos registros de ponto</h3>@if (clockEvents().length === 0) { <p class="text-xs text-stone-500">Sem registros nesta unidade.</p> } @else { @for (event of clockEvents().slice(0, 20); track event.id) { <div class="flex justify-between gap-3 border-t border-[#2a1307] py-1.5 text-[10px]"><span class="text-stone-300">{{ event.employeeName }} · {{ event.type === 'in' ? 'Entrada' : 'Saída' }}</span><time class="text-stone-500">{{ event.timestamp | date:'dd/MM/yyyy HH:mm' }}</time></div> } }</section>
        }
      }
    </div>
  `
})
export class EAppRhWindow {
  private readonly ecosystem = inject(EcosystemService);
  private readonly hrService = inject(HrService);
  readonly employees = this.hrService.employees;
  readonly clockEvents = this.hrService.clockEvents;
  readonly isSimulation = this.ecosystem.isSimulationMode;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly busyEmployeeId = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly draftName = signal('');
  readonly draftRole = signal<Employee['role']>('atendente');
  readonly draftShift = signal<Employee['shift']>('integral');
  readonly draftHireDate = signal(localHireDateValue());
  readonly canManage = computed(() => ['tenant_owner', 'operator'].includes(this.ecosystem.currentSession()?.role || ''));
  private generation = 0;

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const allowed = this.canManage();
      const simulation = this.isSimulation();
      const generation = ++this.generation;
      if (!tenantId || !allowed || simulation) {
        this.hrService.employees.set([]);
        this.hrService.clockEvents.set([]);
        this.isLoading.set(false);
        return;
      }
      void this.load(tenantId, generation);
    });
  }

  async refresh(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canManage() || this.isSimulation()) return;
    await this.load(tenantId, ++this.generation);
  }

  clockState(employeeId: string): string {
    const latest = this.clockEvents().find((event) => event.employeeId === employeeId);
    return latest?.type === 'in' ? 'Entrada registrada' : latest?.type === 'out' ? 'Saída registrada' : 'Sem registro';
  }

  async addEmployee(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    const name = this.draftName().trim();
    if (!tenantId || !this.canManage() || !name || this.isSimulation()) return;
    this.isSaving.set(true);
    this.actionError.set(null);
    try {
      await this.hrService.addEmployee({ tenantId, name, role: this.draftRole(), shift: this.draftShift(), hireDate: this.draftHireDate() });
      this.draftName.set('');
    } catch {
      this.actionError.set('Não foi possível cadastrar o colaborador.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async toggleClock(employee: Employee): Promise<void> {
    if (this.isSimulation()) return;
    this.busyEmployeeId.set(employee.id);
    this.actionError.set(null);
    try {
      await this.hrService.toggleClock(employee.id);
    } catch {
      this.actionError.set('Não foi possível registrar o ponto.');
    } finally {
      this.busyEmployeeId.set(null);
    }
  }

  async deactivate(employee: Employee): Promise<void> {
    if (this.isSimulation()) return;
    this.busyEmployeeId.set(employee.id);
    this.actionError.set(null);
    try {
      await this.hrService.deleteEmployee(employee.id);
    } catch {
      this.actionError.set('Não foi possível desativar o colaborador.');
    } finally {
      this.busyEmployeeId.set(null);
    }
  }

  private async load(tenantId: string, generation: number): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      await Promise.all([this.hrService.fetchEmployees(tenantId), this.hrService.fetchClockEvents(tenantId)]);
    } catch {
      if (generation === this.generation) this.loadError.set('Não foi possível carregar os dados de RH desta unidade.');
    } finally {
      if (generation === this.generation) this.isLoading.set(false);
    }
  }
}
