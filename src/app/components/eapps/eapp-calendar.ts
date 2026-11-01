import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-calendar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER CALENDÁRIO -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">calendar_month</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Calendário & Agenda Operacional</h2>
            <p class="text-[10px] text-stone-400">Compromissos, entregas programadas e eventos do estabelecimento.</p>
          </div>
        </div>

        <span class="text-xs text-amber-400 font-bold bg-[#261207] px-2.5 py-1 rounded-xl border border-[#482814]">
          Hoje: {{ todayDate() }}
        </span>
      </div>

      <!-- AGENDA DE COMPROMISSOS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5">
        @for (ev of events; track ev.id) {
          <div class="bg-[#1c0d06] border border-[#381c0c] p-3 rounded-2xl flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-[#261207] text-amber-400 flex flex-col items-center justify-center border border-[#482814]">
                <span class="text-[9px] uppercase font-bold">{{ ev.day }}</span>
                <span class="text-xs font-black">{{ ev.date }}</span>
              </div>
              <div>
                <strong class="text-white text-xs block">{{ ev.title }}</strong>
                <span class="text-[10px] text-stone-400">{{ ev.time }} • {{ ev.location }}</span>
              </div>
            </div>

            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
              {{ ev.tag }}
            </span>
          </div>
        }
      </div>

    </div>
  `
})
export class EAppCalendarWindow {
  todayDate() {
    return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  readonly events = [
    { id: '1', title: 'Entrega Programada de Carnes e Queijos', day: 'SEG', date: '02', time: '08:30', location: 'Estoque Central', tag: 'Fornecedor' },
    { id: '2', title: 'Treinamento de Brigada e Novo Cardápio', day: 'TER', date: '03', time: '15:00', location: 'Salão Principal', tag: 'Equipe' },
    { id: '3', title: 'Reserva Especial de Aniversário (25 pessoas)', day: 'SEX', date: '06', time: '20:00', location: 'Deck Superior', tag: 'Reserva' },
    { id: '4', title: 'Manutenção Preventiva das Fritadeiras e Coifa', day: 'DOM', date: '08', time: '07:00', location: 'Cozinha', tag: 'Manutenção' }
  ];
}
