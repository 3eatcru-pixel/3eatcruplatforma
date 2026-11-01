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
            <p class="text-[10px] text-stone-400">Protótipo de gestão de mesas; esta janela ainda não está conectada ao Store OS.</p>
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
        @for (zone of zones(); track zone) {
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
        @if (filteredTables().length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-stone-500">
            <mat-icon class="text-4xl">table_restaurant</mat-icon>
            <p class="text-sm font-bold">Nenhuma mesa nesta área</p>
          </div>
        } @else {
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
                  Capacidade: {{ table.capacity }} lug.
                </div>
                @if ((table.currentTotal || 0) > 0) {
                  <strong class="text-xs text-amber-400 block pt-1">
                    R$ {{ table.currentTotal!.toFixed(2) }}
                  </strong>
                }
              </div>

            </button>
          }
        </div>
        }
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
            @if ((t.currentTotal || 0) > 0) {
              <p class="text-[10px] text-amber-300 mt-1">Valor em aberto: R$ {{ t.currentTotal!.toFixed(2) }}. Quite o valor antes de liberar a mesa.</p>
            }
          </div>

          <div class="flex items-center gap-2">
            @if (t.status === 'available') {
              <button
                type="button"
                (click)="occupyTable(t.id)"
                [disabled]="updatingTableId() === t.id"
                class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed">
                {{ updatingTableId() === t.id ? 'Salvando…' : 'Abrir Mesa' }}
              </button>
            } @else if (t.status === 'occupied') {
              <button
                type="button"
                (click)="freeTable(t.id)"
                [disabled]="updatingTableId() === t.id || (t.currentTotal || 0) > 0"
                [title]="(t.currentTotal || 0) > 0 ? 'Há valor em aberto nesta mesa' : 'Encerrar a ocupação da mesa'"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed">
                {{ updatingTableId() === t.id ? 'Salvando…' : 'Liberar Mesa' }}
              </button>
            } @else {
              <span class="px-3 py-2 text-[10px] text-stone-400 font-bold uppercase">
                {{ t.status === 'reserved' ? 'Reserva ativa' : 'Conta solicitada' }}
              </span>
            }
            <button
              type="button"
              (click)="selectedTableId.set(null)"
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
  readonly selectedTableId = signal<string | null>(null);
  readonly updatingTableId = signal<string | null>(null);
  readonly tables = computed(() => this.ecosystem.tables());
  readonly selectedTable = computed(() =>
    this.tables().find((table) => table.id === this.selectedTableId()) || null
  );
  readonly zones = computed(() => [
    'Todas',
    ...new Set(this.tables().map((table) => table.zone || 'Salão'))
  ]);

  readonly availableCount = computed(() => this.tables().filter(t => t.status === 'available').length);
  readonly occupiedCount = computed(() => this.tables().filter(t => t.status === 'occupied').length);
  readonly reservedCount = computed(() => this.tables().filter(t => t.status === 'reserved').length);

  readonly filteredTables = computed(() => {
    const z = this.selectedZone();
    if (z === 'Todas' || !this.zones().includes(z)) return this.tables();
    return this.tables().filter((table) => (table.zone || 'Salão') === z);
  });

  selectTable(t: TableInfo) {
    this.selectedTableId.set(t.id);
  }

  async occupyTable(tableId: string) {
    if (this.updatingTableId()) return;
    const table = this.tables().find((item) => item.id === tableId);
    if (!table || table.status !== 'available') return;

    this.updatingTableId.set(tableId);
    try {
      await this.tablesService.updateTable(tableId, {
        status: 'occupied',
        guests: Math.min(2, Math.max(1, table.capacity || 2)),
        server: this.ecosystem.currentSession()?.name || 'Operador'
      });
      this.ecosystem.notify(
        `Mesa ${table.number} aberta.`,
        this.ecosystem.isSimulationMode() ? 'info' : 'success'
      );
    } catch {
      this.ecosystem.notify('Não foi possível abrir a mesa.', 'error');
    } finally {
      this.updatingTableId.set(null);
    }
  }

  async freeTable(tableId: string) {
    if (this.updatingTableId()) return;
    const table = this.tables().find((item) => item.id === tableId);
    if (!table || table.status !== 'occupied') return;
    if ((table.currentTotal || 0) > 0) {
      this.ecosystem.notify('Quite o valor em aberto antes de liberar a mesa.', 'warning');
      return;
    }

    this.updatingTableId.set(tableId);
    try {
      await this.tablesService.updateTable(tableId, {
        status: 'available',
        currentTotal: 0,
        guests: 0,
        server: ''
      });
      this.ecosystem.notify(
        `Mesa ${table.number} liberada.`,
        this.ecosystem.isSimulationMode() ? 'info' : 'success'
      );
    } catch {
      this.ecosystem.notify('Não foi possível liberar a mesa.', 'error');
    } finally {
      this.updatingTableId.set(null);
    }
  }

  statusLabel(status: string) {
    switch (status) {
      case 'available': return 'Livre';
      case 'occupied': return 'Ocupada';
      case 'reserved': return 'Reservada';
      case 'billing': return 'Conta solicitada';
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
