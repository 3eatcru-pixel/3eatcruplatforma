import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SecurityService } from '../../services/security.service';
import { EcosystemService } from '../../services/ecosystem.service';
import { UiNotificationService } from '../../services/ui-notification.service';
import { AppRole, PILLARS_CATALOG, PillarDefinition, SystemExecutionMode } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pillar-hud',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <!-- COLLAPSED FLOATING TRIGGER (WHEN MINIMIZED) -->
    @if (isCollapsed()) {
      <div class="fixed top-2 right-2 z-[9999] flex items-center gap-1.5 bg-[#140c06]/95 border border-[#482814] rounded-full p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in">
        <button
          type="button"
          (click)="isCollapsed.set(false)"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#26140a] hover:bg-[#381e0f] text-amber-300 transition-all cursor-pointer">
          <mat-icon class="text-xs text-amber-400">tune</mat-icon>
          <span>{{ currentPillarDef().shortName }}</span>
          <span
            class="w-2 h-2 rounded-full"
            [class]="security.isRealMode() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'">
          </span>
        </button>
      </div>
    }

    <!-- FULL PERSISTENT ARCHITECTURAL HUD RIBBON -->
    @if (!isCollapsed()) {
      <aside aria-label="Barra Arquitetural e Modos do Sistema" class="sticky top-0 z-[9999] bg-[#0d0704]/98 border-b border-[#3d200f] px-3 py-1.5 text-stone-200 text-xs shadow-2xl backdrop-blur-lg select-none transition-all">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          <!-- LEFT: CURRENT PILLAR WITH IDENTITY & BOUNDARY -->
          <div class="flex items-center gap-2">
            <!-- PILLAR NUMBER BADGE -->
            <div
              [class]="getPillarBadgeClass(currentPillarDef().colorScheme)"
              class="px-2.5 py-0.5 rounded-lg border font-mono font-black text-[10px] uppercase flex items-center gap-1 shadow-sm">
              <mat-icon class="text-xs">{{ currentPillarDef().icon }}</mat-icon>
              <span>PILAR {{ currentPillarDef().number }}: {{ currentPillarDef().name }}</span>
            </div>

            <!-- STORE OS CONTEXT (IF IN STORE SPECIFIC PILLAR) -->
            @if (currentPillarDef().isStoreSpecific) {
              <div class="hidden sm:flex items-center gap-1 text-[10px] font-mono bg-[#1c0f08] border border-[#482814] px-2 py-0.5 rounded-lg text-amber-300 truncate max-w-[220px]">
                <mat-icon class="text-[11px] text-amber-400 shrink-0">store</mat-icon>
                <span class="truncate">{{ activeStoreName() }}</span>
              </div>
            }

            <!-- BOUNDARY GUARD NOTICE (DESKTOP) -->
            <span class="hidden lg:inline-block text-[10px] font-mono text-stone-400 truncate max-w-xs">
              {{ currentPillarDef().subtitle }}
            </span>
          </div>

          <!-- CENTER: REAL VS SIMULATION EXECUTION MODE BADGE & TOGGLE -->
          <div class="flex items-center gap-2">
            @if (security.isRealMode()) {
              <div
                class="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 px-2.5 py-0.5 rounded-lg font-mono font-bold text-[10px] shadow-sm"
                title="Usa a sessão Firebase e as APIs reais; cada área confirma a conexão ao carregar dados.">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>MODO REAL (PRODUÇÃO)</span>
              </div>
            } @else {
              <div
                class="flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/60 text-amber-300 px-2.5 py-0.5 rounded-lg font-mono font-bold text-[10px] shadow-sm animate-pulse"
                title="Operando em Sandbox e Memória Local Isolada">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>MODO SIMULAÇÃO (SANDBOX DEMO)</span>
              </div>
            }

            <button
              type="button"
              (click)="toggleExecutionMode()"
              [disabled]="isChangingExecutionMode()"
              [class]="security.isRealMode() ? 'bg-[#2a170c] hover:bg-[#3d200f] text-amber-300 border-[#4d2813]' : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-600/50'"
              class="border px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1 disabled:cursor-wait disabled:opacity-50"
              title="Clique para alternar entre Modo Real e Modo Simulação">
              <mat-icon class="text-xs">sync_alt</mat-icon>
              <span>{{ isChangingExecutionMode() ? 'TROCANDO…' : security.isRealMode() ? 'Alternar p/ Simulação' : 'Alternar p/ Real' }}</span>
            </button>
          </div>

          <!-- RIGHT: ACTION CONTROLS & NAVIGATION -->
          <div class="flex items-center gap-1.5">
            <!-- PILLARS MODAL BUTTON -->
            <button
              type="button"
              (click)="showPillarsModal.set(true)"
              class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold flex items-center gap-1 shadow cursor-pointer transition-transform active:scale-95">
              <mat-icon class="text-xs">account_tree</mat-icon>
              <span>Pilares 1 a 7</span>
            </button>

            <!-- ARCHITECTURAL MATRIX GUIDE BUTTON -->
            <button
              type="button"
              (click)="showMatrixModal.set(true)"
              class="bg-[#241309] hover:bg-[#361c0d] text-amber-300 border border-[#482814] px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm">
              <mat-icon class="text-xs text-amber-400">menu_book</mat-icon>
              <span class="hidden sm:inline">Guia Real vs Simulação</span>
              <span class="sm:hidden">Guia</span>
            </button>

            <!-- MINIMIZE BUTTON -->
            <button
              type="button"
              (click)="isCollapsed.set(true)"
              class="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Recolher barra do topo">
              <mat-icon class="text-sm">expand_less</mat-icon>
            </button>
          </div>

        </div>
      </aside>
    }

    <!-- MODAL 1: NAVEGADOR DE PILARES (1 A 7) -->
    @if (showPillarsModal()) {
      <div class="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div class="bg-[#140b06] border-2 border-[#4d2813] rounded-3xl p-6 sm:p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl text-stone-200 font-sans custom-scrollbar">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-[#3d200f] pb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-lg">
                <mat-icon class="text-2xl">account_tree</mat-icon>
              </div>
              <div>
                <span class="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  Navegação dos 7 Pilares Arquiteturais
                </span>
                <h2 class="text-xl sm:text-2xl font-serif font-black text-white">
                  Estrutura &amp; Fronteiras da Plataforma 3EATCRU
                </h2>
              </div>
            </div>

            <button
              type="button"
              (click)="showPillarsModal.set(false)"
              class="w-10 h-10 rounded-2xl bg-[#26140a] hover:bg-[#381e0f] text-stone-300 hover:text-white flex items-center justify-center border border-[#482814] cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- SUMMARY WARNING BOX -->
          <div class="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 text-xs space-y-1.5 text-amber-200">
            <div class="font-bold flex items-center gap-1.5">
              <mat-icon class="text-sm text-amber-400">warning</mat-icon>
              <span>REGRA DE OURO ARQUITETURAL:</span>
            </div>
            <p class="text-stone-300 text-[11px] leading-relaxed">
              O <strong>Pilar 1 (HQ Central)</strong> governa o ecossistema SaaS inteiro e não é uma loja.
              O <strong>Pilar 2 (Store OS)</strong> é o terminal da loja física (PDV/ERP).
              O <strong>Pilar 3 (Marketplace)</strong> é a vitrine pública de compras do cliente consumidor.
              Nunca confunda nem misture as telas ou dados destes três ambientes!
            </p>
          </div>

          <!-- 7 PILLARS GRID -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (pillar of pillarsCatalog; track pillar.number) {
              <div
                [class]="pillar.id === currentPillarDef().id ? 'border-amber-500 ring-2 ring-amber-500/30 bg-[#1e1008]' : 'border-[#3d200f] bg-[#170c06]'"
                class="border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all hover:border-[#633319]">
                
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span
                      [class]="getPillarBadgeClass(pillar.colorScheme)"
                      class="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase border">
                      PILAR {{ pillar.number }}
                    </span>
                    @if (pillar.id === currentPillarDef().id) {
                      <span class="text-[9px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-700/50">
                        Ativo Agora
                      </span>
                    }
                  </div>

                  <div class="flex items-center gap-2">
                    <mat-icon class="text-amber-400 text-lg">{{ pillar.icon }}</mat-icon>
                    <h3 class="font-serif font-black text-white text-base leading-tight">{{ pillar.name }}</h3>
                  </div>

                  <p class="text-[10px] font-mono text-stone-400">{{ pillar.subtitle }}</p>

                  <div class="text-[11px] text-stone-300 bg-black/30 p-2.5 rounded-xl border border-[#2b170c] space-y-1">
                    <div class="text-[9px] font-mono font-bold text-emerald-400 uppercase">O QUE FAZ:</div>
                    <p class="leading-snug">{{ pillar.whatItDoes }}</p>
                  </div>

                  <div class="text-[11px] text-rose-300 bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/40 space-y-1">
                    <div class="text-[9px] font-mono font-bold text-rose-400 uppercase">❌ O QUE NÃO FAZ:</div>
                    <p class="leading-snug">{{ pillar.whatItDoesNotDo }}</p>
                  </div>
                </div>

                <div class="pt-2 border-t border-[#2b170c] flex items-center justify-between">
                  <span class="text-[9px] font-mono text-stone-500">{{ pillar.route }}</span>
                  <button
                    type="button"
                    (click)="navigateToPillar(pillar)"
                    class="bg-[#2a170c] hover:bg-[#3d200f] text-amber-300 border border-[#4d2813] px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 shadow active:scale-95">
                    <span>Acessar</span>
                    <mat-icon class="text-xs">arrow_forward</mat-icon>
                  </button>
                </div>

              </div>
            }
          </div>

        </div>
      </div>
    }

    <!-- MODAL 2: MATRIZ DE COMPARAÇÃO REAL VS SIMULAÇÃO & GUIA DE PAPÉIS -->
    @if (showMatrixModal()) {
      <div class="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div class="bg-[#140b06] border-2 border-[#4d2813] rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl text-stone-200 font-sans custom-scrollbar">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-[#3d200f] pb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-500 text-stone-950 flex items-center justify-center font-black shadow-lg">
                <mat-icon class="text-2xl">compare_arrows</mat-icon>
              </div>
              <div>
                <span class="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  Matriz de Execução &amp; Homologação
                </span>
                <h2 class="text-xl sm:text-2xl font-serif font-black text-white">
                  Modo Real vs Modo Simulação
                </h2>
              </div>
            </div>

            <button
              type="button"
              (click)="showMatrixModal.set(false)"
              class="w-10 h-10 rounded-2xl bg-[#26140a] hover:bg-[#381e0f] text-stone-300 hover:text-white flex items-center justify-center border border-[#482814] cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- COMPARISON COLUMNS -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- COLUMN 1: MODO REAL -->
            <div class="border-2 border-emerald-600/70 bg-emerald-950/20 rounded-2xl p-5 space-y-4">
              <div class="flex items-center justify-between border-b border-emerald-700/50 pb-3">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h3 class="font-serif font-black text-white text-lg">Modo Real (Produção)</h3>
                </div>
                @if (security.isRealMode()) {
                  <span class="bg-emerald-500 text-stone-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded">ATIVO</span>
                }
              </div>

              <ul class="space-y-2 text-xs text-stone-300 font-sans">
                <li class="flex items-start gap-2">
                  <mat-icon class="text-emerald-400 text-sm shrink-0 mt-0.5">check_circle</mat-icon>
                  <span><strong>Dados:</strong> Cada recurso usa sua API real quando esse fluxo está implementado; o modo selecionado não comprova disponibilidade nem persistência de todos os módulos.</span>
                </li>
                <li class="flex items-start gap-2">
                  <mat-icon class="text-emerald-400 text-sm shrink-0 mt-0.5">check_circle</mat-icon>
                  <span><strong>Autenticação:</strong> Endpoints protegidos validam o token Firebase e determinam papel/tenant no servidor.</span>
                </li>
                <li class="flex items-start gap-2">
                  <mat-icon class="text-emerald-400 text-sm shrink-0 mt-0.5">check_circle</mat-icon>
                  <span><strong>Pagamentos:</strong> A integração depende do recurso e das credenciais configuradas; checkout SaaS e recebimento dos pedidos da loja são fluxos separados.</span>
                </li>
                <li class="flex items-start gap-2">
                  <mat-icon class="text-emerald-400 text-sm shrink-0 mt-0.5">check_circle</mat-icon>
                  <span><strong>Fiscal:</strong> Emissão de NF-e/NFC-e não está implementada. Registros exibidos pelo OS não substituem livro fiscal.</span>
                </li>
              </ul>

              <button
                type="button"
                [disabled]="security.isRealMode()"
                (click)="setMode('real')"
                class="w-full py-2.5 rounded-xl font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white">
                <mat-icon class="text-sm">verified</mat-icon>
                <span>{{ security.isRealMode() ? 'Já está em Modo Real' : 'Ativar Modo Real' }}</span>
              </button>
            </div>

            <!-- COLUMN 2: MODO SIMULAÇÃO -->
            <div class="border-2 border-amber-600/70 bg-amber-950/20 rounded-2xl p-5 space-y-4">
              <div class="flex items-center justify-between border-b border-amber-700/50 pb-3">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-amber-400"></span>
                  <h3 class="font-serif font-black text-white text-lg">Modo Simulação (Sandbox)</h3>
                </div>
                @if (security.isSimulated()) {
                  <span class="bg-amber-500 text-stone-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded">ATIVO</span>
                }
              </div>

              <ul class="space-y-2 text-xs text-stone-300 font-sans">
                <li class="flex items-start gap-2">
                  <mat-icon class="text-amber-400 text-sm shrink-0 mt-0.5">science</mat-icon>
                  <span><strong>Dados locais:</strong> Os serviços com fluxo simulado usam estado em memória; módulos sem esse fluxo continuam indisponíveis ou dependem da API real.</span>
                </li>
                <li class="flex items-start gap-2">
                  <mat-icon class="text-amber-400 text-sm shrink-0 mt-0.5">science</mat-icon>
                  <span><strong>Perfis Rápidos:</strong> Teste qualquer papel (HQ, Lojista, Garçom, Motoboy) com 1 clique.</span>
                </li>
                <li class="flex items-start gap-2">
                  <mat-icon class="text-amber-400 text-sm shrink-0 mt-0.5">science</mat-icon>
                  <span><strong>Prévia:</strong> Telas demonstrativas não controlam impressora, balança, leitor ou outro hardware.</span>
                </li>
                <li class="flex items-start gap-2">
                  <mat-icon class="text-amber-400 text-sm shrink-0 mt-0.5">science</mat-icon>
                  <span><strong>Uso:</strong> Demonstrações e verificações funcionais dos fluxos simulados; não é teste de carga nem homologação de integrações.</span>
                </li>
              </ul>

              <div class="space-y-2 pt-2 border-t border-amber-700/40">
                <span class="text-[10px] font-mono font-bold text-amber-400 block uppercase">
                  Simular Persona Instantânea:
                </span>
                <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <button
                    type="button"
                    (click)="simulateRole('hq_admin')"
                    class="p-1.5 rounded-lg bg-[#2a170c] hover:bg-[#3d200f] text-stone-200 border border-[#482814] cursor-pointer text-left">
                    👑 HQ Super Admin
                  </button>
                  <button
                    type="button"
                    (click)="simulateRole('tenant_owner')"
                    class="p-1.5 rounded-lg bg-[#2a170c] hover:bg-[#3d200f] text-stone-200 border border-[#482814] cursor-pointer text-left">
                    🏬 Dono de Loja (OS)
                  </button>
                  <button
                    type="button"
                    (click)="simulateRole('operator')"
                    class="p-1.5 rounded-lg bg-[#2a170c] hover:bg-[#3d200f] text-stone-200 border border-[#482814] cursor-pointer text-left">
                    💳 Operador de Caixa
                  </button>
                  <button
                    type="button"
                    (click)="simulateRole('waiter')"
                    class="p-1.5 rounded-lg bg-[#2a170c] hover:bg-[#3d200f] text-stone-200 border border-[#482814] cursor-pointer text-left">
                    🍽️ Garçom de Salão
                  </button>
                  <button
                    type="button"
                    (click)="simulateRole('driver')"
                    class="p-1.5 rounded-lg bg-[#2a170c] hover:bg-[#3d200f] text-stone-200 border border-[#482814] cursor-pointer text-left">
                    🛵 Motoboy / Entregador
                  </button>
                  <button
                    type="button"
                    (click)="simulateRole('consumer')"
                    class="p-1.5 rounded-lg bg-[#2a170c] hover:bg-[#3d200f] text-stone-200 border border-[#482814] cursor-pointer text-left">
                    🛍️ Consumidor Final
                  </button>
                </div>
              </div>

            </div>

          </div>

          <!-- FOOTER ACTION -->
          <div class="flex justify-end pt-3 border-t border-[#3d200f]">
            <button
              type="button"
              (click)="showMatrixModal.set(false)"
              class="px-5 py-2.5 bg-[#2a170c] hover:bg-[#3d200f] text-stone-200 border border-[#4d2813] rounded-xl text-xs font-mono font-bold cursor-pointer">
              Fechar Guia
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class PillarHudComponent {
  readonly security = inject(SecurityService);
  readonly ecosystem = inject(EcosystemService);
  readonly notifications = inject(UiNotificationService);
  readonly router = inject(Router);

  readonly isCollapsed = signal<boolean>(false);
  readonly showPillarsModal = signal<boolean>(false);
  readonly showMatrixModal = signal<boolean>(false);
  readonly isChangingExecutionMode = signal(false);

  readonly pillarsCatalog = PILLARS_CATALOG;

  readonly currentPillarDef = computed<PillarDefinition>(() => {
    const curPillar = this.security.currentPillar();
    const found = this.pillarsCatalog.find((p) => p.id === curPillar);
    if (found) return found;

    // Fallback based on router URL if not matched
    const url = this.router.url;
    if (url.startsWith('/hq')) return this.pillarsCatalog[0];
    if (url.startsWith('/os') || url.startsWith('/pos')) return this.pillarsCatalog[1];
    if (url.startsWith('/p/')) return this.pillarsCatalog[3];
    if (url.startsWith('/waiter')) return this.pillarsCatalog[4];
    if (url.startsWith('/driver')) return this.pillarsCatalog[5];
    return this.pillarsCatalog[2]; // Default: Marketplace
  });

  readonly activeStoreName = computed(() => {
    return this.ecosystem.currentTenant()?.name || 'Estabelecimento Ativo';
  });

  getPillarBadgeClass(color: string): string {
    switch (color) {
      case 'rose':
        return 'bg-rose-950/80 text-rose-300 border-rose-600/70';
      case 'amber':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/70';
      case 'emerald':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70';
      case 'cyan':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70';
      case 'orange':
        return 'bg-orange-950/80 text-orange-300 border-orange-600/70';
      case 'purple':
        return 'bg-purple-950/80 text-purple-300 border-purple-600/70';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  }

  async toggleExecutionMode() {
    if (this.isChangingExecutionMode()) return;
    const targetMode = this.security.isRealMode() ? 'simulation' : 'real';
    const session = this.security.currentSession();
    await this.changeExecutionMode(
      targetMode,
      session?.role ?? 'tenant_owner',
      session?.tenantId ?? (session?.role === 'hq_admin' ? 'hq' : 'tenant-sp-001'),
      session?.tenantName ?? (session?.role === 'hq_admin' ? '3EATCRU HQ Central' : 'Burger & Co. Jardins')
    );
  }

  async setMode(mode: SystemExecutionMode) {
    this.showMatrixModal.set(false);
    const session = this.security.currentSession();
    await this.changeExecutionMode(
      mode,
      session?.role ?? 'tenant_owner',
      session?.tenantId ?? (session?.role === 'hq_admin' ? 'hq' : 'tenant-sp-001'),
      session?.tenantName ?? (session?.role === 'hq_admin' ? '3EATCRU HQ Central' : 'Burger & Co. Jardins')
    );
  }

  simulateRole(role: AppRole) {
    this.security.setExecutionMode('simulation', role);
    this.ecosystem.resetForExecutionMode(true);
    this.showMatrixModal.set(false);
    this.showPillarsModal.set(false);
    this.notifications.notify(
      `🧪 Perfil simulado: ${role}. Ambiente sandbox ativo.`,
      'info'
    );

    // Contextual navigation assistance
    if (role === 'hq_admin') {
      this.router.navigate(['/hq']);
    } else if (role === 'tenant_owner' || role === 'operator') {
      this.router.navigate(['/os']);
    } else if (role === 'waiter') {
      this.router.navigate(['/waiter']);
    } else if (role === 'driver') {
      this.router.navigate(['/driver']);
    } else if (role === 'consumer') {
      this.router.navigate(['/home']);
    }
  }

  private async changeExecutionMode(
    mode: SystemExecutionMode,
    role: AppRole,
    tenantId: string,
    tenantName: string
  ) {
    if (this.isChangingExecutionMode()) return;
    this.isChangingExecutionMode.set(true);
    try {
      const transition = this.security.setExecutionModeAndWait(mode, role, tenantId, tenantName);
      this.ecosystem.resetForExecutionMode(mode === 'simulation');
      const session = await transition;

      if (mode === 'real' && this.security.currentPillar() === 'hq' && session?.role !== 'hq_admin') {
        this.notifications.notify('A sessão real não tem acesso ao HQ. Entre com uma conta hq_admin.', 'warning');
        this.router.navigate(['/hq/login']);
        return;
      }

      if (mode === 'real') {
        const refreshed = await this.refreshCurrentPillar();
        if (!refreshed) {
          this.notifications.notify('Modo real ativado, mas não foi possível atualizar os dados desta área.', 'warning');
          return;
        }
      }

      this.notifications.notify(
        mode === 'real'
          ? '🟢 Modo real ativo. Os dados da área atual foram atualizados.'
          : '🧪 Modo de simulação ativo. Os dados reais foram removidos da tela.',
        mode === 'real' ? 'success' : 'info'
      );
    } catch {
      this.notifications.notify('Não foi possível trocar o modo de execução.', 'error');
    } finally {
      this.isChangingExecutionMode.set(false);
    }
  }

  private async refreshCurrentPillar(): Promise<boolean> {
    switch (this.security.currentPillar()) {
      case 'hq':
        return this.ecosystem.syncHqFromBackend();
      case 'os':
      case 'waiter':
        return this.ecosystem.syncStoreOsFromBackend();
      case 'marketplace':
      case 'storefront':
      case 'consumer':
        return this.ecosystem.syncMarketplaceFromBackend();
      case 'driver':
        try {
          await Promise.all([
            this.ecosystem.logisticsService.fetchDrivers(),
            this.ecosystem.logisticsService.fetchDeliveryRoutes()
          ]);
          return true;
        } catch {
          return false;
        }
      case 'backend':
        return true;
      default:
        return true;
    }
  }

  navigateToPillar(pillar: PillarDefinition) {
    this.showPillarsModal.set(false);
    this.security.setPillar(pillar.id);

    if (pillar.id === 'backend') {
      this.notifications.notify(
        'Pilar 7 (Núcleo Transacional Backend): Motor interno Express 5, CommerceEngine e firestore.rules Zero-Trust.',
        'info'
      );
      return;
    }

    this.router.navigate([pillar.route]);
  }
}
