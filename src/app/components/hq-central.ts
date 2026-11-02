import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../services/ecosystem.service';
import { SecurityService } from '../services/security.service';
import { CompanyTenant } from '../models/ecosystem.model';

// Sub-modules
import { HqRegionalManagerComponent } from './hq/hq-regional-manager';
import { HqAppsPreviewComponent } from './hq/hq-apps-preview';
import { HqTenantGovernanceModalComponent } from './hq/hq-tenant-governance-modal';
import { HqDocumentationModalComponent } from './hq/hq-documentation-modal';
import { HqPlansPricingComponent } from './hq/hq-plans-pricing';
import { HqTenantsListComponent } from './hq/hq-tenants-list';
import { HqDevicesListComponent } from './hq/hq-devices-list';
import { HqLedgerComponent } from './hq/hq-ledger';
import { HqAuditComponent } from './hq/hq-audit';
import { HqSystemConfigComponent } from './hq/hq-system-config';
import { HqCrmComponent } from './hq/hq-crm';
import { HqBillingComponent } from './hq/hq-billing';

import { HqEappsCatalogComponent } from './hq/hq-eapps-catalog';

export type HQSubTab = 'tenants' | 'eapps' | 'devices' | 'apps_preview' | 'ledger' | 'regional' | 'consumers' | 'audit' | 'system' | 'plans' | 'billing';

