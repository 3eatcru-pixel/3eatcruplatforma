import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../services/ecosystem.service';
import { RegionalMarketplaceComponent } from './regional-marketplace';
import { CustomerStorefrontComponent } from './customer-storefront';

type MarketplaceMode = 'regional-area' | 'storefront';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-marketplace',
  imports: [CommonModule, MatIconModule, RegionalMarketplaceComponent, CustomerStorefrontComponent],
  template: `
    <div class="min-h-[calc(100vh-4rem)] bg-[#120a05] text-white">
      
      <!-- Top Sub-Navigation Mode Switcher -->
      <div class="bg-[#1b0f07] border-b border-[#3b2311] px-4 sm:px-6 py-3">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div class="flex items-center gap-2">
            <span class="text-[10px] uppercase tracking-wider text-[#b3855a] font-bold">Portal do Consumidor:</span>
            
            <div class="inline-flex bg-[#2a170a] p-1 rounded-xl border border-[#4d2f16] shadow-inner">
              <button
                type="button"
                (click)="activeMode.set('regional-area')"
                [class]="activeMode() === 'regional-area' ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white font-bold shadow' : 'text-[#c79d74] hover:text-white'"
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer">
                <mat-icon class="text-sm">location_city</mat-icon>
                <span>Todas na Área (Marketplace Regional)</span>
              </button>

              <button
                type="button"
                (click)="activeMode.set('storefront')"
                [class]="activeMode() === 'storefront' ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white font-bold shadow' : 'text-[#c79d74] hover:text-white'"
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer">
                <mat-icon class="text-sm">storefront</mat-icon>
                <span>Cardápio &amp; Catálogo da Loja</span>
              </button>
            </div>
          </div>

          <!-- Quick Info Pill & Consumer Login -->
          <div class="flex items-center gap-4 text-xs text-[#bda084]">
            @if (ecosystem.activeConsumer(); as consumer) {
              <div class="flex items-center gap-2 bg-[#2a170a] border border-amber-600/30 px-3 py-1 rounded-xl shadow-md">
                <div class="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-[10px]">
                  {{ consumer.name.charAt(0) }}
                </div>
                <span class="text-amber-200 font-bold">{{ consumer.name }}</span>
                <button (click)="ecosystem.logoutConsumer()" class="text-stone-500 hover:text-rose-400 transition-colors ml-1">
                  <mat-icon class="text-sm">logout</mat-icon>
                </button>
              </div>
            } @else {
              <button
                (click)="showLoginModal.set(true)"
                class="bg-[#2a170a] hover:bg-[#3b2311] text-amber-400 border border-amber-600/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer">
                <mat-icon class="text-sm">account_circle</mat-icon>
                <span>Entrar / Cadastro</span>
              </button>
            }

            <div class="hidden sm:flex items-center gap-3">
              @if (activeMode() === 'regional-area') {
                <span class="flex items-center gap-1">
                  <mat-icon class="text-amber-500 text-sm">radar</mat-icon>
                  <span>{{ ecosystem.tenants().length }} lojas</span>
                </span>
              } @else if (activeMode() === 'storefront') {
                <span class="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Direct KDS Sync</span>
                </span>
              }
            </div>
          </div>

        </div>
      </div>

      <!-- Mode Views -->
      @switch (activeMode()) {
        
        <!-- Mode 1: Regional Directory (Matches Screenshots) -->
        @case ('regional-area') {
          <app-regional-marketplace />
        }

        <!-- Mode 2: Local Storefront Menu & Checkout -->
        @case ('storefront') {
          <app-customer-storefront [showBackToRegional]="true" (backToRegional)="activeMode.set('regional-area')" />
        }
      }

    </div>

    <!-- CONSUMER LOGIN MODAL -->
    @if (showLoginModal()) {
      <div class="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-[#1d1008] border-2 border-amber-600/50 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
          
          <!-- Background glow -->
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-amber-600/10 blur-3xl rounded-full"></div>
          
          <div class="text-center relative z-10">
            <div class="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-stone-950 flex items-center justify-center font-black shadow-2xl mx-auto mb-4">
              <mat-icon class="text-3xl">lock_person</mat-icon>
            </div>
            <h3 class="font-serif font-black text-2xl text-white">Acessar Área do Consumidor</h3>
            <p class="text-stone-400 text-sm mt-2">Escolha uma conta de demonstração para testar o acesso (Governança HQ):</p>
          </div>

          <div class="space-y-3 relative z-10">
            @for (acc of ecosystem.consumerAccounts(); track acc.id) {
              <button
                (click)="onLogin(acc.email)"
                class="w-full bg-[#2a170a] hover:bg-[#3d200f] border border-amber-600/20 p-4 rounded-2xl flex items-center justify-between transition-all group cursor-pointer shadow-lg">
                <div class="flex items-center gap-3 text-left">
                  <div class="w-10 h-10 rounded-full bg-stone-900 border border-stone-800 text-amber-500 flex items-center justify-center font-bold">
                    {{ acc.name.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-bold text-white group-hover:text-amber-400 transition-colors">{{ acc.name }}</div>
                    <div class="text-[10px] text-stone-500 font-mono">{{ acc.email }}</div>
                  </div>
                </div>
                <mat-icon class="text-stone-700 group-hover:text-amber-500 transition-colors">login</mat-icon>
              </button>
            }
          </div>

          <button
            (click)="showLoginModal.set(false)"
            class="w-full text-stone-500 hover:text-white text-xs font-bold pt-2 transition-colors relative z-10">
            Voltar ao Navegador de Lojas
          </button>
        </div>
      </div>
    }
  `
})
export class MarketplaceComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly activeMode = signal<MarketplaceMode>('regional-area');
  readonly showLoginModal = signal<boolean>(false);

  onLogin(email: string) {
    this.ecosystem.loginConsumer(email);
    this.showLoginModal.set(false);
  }
}
