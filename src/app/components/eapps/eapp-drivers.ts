import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LogisticsService } from '../../services/logistics.service';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-drivers',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER LOGÍSTICA & MOTOBOYS -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <mat-icon class="text-xl">alt_route</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Hub de Logística & Entregadores</h2>
            <p class="text-[10px] text-stone-400">Despacho de rotas, telemetria de motoqueiros e frota própria.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="addDriver()"
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
          <mat-icon class="text-sm">two_wheeler</mat-icon>
          <span>Novo Entregador</span>
        </button>
      </div>

      <!-- LISTA DE ENTREGADORES -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2.5">
        @for (driver of logistics.drivers(); track driver.id) {
          <div class="bg-[#1c0d06] border border-[#381c0c] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-[#261207] text-amber-400 flex items-center justify-center border border-[#482814]">
                <mat-icon class="text-base">two_wheeler</mat-icon>
              </div>
              <div>
                <strong class="text-white text-xs block">{{ driver.name }}</strong>
                <span class="text-[10px] text-stone-400">
                  Veículo: {{ driver.vehicleType === 'moto' ? 'Moto' : driver.vehicleType }} • Tel: {{ driver.phone }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <span
                [class]="driver.status === 'available' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'"
                class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border">
                {{ driver.status === 'available' ? 'Disponível' : 'Em Rota' }}
              </span>

              <button
                type="button"
                (click)="toggleStatus(driver.id)"
                class="px-3 py-1 bg-[#261207] hover:bg-[#381c0c] text-stone-200 rounded-xl text-xs font-bold border border-[#482814] cursor-pointer">
                Alternar Status
              </button>
            </div>
          </div>
        }
      </div>

    </div>
  `
})
export class EAppDriversWindow {
  readonly logistics = inject(LogisticsService);
  readonly ecosystem = inject(EcosystemService);

  addDriver() {
    this.logistics.createDriver({
      name: 'Motoboy #' + (this.logistics.drivers().length + 1),
      phone: '(11) 99881-2233',
      vehicleType: 'moto',
      status: 'available',
      tenantId: this.ecosystem.resolveOperationalTenantId()
    });
  }

  toggleStatus(id: string) {
    const drv = this.logistics.drivers().find(d => d.id === id);
    if (!drv) return;
    const next = drv.status === 'available' ? 'delivering' : 'available';
    this.logistics.updateDriver(id, { status: next });
  }
}