interface CommandItem {
  id: HQSubTab;
  label: string;
  icon: string;
  sub: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-central',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HqRegionalManagerComponent,
    HqEappsCatalogComponent,
    HqAppsPreviewComponent,
    HqTenantGovernanceModalComponent,
    HqDocumentationModalComponent,
    HqPlansPricingComponent,
    HqTenantsListComponent,
    HqDevicesListComponent,
    HqLedgerComponent,
    HqAuditComponent,
    HqSystemConfigComponent,
    HqCrmComponent,
    HqBillingComponent
  ],
  host: {
    '(window:keydown)': 'onWindowKeydown($event)'
  },
  template: `
    <!-- SMARTPHONE MOBILE WARNING BARRIER (EXCLUSIVO PARA DESKTOP & TABLET) -->
    @if (!bypassMobileWarning()) {
      <div class="block md:hidden min-h-screen bg-[#0e0805] text-stone-200 p-5 font-sans flex flex-col justify-between">
        <div class="space-y-6 max-w-md mx-auto pt-4">
          <div class="flex items-center justify-between border-b border-[#3d200f] pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 text-white flex items-center justify-center font-black shadow-lg">
                <mat-icon class="text-xl">security</mat-icon>
              </div>
              <div>
                <div class="font-serif font-black text-rose-400 text-sm tracking-wider">HQ CENTRAL</div>
                <div class="text-[9px] font-mono text-stone-400 font-bold uppercase tracking-widest">GOVERNANÇA DO ECOSSISTEMA</div>
              </div>
            </div>
            <span class="bg-rose-950/80 text-rose-300 border border-rose-700/60 text-[9px] font-mono px-2.5 py-1 rounded-full uppercase font-bold">
              Desktop &amp; Tablet
            </span>
          </div>

          <div class="bg-[#1b0d06] border-2 border-rose-600/70 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <mat-icon class="text-3xl">desktop_windows</mat-icon>
            </div>
            <div class="space-y-2">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block">
                DIRETRIZ DE ARQUITETURA
              </span>
              <h2 class="font-serif font-black text-xl text-white leading-tight">
                HQ Central Exclusivo para Computadores e Tablets
              </h2>
              <p class="text-xs text-stone-300 leading-relaxed font-sans">
                O <strong>HQ Central</strong> é o console de governança do ecossistema: tenants, planos, inventário de dispositivos e preparação do futuro processo de entregas da plataforma.
              </p>
              <p class="text-[11px] text-stone-400 leading-relaxed font-sans">
                Devido à alta densidade analítica e governança crítica, a interface completa exige telas a partir de <strong>768px (Tablets em modo paisagem e Computadores Desktop)</strong>.
              </p>
            </div>
          </div>

          <div class="space-y-2.5">
            <button
              type="button"
              (click)="router.navigate(['/home'])"
              class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-4 px-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all">
              <mat-icon class="text-base">storefront</mat-icon>
              <span>Ir para o Portal do Consumidor (/home)</span>
            </button>

            <button
              type="button"
              (click)="router.navigate(['/para-lojistas'])"
              class="w-full bg-[#201007] hover:bg-[#2e170b] text-amber-300 border border-[#482814] font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs cursor-pointer transition-all">
              <mat-icon class="text-sm text-amber-400">business</mat-icon>
              <span>Conhecer o 3eatcru OS para Lojistas</span>
            </button>

            <button
              type="button"
              (click)="bypassMobileWarning.set(true)"
              class="w-full bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-[10px] font-mono py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
              <mat-icon class="text-xs">visibility</mat-icon>
              <span>Acessar Console mesmo em Smartphone (Modo Emergência)</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- DESKTOP / TABLET CONSOLE (OU MODO BYPASS) -->
    <div [class]="bypassMobileWarning() ? 'block' : 'hidden md:block'" class="min-h-screen bg-[#0e0e10] text-[#edeeef] p-4 sm:p-8 font-geist selection:bg-amber-600 selection:text-white relative overflow-x-hidden">
      
      <div class="max-w-7xl mx-auto space-y-6 relative z-10">
        
        <!-- HEADER COMMAND BANNER (VARIATION 8 MASTER CONSOLE) -->
        <div class="bg-[#16161a] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-stone-950 font-bold shadow-lg">
              <mat-icon class="text-2xl">security</mat-icon>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h1 class="text-2xl sm:text-3xl font-syne font-extrabold uppercase tracking-tight text-white leading-none">
                  HQ Central
                </h1>
                <span class="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase">
                  GABINETE MASTER
                </span>
              </div>
              <p class="text-stone-400 text-xs font-geist max-w-xl">
                Governança multi-tenant, planos, inventário de dispositivos e configuração do recurso futuro de entregas da plataforma.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 relative z-10">
            <div [class]="security.isRealMode() ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'" class="border px-3 py-2 rounded-lg text-[11px] font-mono-code font-bold flex items-center gap-2 shadow">
              <mat-icon class="text-sm">{{ security.isRealMode() ? 'cloud_done' : 'science' }}</mat-icon>
              <span>{{ security.isRealMode() ? 'FIRESTORE REAL (LIVE)' : 'SIMULAÇÃO (EM MEMÓRIA)' }}</span>
            </div>

            <button
              type="button"
              (click)="security.toggleExecutionMode()"
              class="bg-white/5 border border-white/10 text-stone-200 hover:bg-white/10 font-mono-code text-xs font-bold py-2.5 px-3.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow">
              <mat-icon class="text-sm">sync_alt</mat-icon>
              <span>{{ security.isRealMode() ? 'ATIVAR SIMULAÇÃO' : 'ATIVAR MODO REAL' }}</span>
            </button>

            <button
              type="button"
              (click)="showDocModal.set(true)"
              class="bg-white/5 hover:bg-white/10 text-stone-200 font-mono-code text-xs font-bold py-2.5 px-3 rounded-lg border border-white/10 flex items-center gap-1.5 cursor-pointer transition-all">
              <mat-icon class="text-sm">menu_book</mat-icon>
              <span>MANUAL</span>
            </button>

            <button
              type="button"
              (click)="openNewTenantModal()"
              class="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-geist transition-all cursor-pointer">
              <mat-icon class="text-base">add_business</mat-icon>
              <span>PROVISIONAR LOJA</span>
            </button>
          </div>
        </div>

        <!-- ARCHITECTURAL PILLAR CLARITY BANNER -->
        <div class="bg-[#111114] border border-amber-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-amber-300 font-mono-code">
            <mat-icon class="text-amber-400 text-sm">security</mat-icon>
            <span><strong>PILAR 1 ATIVO: HQ CENTRAL (GABINETE SAAS)</strong> — Governança global de lojistas; comissão de entregas da plataforma em breve.</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="router.navigate(['/os'])"
              class="bg-white/5 hover:bg-white/10 text-stone-200 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-mono-code font-bold flex items-center gap-1 cursor-pointer">
              <mat-icon class="text-xs text-amber-400">desktop_windows</mat-icon>
              <span>Pilar 2 (Store OS)</span>
            </button>
            <button
              type="button"
              (click)="router.navigate(['/home'])"
              class="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-[10px] font-mono-code font-bold flex items-center gap-1 cursor-pointer">
              <mat-icon class="text-xs text-emerald-400">storefront</mat-icon>
              <span>Pilar 3 (Marketplace)</span>
            </button>
          </div>
        </div>

        <!-- QUICK EXECUTIVE METRICS (VARIATION 8 STATS GRID) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Lojas ativas</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-white my-1">{{ ecosystem.hqOverview()?.activeTenantsCount ?? '—' }}</div>
            <div class="font-mono-code text-[10px] text-emerald-400 flex items-center gap-1">
              <span>Contagem retornada pelo servidor</span>
            </div>
          </div>

          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Comissão da plataforma</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-emerald-400 my-1">
              {{ hqCommissionDisplay() }}
            </div>
            <div class="font-mono-code text-[10px] text-stone-400">
              @if (ecosystem.hqOverview()?.platformDeliveryCommissionStatus === 'coming_soon') {
                Recurso em breve; depende da rede própria de entregadores e da inteligência de operação.
              } @else {
                {{ ecosystem.hqOverview()?.platformDeliveryOrdersCount ?? 0 }} entrega(s) elegíveis; taxa atual {{ ecosystem.hqOverview()?.defaultCommissionPercent ?? '—' }}%
              }
            </div>
          </div>

          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Cadastros marcados online</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-white my-1">
              {{ ecosystem.hqOverview()?.deviceRecordsMarkedOnline ?? '—' }} <span class="text-stone-500 text-sm font-normal">/ {{ ecosystem.hqOverview()?.totalDevices ?? '—' }}</span>
            </div>
            <div class="font-mono-code text-[10px] text-amber-400">
              Estado salvo; não há telemetria de hardware
            </div>
          </div>

          <div class="bg-[#16161a] border border-white/10 rounded-xl p-5 shadow-lg">
            <span class="font-mono-code text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Pedidos reais elegíveis</span>
            <div class="font-syne text-2xl sm:text-3xl font-extrabold text-white my-1">{{ ecosystem.hqOverview()?.totalOrders ?? '—' }}</div>
            <div class="font-mono-code text-[10px] text-stone-400">
              Soma de pedidos pagos ou concluídos
            </div>
          </div>
        </div>

        <!-- MAIN CONTROL CENTER: SUB-TABS (VARIATION 8 CONSOLE PANEL) -->
        <div class="bg-[#16161a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 min-h-[600px]">
          
          <!-- SUB-TAB NAVIGATION -->
          <div class="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
            @for (tab of subTabs; track tab.id) {
              <button
                type="button"
                (click)="activeSubTab.set(tab.id)"
                [class]="activeSubTab() === tab.id ? 'bg-amber-500 text-stone-950 font-bold shadow-lg' : 'bg-white/5 text-stone-300 hover:text-white border border-white/10'"
                class="px-4 py-2 rounded-lg text-xs font-mono-code flex items-center gap-2 transition-all cursor-pointer font-bold whitespace-nowrap">
                <mat-icon class="text-sm">{{ tab.icon }}</mat-icon> {{ tab.label }}
              </button>
            }
          </div>

          <!-- TAB CONTENT DELEGATION -->
          @switch (activeSubTab()) {
            @case ('tenants') {
              <app-hq-tenants-list (openGovernance)="openTenantGovernance($event)" (inspectRemote)="inspectRemoteStoreOs($event)" />
            }
            @case ('eapps') {
              <app-hq-eapps-catalog />
            }
            @case ('apps_preview') {
              <app-hq-apps-preview />
            }
            @case ('plans') {
              <app-hq-plans-pricing />
            }
            @case ('billing') {
              <app-hq-billing />
            }
            @case ('devices') {
              <app-hq-devices-list (openRegisterModal)="showRegisterDeviceModal.set(true)" />
            }
            @case ('ledger') {
              <app-hq-ledger />
            }
            @case ('regional') {
              <app-hq-regional-manager />
            }
            @case ('consumers') {
              <app-hq-crm />
            }
            @case ('system') {
              <app-hq-system-config />
            }
            @case ('audit') {
              <app-hq-audit />
            }
          }

        </div>

      </div>

      <!-- COMMAND PALETTE (CTRL+K) -->
      @if (showCommandPalette()) {
        <div class="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-start justify-center pt-24 p-4">
          <div class="bg-[#1d1008] border-2 border-amber-600/50 rounded-3xl max-w-xl w-full p-5 text-stone-200 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div class="flex items-center gap-3 bg-[#2b160b] border border-[#482814] rounded-2xl px-4 py-3">
              <mat-icon class="text-amber-500">search</mat-icon>
              <input 
                [value]="commandSearchQuery()"
                (input)="commandSearchQuery.set($any($event.target).value)"
                type="text" 
                placeholder="Busque por comandos, filiais ou logs..." 
                class="bg-transparent w-full text-sm text-white placeholder-stone-500 focus:outline-none">
              <span class="text-[10px] font-mono bg-[#1a0e07] text-stone-400 px-2 py-1 rounded border border-[#4d2813]">ESC</span>
            </div>

            <div class="space-y-1.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              <div class="text-[10px] font-mono font-bold text-amber-500 uppercase px-2 pb-1">Navegação do HQ</div>
              @for (cmd of commands; track cmd.id) {
                <button (click)="selectCommand(cmd.id)" class="w-full text-left px-4 py-3 rounded-xl hover:bg-[#2b160b] flex items-center justify-between text-xs transition-all cursor-pointer border-none">
                  <div class="flex items-center gap-3">
                    <mat-icon class="text-amber-400 text-sm">{{ cmd.icon }}</mat-icon>
                    <span class="font-bold text-white">{{ cmd.label }}</span>
                  </div>
                  <span class="font-mono text-[9px] text-stone-500">{{ cmd.sub }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- MODAL PROVISIONAR NOVA EMPRESA -->
      @if (showModal()) {
        <div class="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl max-w-lg w-full p-6 text-stone-950 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div class="flex justify-between items-center pb-3 border-b border-[#e8dfce]">
              <h3 class="font-serif font-black text-lg text-stone-900 flex items-center gap-2">
                <mat-icon class="text-amber-700">add_business</mat-icon> Provisionar Nova Unidade (Tenant)
              </h3>
              <button type="button" (click)="showModal.set(false)" class="text-stone-400 hover:text-stone-800 font-bold cursor-pointer">✕</button>
            </div>

            <div class="space-y-3 text-xs font-sans">
              <div>
                <label for="tName" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Nome da Empresa / Razão Social</label>
                <input id="tName" [value]="newTenantName()" (input)="newTenantName.set($any($event.target).value)" type="text" placeholder="Ex: Padaria Estrela LTDA" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none focus:border-amber-600 font-medium">
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="tCat" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Segmento</label>
                  <select id="tCat" [value]="newTenantCategory()" (change)="newTenantCategory.set($any($event.target).value)" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none cursor-pointer">
                    <option value="restaurant">Gastronomia</option>
                    <option value="retail">Varejo</option>
                    <option value="services">Serviços</option>
                  </select>
                </div>
                <div>
                  <label for="tPlan" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Plano SaaS</label>
                  <select id="tPlan" [value]="newTenantPlan()" (change)="newTenantPlan.set($any($event.target).value)" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none cursor-pointer font-bold text-amber-800">
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="tCnpj" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">CNPJ Fiscal</label>
                <input id="tCnpj" [value]="newTenantCnpj()" (input)="newTenantCnpj.set($any($event.target).value)" type="text" placeholder="00.000.000/0001-00" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 text-stone-950 focus:outline-none font-mono">
              </div>
            </div>

            <div class="flex gap-3 pt-4 border-t border-[#e8dfce]">
              <button (click)="showModal.set(false)" class="flex-1 bg-[#ebdcc7] text-stone-800 font-bold py-3 rounded-xl border border-[#d6c3aa] text-xs transition-all cursor-pointer">Cancelar</button>
              <button type="button" (click)="createTenant()" [disabled]="isProvisioningTenant() || !newTenantName().trim() || newTenantCnpjDigits().length !== 14" class="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-stone-950 font-black py-3 rounded-xl shadow-lg text-xs uppercase transition-all active:scale-95 cursor-pointer disabled:opacity-50">{{ isProvisioningTenant() ? 'Salvando...' : 'Criar em período de teste' }}</button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL REGISTRAR DISPOSITIVO -->
      @if (showRegisterDeviceModal()) {
        <div class="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl max-w-lg w-full p-6 text-stone-950 space-y-4 shadow-2xl animate-in zoom-in-95">
             <div class="flex justify-between items-center pb-3 border-b border-[#e8dfce]">
               <h3 class="font-serif font-black text-lg text-stone-900 flex items-center gap-2">
                 <mat-icon class="text-amber-700">developer_board</mat-icon> Registro no inventário
               </h3>
               <button (click)="showRegisterDeviceModal.set(false)" class="text-stone-400 hover:text-stone-800 font-bold text-lg cursor-pointer">✕</button>
             </div>
             <div class="space-y-3 text-xs">
                <div>
                   <label for="devTargetTenant" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Destino do Terminal</label>
                   <select id="devTargetTenant" [value]="newDeviceTenantId()" (change)="newDeviceTenantId.set($any($event.target).value)" class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 font-medium cursor-pointer">
                      <option value="">Selecione o destino</option>
                      <option value="hq">Infraestrutura HQ Central (inventário)</option>
                      @for (t of ecosystem.tenants(); track t.id) {
                        <option [value]="t.id">🏪 Loja: {{ t.name }}</option>
                      }
                   </select>
                </div>
                <div>
                   <label for="devNameInput" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Nome do Terminal</label>
                   <input id="devNameInput" [value]="newDeviceName()" (input)="newDeviceName.set($any($event.target).value)" type="text" required class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2">
                </div>
                <div>
                   <label for="devSerialInput" class="block font-bold text-stone-800 mb-1 uppercase text-[10px]">Serial (S/N)</label>
                   <input id="devSerialInput" [value]="newDeviceSerial()" (input)="newDeviceSerial.set($any($event.target).value)" type="text" required class="w-full bg-white border border-[#d6c7b0] rounded-xl px-3 py-2 font-mono">
                </div>
             </div>
             <p class="text-[10px] text-amber-900">Este cadastro não pareia o hardware nem valida o serial com o fabricante.</p>
             <button type="button" (click)="registerDevice()" [disabled]="!newDeviceTenantId() || !newDeviceName().trim() || !newDeviceSerial().trim()" class="w-full bg-amber-600 text-stone-950 font-black py-3 rounded-xl shadow-lg text-xs uppercase mt-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50">Registrar no inventário</button>
          </div>
        </div>
      }

      @if (selectedTenantForGovernance()) {
        <app-hq-tenant-governance-modal
          [tenant]="selectedTenantForGovernance()!"
          (dismiss)="selectedTenantForGovernance.set(null)"
        />
      }

      @if (showDocModal()) {
        <app-hq-documentation-modal
          (dismiss)="showDocModal.set(false)"
        />
      }

    </div>
  `
})
export class HQCentralComponent implements OnInit {
  readonly ecosystem = inject(EcosystemService);
  readonly security = inject(SecurityService);
  readonly router = inject(Router);

