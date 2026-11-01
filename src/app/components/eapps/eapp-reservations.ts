import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AppointmentsService } from '../../services/appointments.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-reservations',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER RESERVAS & FILA DE ESPERA -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">event_seat</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Reservas de Mesa & Fila de Espera</h2>
            <p class="text-[10px] text-stone-400">Controle de reservas online e fila presencial da recepção.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="addMockReservation()"
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
          <mat-icon class="text-sm">add</mat-icon>
          <span>Nova Reserva</span>
        </button>
      </div>

      <!-- LISTA DE RESERVAS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2">
        @for (res of appointments.appointments(); track res.id) {
          <div class="bg-[#1c0d06] border border-[#381c0c] hover:border-amber-600/60 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 transition-all">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <strong class="text-white text-xs">{{ res.customerName }}</strong>
                <span class="text-[10px] text-amber-400 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  {{ res.partySize || 2 }} Lugares
                </span>
                <span class="text-[10px] text-stone-400 font-mono">
                  Mesa: {{ res.tableNumber || 'Recepção' }}
                </span>
              </div>
              <div class="text-[10px] text-stone-400">
                Horário: <strong class="text-white">{{ res.time }}</strong> • Tel: {{ res.customerPhone || 'N/A' }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span
                [class]="res.status === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'"
                class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border">
                {{ res.status }}
              </span>

              @if (res.status !== 'seated') {
                <button
                  type="button"
                  (click)="seatGuest(res.id)"
                  class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs uppercase rounded-xl cursor-pointer shadow">
                  Acomodar
                </button>
              }
            </div>
          </div>
        }
      </div>

    </div>
  `
})
export class EAppReservationsWindow {
  readonly appointments = inject(AppointmentsService);

  addMockReservation() {
    this.appointments.addAppointment({
      customerName: 'Família Souza',
      customerPhone: '(11) 98877-6655',
      date: new Date().toISOString().slice(0, 10),
      partySize: 4,
      time: '20:30',
      tableNumber: 5,
      status: 'confirmed'
    });
  }

  seatGuest(id: string) {
    this.appointments.updateStatus(id, 'seated');
  }
}
