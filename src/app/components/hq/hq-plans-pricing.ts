import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { LicensePlan } from '../../models/ecosystem.model';

@Component({
  selector: 'app-hq-plans-pricing',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 text-stone-200">
      
      <!-- HEADER BANNER -->
      <div class="bg-[#170b04] border border-[#3d200f] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center font-black shadow-md">
            <mat-icon class="text-2xl">payments</mat-icon>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-serif font-black text-lg text-white">Governança de Planos &amp; Preços de Licenciamento SaaS</h2>
              <span class="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded font-bold uppercase">
                HQ CONTROLE TOTAL
              </span>
            </div>
            <p class="text-xs text-stone-400 mt-0.5">Defina a mensalidade, limite de terminais MDM e módulos inclusos para cada tier de assinatura do ecossistema.</p>
          </div>
        </div>
      </div>

      <!-- ARCHITECTURAL RULE BANNER -->
      <div class="bg-gradient-to-r from-amber-950/60 via-[#1f0f06] to-amber-950/60 border border-amber-600/50 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
        <mat-icon class="text-amber-400 text-xl shrink-0 mt-0.5">verified_user</mat-icon>
        <div class="space-y-1">
          <h4 class="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
            Regra Canônica de Produto: Todos os Aplicativos Inclusos (Sem Trava de Módulos)
          </h4>
          <p class="text-[11px] text-stone-300 leading-relaxed font-sans">
            No ecossistema <strong>3EATCRU OS</strong>, todos os lojistas têm acesso integral a <strong>100% dos aplicativos</strong> (PDV Frente de Caixa, KDS Cozinha, Salão de Mesas, Estoque NFe, Tesouraria DRE, App do Garçom, App do Entregador e Vitrine).
            A <strong>única restrição que diferencia os planos é a quantidade de dispositivos/terminais MDM conectados simultaneamente</strong> na unidade.
          </p>
        </div>
      </div>

      <!-- PLANS GRID -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @for (plan of ecosystem.licensePlans(); track plan.id) {
          <div class="bg-[#170b04] border-2 border-[#4d2813] rounded-3xl p-6 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-amber-600/20 text-amber-400 font-mono text-[10px] font-black px-4 py-1.5 rounded-bl-2xl border-l border-b border-amber-600/40 uppercase">
              {{ plan.id }}
            </div>

            <div class="space-y-3">
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="inline-flex items-center gap-1 text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold uppercase">
                    <mat-icon class="text-[10px]">apps</mat-icon>
                    Todos os Apps Inclusos
                  </span>
                </div>
                <h3 class="font-serif font-black text-xl text-white">{{ plan.name }}</h3>
                <p class="text-stone-400 text-xs mt-1 leading-relaxed">{{ plan.description }}</p>
              </div>

              <!-- PRICE & DEVICES EDITORS -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-[#261308] border border-[#4d2813] p-3 rounded-2xl space-y-1">
                  <span class="text-[9px] font-mono font-bold text-stone-400 uppercase block">Mensalidade</span>
                  <div class="flex items-center gap-1">
                    <span class="text-amber-400 font-black text-xs">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      [value]="plan.priceMonthly"
                      (input)="onPriceChange(plan.id, $any($event.target).value)"
                      class="w-full bg-[#140b05] border border-amber-600/50 rounded-lg px-2 py-1 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400">
                  </div>
                </div>

                <div class="bg-[#261308] border border-[#4d2813] p-3 rounded-2xl space-y-1">
                  <span class="text-[9px] font-mono font-bold text-stone-400 uppercase block">Limite Devices</span>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      [value]="plan.maxDevices"
                      (input)="onDevicesChange(plan.id, $any($event.target).value)"
                      class="w-full bg-[#140b05] border border-amber-600/50 rounded-lg px-2 py-1 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-amber-400">
                    <span class="text-[10px] text-stone-400 font-mono">un</span>
                  </div>
                </div>
              </div>

              <!-- SPEC LIST -->
              <div class="space-y-2 pt-2">
                <div class="flex items-center justify-between text-xs font-mono border-b border-[#3d200f] pb-2">
                  <span class="text-stone-400">Capacidade Concorrente:</span>
                  <strong class="text-amber-300 font-bold">
                    {{ plan.maxDevices >= 900 ? 'Ilimitados' : plan.maxDevices + ' Terminais' }}
                  </strong>
                </div>
                <span class="text-[10px] font-mono font-bold text-stone-400 uppercase block pt-1">Módulos Ativos (100% Liberados):</span>
                <ul class="space-y-1.5 font-sans text-xs text-stone-300">
                  @for (mod of plan.includedModules; track mod) {
                    <li class="flex items-center gap-2">
                      <mat-icon class="text-emerald-400 text-sm">check_circle</mat-icon>
                      <span>{{ mod }}</span>
                    </li>
                  }
                </ul>
              </div>
            </div>

            <button
              type="button"
              (click)="savePlan(plan)"
              class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-3 rounded-2xl shadow-lg border border-amber-400/50 text-xs uppercase tracking-wider transition-all cursor-pointer">
              Salvar Alterações do Plano
            </button>
          </div>
        }
      </div>

    </div>
  `
})
export class HqPlansPricingComponent {
  readonly ecosystem = inject(EcosystemService);

  onPriceChange(planId: string, val: string) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      this.ecosystem.updatePlanPrice(planId, num);
    }
  }

  onDevicesChange(planId: string, val: string) {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      const plan = this.ecosystem.licensePlans().find((p: LicensePlan) => p.id === planId);
      if (plan) {
        this.ecosystem.updatePlanPrice(planId, plan.priceMonthly, num);
      }
    }
  }

  savePlan(plan: LicensePlan) {
    this.ecosystem.updatePlanPrice(plan.id, plan.priceMonthly, plan.maxDevices);
  }
}