  readonly bypassMobileWarning = signal<boolean>(false);
  readonly activeSubTab = signal<HQSubTab>('tenants');
  readonly showModal = signal<boolean>(false);
  readonly showRegisterDeviceModal = signal<boolean>(false);
  readonly showCommandPalette = signal<boolean>(false);
  readonly showDocModal = signal<boolean>(false);
  readonly selectedTenantForGovernance = signal<CompanyTenant | null>(null);

  readonly commandSearchQuery = signal<string>('');

  readonly newTenantName = signal<string>('');
  readonly newTenantCategory = signal<string>('restaurant');
  readonly newTenantCnpj = signal<string>('');
  readonly newTenantPlan = signal<string>('Professional');
  readonly newTenantCnpjDigits = computed(() => this.newTenantCnpj().replace(/\D/g, ''));
  readonly isProvisioningTenant = signal(false);

  readonly newDeviceTenantId = signal<string>('');
  readonly newDeviceName = signal<string>('');
  readonly newDeviceSerial = signal<string>('');
  readonly hqCommissionDisplay = computed(() => {
    const overview = this.ecosystem.hqOverview();
    if (!overview) return '—';
    if (overview.platformDeliveryCommissionStatus === 'coming_soon') return 'Em breve';
    return overview.estimatedCommissionRevenue === null
      ? '—'
      : `R$ ${overview.estimatedCommissionRevenue.toFixed(2)}`;
  });

