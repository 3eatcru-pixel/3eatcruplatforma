import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
                EDIÇÃO LIMITADA AO CATÁLOGO
              </span>
            </div>
            <p class="text-xs text-stone-400 mt-0.5">Edite o preço SaaS e a cota usada no provisionamento de novos lojistas. A cobrança recorrente não está integrada; mudanças no catálogo não atualizam automaticamente as cotas existentes. Entregadores da plataforma para lojas sem frota continuam em breve.</p>
          </div>
        </div>
      </div>

      <!-- ARCHITECTURAL RULE BANNER -->
      <div class="bg-gradient-to-r from-amber-950/60 via-[#1f0f06] to-amber-950/60 border border-amber-600/50 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
        <mat-icon class="text-amber-400 text-xl shrink-0 mt-0.5">verified_user</mat-icon>
        <div class="space-y-1">
          <h4 class="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">Metadados cadastrados no plano</h4>
          <p class="text-[11px] text-stone-300 leading-relaxed font-sans">Os módulos listados são informativos; esta tela altera preço e cota, sem ativar ou bloquear módulos do OS. A cota cadastrada vale para novos lojistas; para tenants existentes, o HQ ajusta o limite na governança.</p>
        </div>
      </div>

      @if (ecosystem.isSimulationMode()) {
        <p class="rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-200">Modo de simulação: valores exibidos são dados de demonstração.</p>
      } @else if (ecosystem.licensePlansStatus() === 'loading' || ecosystem.licensePlansStatus() === 'idle') {
        <p class="rounded-xl border border-stone-700 bg-stone-900 p-3 text-xs text-stone-300">Carregando catálogo de planos do servidor...</p>
      } @else if (ecosystem.licensePlansStatus() === 'error') {
        <p role="alert" class="rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-xs text-rose-200">Não foi possível carregar os planos. Os valores de demonstração não serão exibidos como catálogo real.</p>
      } @else if (ecosystem.licensePlansSource() === 'defaults' || ecosystem.licensePlansSource() === 'mixed') {
        <p class="rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-200">
          {{ ecosystem.licensePlansSource() === 'defaults' ? 'A coleção de planos ainda está vazia; os valores padrão de referência estão sendo exibidos.' : 'Há planos sem documento salvo; esses planos usam os valores padrão de referência.' }} Salvar um plano grava seus dados no servidor.
        </p>
      }
      @if (saveError()) {
        <p role="alert" class="rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-xs text-rose-200">{{ saveError() }}</p>
      }

      <!-- PLANS GRID -->
      @if (ecosystem.isSimulationMode() || ecosystem.licensePlansStatus() === 'loaded') {
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @for (plan of ecosystem.licensePlans(); track plan.id) {
          <div class="bg-[#170b04] border-2 border-[#4d2813] rounded-3xl p-6 space-y-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-amber-600/20 text-amber-400 font-mono text-[10px] font-black px-4 py-1.5 rounded-bl-2xl border-l border-b border-amber-600/40 uppercase">
              {{ plan.id }}
            </div>

            <div class="space-y-3">
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="inline-flex items-center gap-1 text-[9px] font-mono bg-stone-800 text-stone-300 border border-stone-600 px-2 py-0.5 rounded-full font-bold uppercase">
                    <mat-icon class="text-[10px]">description</mat-icon>
                    Plano cadastrado
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
                      [value]="draftPrice(plan)"
                      (input)="onPriceChange(plan.id, $any($event.target).value)"
                      class="w-full bg-[#140b05] border border-amber-600/50 rounded-lg px-2 py-1 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400">
                  </div>
                </div>

                <div class="bg-[#261308] border border-[#4d2813] p-3 rounded-2xl space-y-1">
                <span class="text-[9px] font-mono font-bold text-stone-400 uppercase block">Cota cadastrada</span>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      [value]="draftMaxDevices(plan)"
                      (input)="onDevicesChange(plan.id, $any($event.target).value)"
                      class="w-full bg-[#140b05] border border-amber-600/50 rounded-lg px-2 py-1 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-amber-400">
                    <span class="text-[10px] text-stone-400 font-mono">un</span>
                  </div>
                </div>
              </div>

              <!-- SPEC LIST -->
              <div class="space-y-2 pt-2">
                <div class="flex items-center justify-between text-xs font-mono border-b border-[#3d200f] pb-2">
                  <span class="text-stone-400">Máximo cadastrado no catálogo:</span>
                  <strong class="text-amber-300 font-bold">
                    {{ plan.maxDevices }} registros
                  </strong>
                </div>
                <p class="text-[10px] text-stone-500">Este valor do catálogo não sincroniza automaticamente a cota de tenants existentes.</p>
                <span class="text-[10px] font-mono font-bold text-stone-400 uppercase block pt-1">Módulos descritos no cadastro:</span>
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
              [disabled]="savingPlanId() === plan.id"
              class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-3 rounded-2xl shadow-lg border border-amber-400/50 text-xs uppercase tracking-wider transition-all cursor-pointer">
              {{ savingPlanId() === plan.id ? 'Salvando...' : 'Salvar Alterações do Plano' }}
            </button>
          </div>
        }
      </div>
      }

    </div>
  `
})
export class HqPlansPricingComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly planDrafts = signal<Record<string, { priceMonthly?: string; maxDevices?: string }>>({});
  readonly savingPlanId = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  onPriceChange(planId: string, val: string) {
    this.planDrafts.update((drafts) => ({ ...drafts, [planId]: { ...drafts[planId], priceMonthly: val } }));
  }

  onDevicesChange(planId: string, val: string) {
    this.planDrafts.update((drafts) => ({ ...drafts, [planId]: { ...drafts[planId], maxDevices: val } }));
  }

  draftPrice(plan: LicensePlan): string {
    return this.planDrafts()[plan.id]?.priceMonthly ?? String(plan.priceMonthly);
  }

  draftMaxDevices(plan: LicensePlan): string {
    return this.planDrafts()[plan.id]?.maxDevices ?? String(plan.maxDevices);
  }

  async savePlan(plan: LicensePlan): Promise<void> {
    if (this.savingPlanId()) return;
    const draft = this.planDrafts()[plan.id] || {};
    const price = draft.priceMonthly === undefined ? plan.priceMonthly : Number(draft.priceMonthly);
    const maxDevices = draft.maxDevices === undefined ? plan.maxDevices : Number(draft.maxDevices);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 999) {
      this.saveError.set('Informe mensalidade válida (mínimo R$ 0) e cota inteira entre 1 e 999.');
      return;
    }
    this.savingPlanId.set(plan.id);
    this.saveError.set(null);
    try {
      await this.ecosystem.updatePlanPrice(plan.id, price, maxDevices);
      this.planDrafts.update((drafts) => {
        const next = { ...drafts };
        delete next[plan.id];
        return next;
      });
    } catch {
      this.saveError.set(`Não foi possível salvar o plano ${plan.name}. O servidor não confirmou as alterações.`);
    } finally {
      this.savingPlanId.set(null);
    }
  }
}
