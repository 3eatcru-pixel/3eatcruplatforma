import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Appointment } from '../../models/ecosystem.model';
import { AppointmentsService } from '../../services/appointments.service';
import { TablesService } from '../../services/tables.service';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono overflow-hidden p-4 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">event_seat</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Reservas • Unidade ativa</h2>
            <p class="text-[10px] text-stone-400">Confirmação e acomodação são persistidas pelo servidor.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[10px] text-stone-400">Data
            <input type="date" name="reservationDateFilter" [ngModel]="selectedDate()" (ngModelChange)="selectedDate.set($event)" class="ml-2 rounded-lg bg-[#100803] border border-[#593017] px-2 py-1.5 text-white" />
          </label>
          <button type="button" (click)="refresh()" [disabled]="isLoading() || !canManageReservations()" aria-label="Atualizar reservas" class="px-2.5 py-2 border border-[#593017] text-stone-300 rounded-xl disabled:opacity-50">
            <mat-icon class="!text-sm !h-4 !w-4">refresh</mat-icon>
          </button>
        </div>
      </div>

      @if (!canManageReservations()) {
        <div class="flex-1 flex items-center justify-center p-8 text-center text-amber-300">A gestão de reservas está restrita ao proprietário ou operador da unidade.</div>
      } @else if (isLoading()) {
        <div class="flex-1 flex items-center justify-center text-stone-400">Carregando reservas…</div>
      } @else if (loadError()) {
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center text-rose-300">
          <p>{{ loadError() }}</p>
          <button type="button" (click)="refresh()" class="font-bold underline">Tentar novamente</button>
        </div>
      } @else {
        <form (ngSubmit)="createReservation()" class="grid grid-cols-1 md:grid-cols-6 gap-2 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
          <label class="text-[10px] text-stone-400 md:col-span-2">Nome
            <input name="customerName" required maxlength="120" [(ngModel)]="newReservation.customerName" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white" />
          </label>
          <label class="text-[10px] text-stone-400">Telefone
            <input name="customerPhone" maxlength="32" [(ngModel)]="newReservation.customerPhone" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white" />
          </label>
          <label class="text-[10px] text-stone-400">Horário
            <input name="reservationTime" type="time" required [(ngModel)]="newReservation.time" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white" />
          </label>
          <label class="text-[10px] text-stone-400">Pessoas
            <input name="partySize" type="number" min="1" max="30" required [(ngModel)]="newReservation.partySize" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white" />
          </label>
          <label class="text-[10px] text-stone-400">Mesa (opcional)
            <select name="reservationTable" [(ngModel)]="newReservation.tableId" class="mt-1 w-full rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white">
              <option value="">Definir depois</option>
              @for (table of availableTables(); track table.id) { <option [value]="table.id">Mesa {{ table.number }} · {{ table.capacity }} lugares</option> }
            </select>
          </label>
          <div class="md:col-span-6 flex flex-wrap items-center justify-between gap-2">
            @if (formError()) { <p class="text-xs text-rose-300">{{ formError() }}</p> }
            <button type="submit" [disabled]="isSaving()" class="ml-auto rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">
              {{ isSaving() ? 'Salvando…' : 'Registrar reserva' }}
            </button>
          </div>
        </form>

        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2">
          @if (reservations().length === 0) {
            <div class="h-full flex flex-col items-center justify-center gap-2 p-8 text-center text-stone-500">
              <mat-icon class="text-4xl">event_available</mat-icon>
              <p class="text-sm font-bold">Nenhuma reserva nesta data</p>
            </div>
          } @else {
            @for (reservation of reservations(); track reservation.id) {
              <article class="bg-[#1c0d06] border border-[#381c0c] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="text-white text-xs">{{ reservation.customerName }}</strong>
                    <span class="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">{{ reservation.partySize || 2 }} pessoas</span>
                    <span class="text-[10px] text-stone-400">Mesa {{ reservation.tableNumber || 'a definir' }}</span>
                    <span [class]="statusClass(reservation.status)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border">{{ statusLabel(reservation.status) }}</span>
                  </div>
                  <p class="text-[10px] text-stone-400">{{ reservation.time }} · {{ reservation.customerPhone || 'Sem telefone informado' }} · {{ reservation.channel || 'loja' }}</p>
                  @if (reservation.notes) { <p class="text-[10px] text-stone-500">{{ reservation.notes }}</p> }
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  @if (reservation.status === 'pending') {
                    <button type="button" (click)="changeStatus(reservation, 'confirmed')" [disabled]="isSaving()" class="rounded-lg bg-emerald-700 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Confirmar</button>
                    <button type="button" (click)="changeStatus(reservation, 'cancelled')" [disabled]="isSaving()" class="rounded-lg bg-rose-950 px-3 py-1.5 text-[10px] font-bold text-rose-200 disabled:opacity-50">Cancelar</button>
                  } @else if (reservation.status === 'confirmed') {
                    <button type="button" (click)="beginSeating(reservation)" [disabled]="isSaving() || availableTablesFor(reservation).length === 0" class="rounded-lg bg-emerald-700 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Acomodar</button>
                    <button type="button" (click)="changeStatus(reservation, 'no_show')" [disabled]="isSaving()" class="rounded-lg bg-stone-800 px-3 py-1.5 text-[10px] font-bold text-stone-200 disabled:opacity-50">Não compareceu</button>
                    <button type="button" (click)="changeStatus(reservation, 'cancelled')" [disabled]="isSaving()" class="rounded-lg bg-rose-950 px-3 py-1.5 text-[10px] font-bold text-rose-200 disabled:opacity-50">Cancelar</button>
                  } @else if (reservation.status === 'seated') {
                    <button type="button" (click)="changeStatus(reservation, 'completed')" [disabled]="isSaving()" class="rounded-lg bg-indigo-700 px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Encerrar reserva</button>
                  }
                </div>
                @if (seatingReservationId() === reservation.id) {
                  <div class="w-full flex flex-wrap items-end gap-2 border-t border-[#381c0c] pt-2">
                    <label class="text-[10px] text-stone-400">Mesa para acomodar
                      <select name="seatTable" [ngModel]="selectedSeatTableId()" (ngModelChange)="selectedSeatTableId.set($event)" class="mt-1 min-w-48 rounded-lg bg-[#100803] border border-[#593017] px-2 py-2 text-white">
                        <option value="">Selecione uma mesa</option>
                        @for (table of availableTablesFor(reservation); track table.id) { <option [value]="table.id">Mesa {{ table.number }} · {{ table.capacity }} lugares</option> }
                      </select>
                    </label>
                    <button type="button" (click)="seatReservation(reservation)" [disabled]="!selectedSeatTableId() || isSaving()" class="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Confirmar acomodação</button>
                    <button type="button" (click)="seatingReservationId.set(null)" class="rounded-lg bg-stone-800 px-3 py-2 text-[10px] font-bold">Fechar</button>
                  </div>
                }
              </article>
            }
          }
        </div>
      }
    </div>
  `
})
export class EAppReservationsWindow {
  private readonly appointmentsService = inject(AppointmentsService);
  private readonly tablesService = inject(TablesService);
  readonly ecosystem = inject(EcosystemService);

  readonly selectedDate = signal(this.localDate());
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly seatingReservationId = signal<string | null>(null);
  readonly selectedSeatTableId = signal('');
  readonly newReservation = { customerName: '', customerPhone: '', time: '19:00', partySize: 2, tableId: '' };
  private fetchGeneration = 0;

  readonly canManageReservations = computed(() => {
    const role = this.ecosystem.currentSession()?.role;
    return role === 'tenant_owner' || role === 'operator';
  });
  readonly reservations = computed(() => {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.appointmentsService.appointments()
      .filter((appointment) => appointment.tenantId === tenantId && appointment.date === this.selectedDate())
      .sort((a, b) => a.time.localeCompare(b.time));
  });
  readonly availableTables = computed(() => this.tablesForActiveTenant().filter((table) => table.status === 'available'));

  constructor() {
    effect(() => {
      const tenantId = this.ecosystem.resolveOperationalTenantId();
      const date = this.selectedDate();
      const allowed = this.canManageReservations();
      const generation = ++this.fetchGeneration;
      if (!allowed || !tenantId) {
        this.isLoading.set(false);
        this.loadError.set(tenantId ? null : 'Selecione uma unidade para consultar as reservas.');
        return;
      }
      void this.load(tenantId, date, generation);
    });
  }

  async refresh() {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!this.canManageReservations() || !tenantId) return;
    const generation = ++this.fetchGeneration;
    await this.load(tenantId, this.selectedDate(), generation);
  }

  async createReservation() {
    if (this.isSaving() || !this.canManageReservations()) return;
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    const customerName = this.newReservation.customerName.trim();
    const partySize = Number(this.newReservation.partySize);
    if (!tenantId || customerName.length < 2 || !this.newReservation.time || !Number.isInteger(partySize) || partySize < 1 || partySize > 30) {
      this.formError.set('Informe nome, horário e quantidade de pessoas válidos.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    try {
      await this.appointmentsService.addAppointment({
        tenantId,
        customerName,
        customerPhone: this.newReservation.customerPhone.trim() || undefined,
        date: this.selectedDate(),
        time: this.newReservation.time,
        partySize,
        tableId: this.newReservation.tableId || undefined,
        status: 'confirmed',
        channel: 'pos'
      });
      this.newReservation.customerName = '';
      this.newReservation.customerPhone = '';
      this.newReservation.time = '19:00';
      this.newReservation.partySize = 2;
      this.newReservation.tableId = '';
      await this.refreshData(tenantId);
      this.ecosystem.notify('Reserva registrada.', this.ecosystem.isSimulationMode() ? 'info' : 'success');
    } catch {
      this.formError.set('Não foi possível registrar. A mesa pode estar ocupada nesse horário.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async changeStatus(reservation: Appointment, status: Appointment['status']) {
    if (this.isSaving() || !this.canManageReservations()) return;
    await this.saveStatus(reservation, status);
  }

  beginSeating(reservation: Appointment) {
    this.seatingReservationId.set(reservation.id);
    this.selectedSeatTableId.set(reservation.tableId || this.availableTables()[0]?.id || '');
  }

  async seatReservation(reservation: Appointment) {
    const tableId = this.selectedSeatTableId();
    if (!tableId) return;
    await this.saveStatus(reservation, 'seated', tableId);
    this.seatingReservationId.set(null);
  }

  availableTablesFor(reservation: Appointment) {
    return this.tablesForActiveTenant().filter((table) =>
      table.status === 'available' || table.id === reservation.tableId
    ).filter((table) => table.capacity >= (reservation.partySize || 2));
  }

  statusLabel(status: Appointment['status']) {
    const labels: Record<Appointment['status'], string> = {
      pending: 'Pendente', confirmed: 'Confirmada', seated: 'Acomodada',
      cancelled: 'Cancelada', completed: 'Encerrada', no_show: 'Não compareceu'
    };
    return labels[status];
  }

  statusClass(status: Appointment['status']) {
    if (status === 'confirmed' || status === 'seated') return 'bg-emerald-950 text-emerald-300 border-emerald-800';
    if (status === 'pending') return 'bg-amber-950 text-amber-300 border-amber-800';
    return 'bg-stone-900 text-stone-400 border-stone-700';
  }

  private async saveStatus(reservation: Appointment, status: Appointment['status'], tableId?: string) {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return;
    this.isSaving.set(true);
    try {
      await this.appointmentsService.updateStatus(reservation.id, status, tableId);
      await this.refreshData(tenantId);
      this.ecosystem.notify(`Reserva ${this.statusLabel(status).toLowerCase()}.`, this.ecosystem.isSimulationMode() ? 'info' : 'success');
    } catch {
      this.formError.set('Não foi possível atualizar a reserva. Confira a disponibilidade da mesa.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(tenantId: string, date: string, generation: number) {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      await Promise.all([
        this.appointmentsService.fetchAppointments(tenantId, date),
        this.tablesService.fetchTables(tenantId)
      ]);
    } catch {
      if (generation === this.fetchGeneration) this.loadError.set('Não foi possível carregar a agenda desta unidade.');
    } finally {
      if (generation === this.fetchGeneration) this.isLoading.set(false);
    }
  }

  private async refreshData(tenantId: string) {
    await Promise.all([
      this.appointmentsService.fetchAppointments(tenantId, this.selectedDate()),
      this.tablesService.fetchTables(tenantId)
    ]);
  }

  private tablesForActiveTenant() {
    const tenantId = this.ecosystem.resolveOperationalTenantId();
    if (!tenantId) return [];
    return this.tablesService.tables().filter((table) => table.tenantId === tenantId);
  }

  private localDate() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
}