  readonly subTabs: { id: HQSubTab; label: string; icon: string }[] = [
    { id: 'tenants', label: 'Portfólio de Lojas', icon: 'business' },
    { id: 'eapps', label: 'Catálogo de eApps (Store OS)', icon: 'apps' },
    { id: 'apps_preview', label: 'Prévia simulada de aplicativos', icon: 'smartphone' },
    { id: 'plans', label: 'Planos & Preços SaaS', icon: 'payments' },
    { id: 'billing', label: 'Pagamentos SaaS', icon: 'account_balance' },
    { id: 'devices', label: 'Inventário de Dispositivos', icon: 'developer_board' },
    { id: 'ledger', label: 'Comissão da Plataforma · Em breve', icon: 'schedule' },
    { id: 'regional', label: 'Portal Regional', icon: 'public' },
    { id: 'consumers', label: 'Diretório de consumidores', icon: 'people' },
    { id: 'system', label: 'Configurações globais', icon: 'settings_input_component' },
    { id: 'audit', label: 'Auditoria estrutural', icon: 'security' }
  ];

  readonly commands: CommandItem[] = [
    { id: 'tenants', label: 'Gerenciar Portfólio de Lojas', icon: 'business', sub: 'Sub-aba 1' },
    { id: 'eapps', label: 'Catálogo Mestre de eApps (Módulos OS)', icon: 'apps', sub: 'Sub-aba 2' },
    { id: 'apps_preview', label: 'Prévia simulada de aplicativos', icon: 'smartphone', sub: 'Sub-aba 3' },
    { id: 'devices', label: 'Inventário de dispositivos', icon: 'developer_board', sub: 'Sub-aba 4' },
    { id: 'ledger', label: 'Comissão da Plataforma · Em breve', icon: 'schedule', sub: 'Sub-aba 5' },
    { id: 'billing', label: 'Gerenciar pagamentos das assinaturas', icon: 'account_balance', sub: 'Cobranças SaaS' },
    { id: 'system', label: 'Configurações globais', icon: 'settings_input_component', sub: 'Sub-aba 9' }
  ];

