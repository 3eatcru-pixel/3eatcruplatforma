import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TablesService } from '../../services/tables.service';
import { EcosystemService } from '../../services/ecosystem.service';
import { TableInfo } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-tables',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER COM STATS DE SALÃO -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">table_restaurant</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Mapa de Mesas & Salão</h2>
            <p class="text-[10px] text-stone-400">Controle em tempo real de ocupação e comandas volantes.</p>
          </div>
        </div>

        <!-- STATS PILLS -->
        <div class="flex items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold">
            {{ availableCount() }} Livres
          </span>
          <span class="px-2.5 py-1 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-700/60 font-bold">
            {{ occupiedCount() }} Ocupadas
          </span>
          @if (reservedCount() > 0) {
            <span class="px-2.5 py-1 rounded-xl bg-purple-950/80 text-purple-300 border border-purple-700/60 font-bold">
              {{ reservedCount() }} Reservadas
            </span>
          }
        </div>
      </div>

      <!-- FILTRO DE ZONAS -->
      <div class="flex items-center gap-2 shrink-0 overflow-x-auto pb-1">
        @for (zone of zones; track zone) {
          <button
            type="button"
            (click)="selectedZone.set(zone)"
            [class]="selectedZone() === zone ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#1e0e06] text-stone-400 border border-[#381c0c]'"
            class="px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all">
            {{ zone }}
          </button>
        }
      </div>

      <!-- GRID DE MESAS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          @for (table of filteredTables(); track table.id) {
            <button
              type="button"
              (click)="selectTable(table)"
              [class]="selectedTable()?.id === table.id ? 'ring-2 ring-amber-500 border-amber-500' : 'border-[#381c0c]'"
              class="bg-[#1b0d06] hover:bg-[#281308] border rounded-2xl p-3 text-left transition-all cursor-pointer flex flex-col justify-between h-36 relative group shadow-md">
              
              <div class="flex items-start justify-between">
                <span class="w-8 h-8 rounded-xl bg-[#2a1307] text-amber-400 font-serif font-black text-sm flex items-center justify-center border border-[#482814]">
                  {{ table.number }}
                </span>
                
                <span
                  [class]="statusBadgeClass(table.status)"
                  class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border">
                  {{ statusLabel(table.status) }}
                </span>
              </div>

              <div class="space-y-0.5 mt-2">
                <div class="text-[11px] font-bold text-white truncate">
                  {{ table.server ? 'Garçom: ' + table.server : (table.zone || 'Salão') }}
                </div>
                <div class="text-[10px] text-stone-400">
                  Capacidade: {{ table.guests || table.capacity }} lug.
                </div>
                @if (table.currentTotal) {
                  <strong class="text-xs text-amber-400 block pt-1">
                    R$ {{ table.currentTotal.toFixed(2) }}
                  </strong>
                }
              </div>

            </button>
          }
        </div>
      </div>

      <!-- DETALHE DA MESA SELECIONADA (MODAL / PAINEL) -->
      @if (selectedTable(); as t) {
        <div class="bg-[#1c0d06] border border-amber-600/60 rounded-2xl p-4 shrink-0 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
          <div>
            <div class="flex items-center gap-2">
              <strong class="text-base font-serif text-white">Mesa {{ t.number }}</strong>
              <span class="text-xs text-amber-400 font-mono">({{ t.zone || 'Salão Principal' }})</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-0.5">
              Status: <span class="uppercase font-bold text-white">{{ statusLabel(t.status) }}</span> • Garçom: {{ t.server || 'Nenhum' }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            @if (t.status === 'available') {
              <button
                type="button"
                (click)="occupyTable(t.id)"
                class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow">
                Abrir Mesa
              </button>
            } @else {
              <button
                type="button"
                (click)="freeTable(t.id)"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow">
                Liberar Mesa
              </button>
            }
            <button
              type="button"
              (click)="selectedTable.set(null)"
              class="px-3 py-2 bg-[#2a1307] text-stone-400 hover:text-white rounded-xl text-xs cursor-pointer">
              Fechar Detalhes
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class EAppTablesWindow {
  readonly tablesService = inject(TablesService);
  readonly ecosystem = inject(EcosystemService);

  readonly selectedZone = signal<string>('Todas');
  readonly selectedTable = signal<TableInfo | null>(null);

  readonly zones = ['Todas', 'Salão Principal', 'Varanda', 'Deck Superior', 'Bar'];

  readonly tables = computed(() => this.ecosystem.tables());

  readonly availableCount = computed(() => this.tables().filter(t => t.status === 'available').length);
  readonly occupiedCount = computed(() => this.tables().filter(t => t.status === 'occupied').length);
  readonly reservedCount = computed(() => this.tables().filter(t => t.status === 'reserved').length);

  readonly filteredTables = computed(() => {
    const z = this.selectedZone();
    if (z === 'Todas') return this.tables();
    return this.tables().filter(t => t.zone === z);
  });

  selectTable(t: TableInfo) {
    this.selectedTable.set(t);
  }

  occupyTable(tableId: string) {
    this.ecosystem.updateTable(tableId, { status: 'occupied', guests: 2, server: 'Garçom 01' });
    this.selectedTable.update(t => t ? { ...t, status: 'occupied' } : null);
  }

  freeTable(tableId: string) {
    this.ecosystem.updateTable(tableId, { status: 'available', currentTotal: 0 });
    this.selectedTable.update(t => t ? { ...t, status: 'available' } : null);
  }

  statusLabel(status: string) {
    switch (status) {
      case 'available': return 'Livre';
      case 'occupied': return 'Ocupada';
      case 'reserved': return 'Reservada';
      case 'billing': return 'Fechando';
      default: return status;
    }
  }

  statusBadgeClass(status: string) {
    switch (status) {
      case 'available': return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'occupied': return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'reserved': return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      default: return 'bg-stone-800 text-stone-300 border-stone-600';
    }
  }
}
