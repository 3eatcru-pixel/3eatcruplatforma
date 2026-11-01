import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ServiceOrdersService } from '../../services/service-orders.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-services',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER ORDENS DE SERVIÇO -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">handyman</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Ordens de Serviço (O.S.) & Manutenção</h2>
            <p class="text-[10px] text-stone-400">Controle para segmento automotivo, reparos técnicos e assistência.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="createMockOrder()"
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
          <mat-icon class="text-sm">add</mat-icon>
          <span>Nova O.S.</span>
        </button>
      </div>

      <!-- LISTA DE O.S. -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Nº O.S.</th>
              <th class="p-3">Cliente / Veículo</th>
              <th class="p-3">Técnico</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @for (os of serviceOrders.serviceOrders(); track os.id) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3 font-bold text-amber-400">
                  #{{ os.id }}
                </td>
                <td class="p-3">
                  <div class="text-white font-bold">{{ os.customerName }}</div>
                  <div class="text-[10px] text-stone-400">{{ os.equipment || os.vehicleInfo || os.description }}</div>
                </td>
                <td class="p-3 text-stone-300">
                  {{ os.technician || 'Em triagem' }}
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                    {{ os.status }}
                  </span>
                </td>
                <td class="p-3 text-right font-black text-white">
                  R$ {{ (os.finalPrice || os.price || os.estimatedPrice || 150).toFixed(2) }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppServicesWindow {
  readonly initialTab = input<string>('dashboard');
  readonly serviceOrders = inject(ServiceOrdersService);

  createMockOrder() {
    this.serviceOrders.addServiceOrder({
      customerName: 'Cliente Oficina #' + (this.serviceOrders.serviceOrders().length + 1),
      equipment: 'Placa ABC-9988 - Revisão Freios',
      description: 'Troca de pastilhas e alinhamento',
      technician: 'Carlos Mecânico',
      status: 'in_progress',
      price: 280.00
    });
  }
}
