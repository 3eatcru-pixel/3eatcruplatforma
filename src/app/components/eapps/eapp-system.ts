import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { SecurityService } from '../../services/security.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-system',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER ESTE PC -->
      <div class="flex items-center gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="w-10 h-10 rounded-xl bg-amber-700/30 text-amber-500 flex items-center justify-center">
          <mat-icon class="text-xl">laptop_chromebook</mat-icon>
        </div>
        <div>
          <h2 class="text-sm font-serif font-black text-white">Este Computador • Informações gerais</h2>
          <p class="text-[10px] text-stone-400">Resumo estático da aplicação; não coleta diagnóstico do dispositivo.</p>
        </div>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 text-xs">
        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-2">
          <h3 class="font-bold text-amber-400 uppercase text-[11px] mb-2 flex items-center gap-1.5">
            <mat-icon class="text-sm">memory</mat-icon>
            Especificações da Estação
          </h3>

          <div class="grid grid-cols-2 gap-2 text-stone-300">
            <div class="bg-[#200e05] p-2 rounded-xl border border-[#381c0c]">
              <span class="text-stone-500 text-[10px] block">Sistema Operacional:</span>
              <strong class="text-white">Aplicação web Store OS</strong>
            </div>

            <div class="bg-[#200e05] p-2 rounded-xl border border-[#381c0c]">
              <span class="text-stone-500 text-[10px] block">Arquitetura de Renderização:</span>
              <strong class="text-white">Angular (hardware não inspecionado)</strong>
            </div>

            <div class="bg-[#200e05] p-2 rounded-xl border border-[#381c0c]">
              <span class="text-stone-500 text-[10px] block">Banco Local:</span>
              <strong class="text-emerald-400">Fila local do PDV</strong>
            </div>

            <div class="bg-[#200e05] p-2 rounded-xl border border-[#381c0c]">
              <span class="text-stone-500 text-[10px] block">Nuvem Remota:</span>
              <strong class="text-stone-300">Conexão de backend não verificada</strong>
            </div>
          </div>
        </div>

        <div class="bg-[#180b04] border border-[#381c0c] rounded-2xl p-4 space-y-2">
          <h3 class="font-bold text-amber-400 uppercase text-[11px] mb-2 flex items-center gap-1.5">
            <mat-icon class="text-sm">security</mat-icon>
            Sessão & Segurança
          </h3>

          <div class="bg-[#200e05] p-3 rounded-xl border border-[#381c0c] space-y-1">
            <div class="flex justify-between">
              <span class="text-stone-400">Operador:</span>
              <strong class="text-white">{{ security.currentSession()?.name || 'Operador Local' }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-400">Papel / Privilégio:</span>
              <span class="text-amber-400 font-bold uppercase">{{ security.currentSession()?.role || 'operator' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-400">Estabelecimento (Tenant):</span>
              <strong class="text-white">{{ ecosystem.currentTenant().name }}</strong>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class EAppSystemWindow {
  readonly ecosystem = inject(EcosystemService);
  readonly security = inject(SecurityService);
}
