import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-ifood',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#120808] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER IFOOD PORTAL -->
      <div class="flex items-center justify-between gap-3 bg-[#240c0c] p-3 rounded-2xl border border-rose-900/40 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-lg shadow">
            iF
          </div>
          <div>
            <h2 class="text-sm font-sans font-black text-white">Portal iFood • Integração Gestor</h2>
            <p class="text-[10px] text-stone-400">Cardápio sincronizado, despachos e pedidos de delivery.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="toggleStoreOpen()"
          [class]="isOpen() ? 'bg-emerald-600 text-white' : 'bg-rose-900 text-rose-300'"
          class="px-3 py-1.5 rounded-xl font-bold text-xs uppercase cursor-pointer border border-white/10 flex items-center gap-1.5 shadow">
          <span class="w-2 h-2 rounded-full" [class]="isOpen() ? 'bg-emerald-300 animate-pulse' : 'bg-rose-400'"></span>
          <span>{{ isOpen() ? 'Loja Aberta' : 'Loja Fechada' }}</span>
        </button>
      </div>

      <!-- PEDIDOS IFOOD ATIVOS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3">
        <div class="flex justify-between items-center text-xs">
          <h3 class="font-bold text-stone-300 uppercase">Pedidos Recebidos via iFood API</h3>
          <span class="text-stone-500 text-[10px]">Webhook: Ativo (Polling 5s)</span>
        </div>

        <div class="space-y-2">
          @for (ord of ifoodOrders(); track ord.id) {
            <div class="bg-[#1c0d0d] border border-rose-900/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-white">#{{ ord.code }}</span>
                  <span class="text-[10px] text-rose-400 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-800/40">
                    {{ ord.itemsSummary }}
                  </span>
                </div>
                <div class="text-[10px] text-stone-400">
                  Cliente: <strong class="text-white">{{ ord.customer }}</strong> • Previsão: {{ ord.eta }}
                </div>
              </div>

              <div class="flex items-center gap-3">
                <strong class="text-xs font-black text-white">R$ {{ ord.total.toFixed(2) }}</strong>
                @if (ord.status === 'aguardando') {
                  <button
                    type="button"
                    (click)="confirmOrder(ord.id)"
                    class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-xl cursor-pointer shadow">
                    Confirmar Pedido
                  </button>
                } @else {
                  <span class="px-2.5 py-1 bg-emerald-950 text-emerald-400 font-bold text-[10px] uppercase rounded-xl border border-emerald-800">
                    Em Produção KDS
                  </span>
                }
              </div>
            </div>
          }
        </div>
      </div>

    </div>
  `
})
export class EAppIfoodWindow {
  readonly ecosystem = inject(EcosystemService);

  readonly isOpen = signal<boolean>(true);

  readonly ifoodOrders = signal([
    { id: 'if-1', code: 'iF-8921', customer: 'Fernanda Lima', itemsSummary: '2x Smash Burger + 1x Batata Frita', total: 68.00, eta: '25-35 min', status: 'aguardando' },
    { id: 'if-2', code: 'iF-8922', customer: 'Guilherme Santos', itemsSummary: '1x Pizza Calabresa Grande + 1x Guaraná 2L', total: 79.90, eta: '40-50 min', status: 'confirmado' }
  ]);

  toggleStoreOpen() {
    this.isOpen.update(v => !v);
  }

  confirmOrder(id: string) {
    this.ifoodOrders.update(ords => ords.map(o => o.id === id ? { ...o, status: 'confirmado' } : o));
    this.ecosystem.notify('Pedido iFood aceito e despachado para a Cozinha KDS!', 'success');
  }
}