  ngOnInit() {
    this.security.setPillar('hq');
    const session = this.ecosystem.currentSession();
    if (!session || session.role !== 'hq_admin') {
      this.ecosystem.notify('Acesso restrito: O HQ Central é exclusivo do Dono do Aplicativo.', 'warning');
      this.router.navigate(['/hq/login']);
      return;
    }
    this.ecosystem.syncHqFromBackend();
  }

  onWindowKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.showCommandPalette.update(v => !v);
    } else if (event.key === 'Escape') {
      this.showCommandPalette.set(false);
      this.showModal.set(false);
      this.showRegisterDeviceModal.set(false);
    }
  }

  selectCommand(tab: HQSubTab) {
    this.activeSubTab.set(tab);
    this.showCommandPalette.set(false);
  }

  inspectRemoteStoreOs(tenant: CompanyTenant) {
    this.ecosystem.currentTenantId.set(tenant.id);
    this.ecosystem.currentView.set('os');
    this.router.navigate(['/os']);
    this.ecosystem.notify(`Abrindo o Store OS de ${tenant.name} em modo de inspeção HQ.`, 'info');
  }

  openNewTenantModal() {
    this.showModal.set(true);
  }

  async createTenant() {
    const name = this.newTenantName().trim();
    const cnpj = this.newTenantCnpjDigits();
    if (!name || cnpj.length !== 14 || this.isProvisioningTenant()) {
      this.ecosystem.notify('Informe o nome da empresa e um CNPJ com 14 dígitos.', 'warning');
      return;
    }

    this.isProvisioningTenant.set(true);
    try {
      await this.ecosystem.addTenant({
        name,
        cnpj,
        category: this.newTenantCategory() as 'restaurant' | 'retail' | 'services',
        plan: this.newTenantPlan() as 'Starter' | 'Professional' | 'Enterprise'
      });
      this.showModal.set(false);
      this.newTenantName.set('');
      this.newTenantCnpj.set('');
      this.ecosystem.notify(
        this.security.isSimulated()
          ? 'Loja criada na simulação, em período de teste.'
          : 'Loja criada em período de teste. Complete o vínculo do responsável e o cadastro operacional antes de ativá-la.',
        'success'
      );
    } catch (err: unknown) {
      const message = (err as { error?: { error?: string } })?.error?.error;
      this.ecosystem.notify(message || 'Não foi possível criar a loja. Nenhum cadastro foi confirmado.', 'error');
    } finally {
      this.isProvisioningTenant.set(false);
    }
  }

  async registerDevice() {
    const tenantId = this.newDeviceTenantId();
    const deviceName = this.newDeviceName().trim();
    const serialNumber = this.newDeviceSerial().trim();
    if (!tenantId || !deviceName || !serialNumber) {
      this.ecosystem.notify('Selecione o destino e informe nome e serial do dispositivo.', 'warning');
      return;
    }

    try {
      await this.ecosystem.addDevice({ tenantId, deviceName, type: 'terminal', serialNumber });
      this.showRegisterDeviceModal.set(false);
      this.ecosystem.notify('Dispositivo registrado no inventário. A conexão física e a telemetria ainda não foram verificadas.', 'warning');
    } catch (err: unknown) {
      const deviceError = err as { error?: { error?: string }; message?: string };
      const message = deviceError?.error?.error || deviceError?.message;
      this.ecosystem.notify(message || 'Não foi possível registrar o dispositivo.', 'error');
    }
  }

  openTenantGovernance(tenant: CompanyTenant) {
    this.selectedTenantForGovernance.set(tenant);
  }
}
