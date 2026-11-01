import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { SecurityService } from '../../services/security.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-admin-hub',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER DIRETORIA DA LOJA -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-amber-600 to-amber-800 text-white flex items-center justify-center font-black shadow">
            <mat-icon class="text-xl">admin_panel_settings</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Diretoria da Loja • Gabinete Local</h2>
            <p class="text-[10px] text-stone-400">Painel de governança interna da unidade para o proprietário parceiro.</p>
          </div>
        </div>

        <span class="text-xs text-amber-400 font-bold bg-amber-950 px-2.5 py-1 rounded-xl border border-amber-800">
          Unidade Ativa
        </span>
      </div>

      <!-- CARDS INFORMATIVOS DA UNIDADE -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-xs">
        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">CNPJ / Razão Social:</span>
          <strong class="text-white block mt-0.5 truncate">{{ tenant().cnpj || '00.000.000/0001-00' }}</strong>
          <span class="text-[10px] text-amber-500 truncate block">{{ tenant().name }}</span>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">Plano Contratado:</span>
          <strong class="text-emerald-400 block mt-0.5 uppercase">{{ tenant().plan || 'Enterprise' }}</strong>
          <span class="text-[10px] text-stone-400">Terminais Conectados: 3</span>
        </div>

        <div class="bg-[#1b0d06] border border-[#381c0c] p-3 rounded-2xl">
          <span class="text-stone-500 text-[10px] uppercase block">Responsável Titular:</span>
          <strong class="text-white block mt-0.5 truncate">{{ security.currentSession()?.name || 'Proprietário' }}</strong>
          <span class="text-[10px] text-stone-400">{{ security.currentSession()?.email || 'admin@loja.com' }}</span>
        </div>
      </div>

      <!-- DISPOSITIVOS DA UNIDADE (MDM LOCAL) -->
      <div class="flex-1 min-h-0 bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 overflow-y-auto custom-scrollbar space-y-3">
        <h3 class="text-xs font-bold text-white uppercase flex items-center gap-2">
          <mat-icon class="text-amber-500 text-sm">devices</mat-icon>
          Terminais Autorizados Nesta Filial
        </h3>

        <div class="space-y-2 text-xs">
          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] flex justify-between items-center">
            <div>
              <strong class="text-white block">Caixa 01 - Balcão Principal</strong>
              <span class="text-[10px] text-stone-400">Terminal Touch 15" • IP 192.168.1.50</span>
            </div>
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded font-bold border border-emerald-800">
              Operando
            </span>
          </div>

          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] flex justify-between items-center">
            <div>
              <strong class="text-white block">Monitor KDS 01 - Cozinha</strong>
              <span class="text-[10px] text-stone-400">Smart Display 24" • IP 192.168.1.51</span>
            </div>
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded font-bold border border-emerald-800">
              Operando
            </span>
          </div>

          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] flex justify-between items-center">
            <div>
              <strong class="text-white block">Comanda Volante 01 - Salão</strong>
              <span class="text-[10px] text-stone-400">Smartphone Android 14 Garçom</span>
            </div>
            <span class="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[10px] rounded font-bold border border-emerald-800">
              Pareado
            </span>
          </div>
        </div>
      </div>

    </div>
  `
})
export class EAppAdminHubWindow {
  readonly ecosystem = inject(EcosystemService);
  readonly security = inject(SecurityService);

  readonly tenant = computed(() => this.ecosystem.currentTenant());
}
