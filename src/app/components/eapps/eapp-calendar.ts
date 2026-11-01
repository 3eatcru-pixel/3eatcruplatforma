import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { AppointmentsService } from '../../services/appointments.service';
import { Appointment } from '../../models/ecosystem.model';

function localDateInputValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <header class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center"><mat-icon>calendar_month</mat-icon></div><div><h2 class="text-sm font-serif font-black text-white">Calendário da unidade</h2><p class="text-[10px] text-stone-400">Reservas da agenda operacional, somente leitura.</p></div></div>
        <div class="flex items-center gap-2"><input type="date" aria-label="Data das reservas" [ngModel]="selectedDate()" (ngModelChange)="selectedDate.set($event)" class="rounded-lg border border-[#593017] bg-[#100803] px-3 py-2 text-xs text-white" /><button type="button" (click)="refresh()" [disabled]="isLoading()" aria-label="Atualizar calendário" class="px-3 py-2 border border-[#593017] rounded-xl disabled:opacity-50"><mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon></button></div>
      </header>
      @if (!canView()) { <div class="flex-1 flex items-center justify-center text-center text-amber-300">O calendário está disponível para a equipe da unidade.</div> }
      @else if (isLoading()) { <div class="flex-1 flex items-center justify-center text-sm text-stone-400">Carregando agenda…</div> }
      @else if (loadError()) { <div role="alert" class="flex-1 flex flex-col items-center justify-center gap-2 text-center text-rose-300"><p>{{ loadError() }}</p><button type="button" (click)="refresh()" class="underline">Tentar novamente</button></div> }
      @else if (events().length === 0) { <div class="flex-1 flex items-center justify-center text-center text-sm text-stone-500">Nenhuma reserva para esta data.</div> }
      @else { <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5">@for (event of events(); track event.id) { <article class="bg-[#1c0d06] border border-[#381c0c] p-3 rounded-2xl flex items-center justify-between gap-3"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-xl bg-[#261207] text-amber-400 flex flex-col items-center justify-center border border-[#482814]"><span class="text-[9px] uppercase font-bold">{{ event.date | date:'EEE' }}</span><span class="text-xs font-black">{{ event.time }}</span></div><div><strong class="text-white text-xs block">{{ event.customerName }}</strong><span class="text-[10px] text-stone-400">{{ event.partySize || '—' }} pessoas · {{ event.tableNumber ? 'Mesa ' + event.tableNumber : event.zonePreference || 'Sem mesa atribuída' }}</span></div></div><span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">{{ statusLabel(event.status) }}</span></article> }</div> }
    </div>
  `
})
export class EAppCalendarWindow {
  private readonly ecosystem = inject(EcosystemService);
  private readonly appointmentsService = inject(AppointmentsService);
  readonly selectedDate = signal(localDateInputValue());
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly canView = computed(() => ['tenant_owner', 'operator', 'waiter'].includes(this.ecosystem.currentSession()?.role || ''));
  readonly events = computed(() => this.appointmentsService.appointments().filter((item) => item.date === this.selectedDate()));
  private generation = 0;

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const date = this.selectedDate();
      const allowed = this.canView();
      const generation = ++this.generation;
      this.appointmentsService.appointments.set([]);
      if (!tenantId || !allowed) { this.isLoading.set(false); return; }
      void this.load(tenantId, date, generation);
    });
  }

  async refresh(): Promise<void> {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId || !this.canView()) return;
    await this.load(tenantId, this.selectedDate(), ++this.generation);
  }

  statusLabel(status: Appointment['status']): string {
    const labels: Record<Appointment['status'], string> = { pending: 'Pendente', confirmed: 'Confirmada', seated: 'Em atendimento', cancelled: 'Cancelada', completed: 'Concluída', no_show: 'Não compareceu' };
    return labels[status];
  }

  private async load(tenantId: string, date: string, generation: number): Promise<void> {
    this.isLoading.set(true); this.loadError.set(null);
    try { await this.appointmentsService.fetchAppointments(tenantId, date); }
    catch { if (generation === this.generation) this.loadError.set('Não foi possível carregar a agenda desta unidade.'); }
    finally { if (generation === this.generation) this.isLoading.set(false); }
  }
}
