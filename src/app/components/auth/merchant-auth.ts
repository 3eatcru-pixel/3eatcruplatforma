import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import { SecurityService } from '../../services/security.service';
import { CompanyTenant } from '../../models/ecosystem.model';

@Component({
  selector: 'app-merchant-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#0e0703] text-stone-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-amber-600 selection:text-white relative overflow-x-hidden">
      
      <!-- BACKGROUND TEXTURE -->
      <div class="absolute inset-0 pointer-events-none opacity-20 bg-carbon-pattern"></div>
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-2xl bg-[#190d06] border-2 border-[#4d2813] rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative z-10 space-y-6">
        
        <!-- HEADER -->
        <div class="flex items-center justify-between border-b border-[#3d200f] pb-5">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 text-stone-950 flex items-center justify-center font-black shadow-lg">
              <mat-icon class="text-2xl">point_of_sale</mat-icon>
            </div>
            <div>
              <div class="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest leading-none">
                3EATCRU STORE OS • PORTAL DO LOJISTA
              </div>
              <h2 class="text-xl font-serif font-black text-stone-100 mt-1">
                {{ authMode() === 'login' ? 'Acesso ao Terminal Lojista' : 'Cadastrar Minha Loja' }}
              </h2>
            </div>
          </div>

          <button
            type="button"
            (click)="router.navigate(['/'])"
            class="text-stone-400 hover:text-white p-2 rounded-xl bg-[#2a160b] border border-[#482814] transition-all cursor-pointer">
            <mat-icon class="text-sm">close</mat-icon>
          </button>
        </div>

        <!-- MODE SELECTOR TOGGLE (Only if not authenticated) -->
        @if (!currentSession()) {
          <div class="flex bg-[#100803] border border-[#3b1e0d] p-1.5 rounded-2xl">
            <button
              type="button"
              (click)="authMode.set('login')"
              [class]="authMode() === 'login' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md' : 'text-stone-400 hover:text-stone-200 font-bold'"
              class="flex-1 py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer">
              <mat-icon class="text-xs">login</mat-icon>
              <span>Já tenho Loja Cadastrada</span>
            </button>

            <button
              type="button"
              (click)="authMode.set('register')"
              [class]="authMode() === 'register' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md' : 'text-stone-400 hover:text-stone-200 font-bold'"
              class="flex-1 py-2.5 text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer">
              <mat-icon class="text-xs">add_business</mat-icon>
              <span>Cadastrar Minha Empresa</span>
            </button>
          </div>
        }

        <!-- AUTH STATE: UNKNOWN (Need to login with Google) -->
        @if (!currentSession()) {
          <div class="space-y-6 py-4">
            <div class="text-center space-y-2">
              <p class="text-sm text-stone-300">
                Para {{ authMode() === 'login' ? 'acessar sua loja' : 'registrar seu estabelecimento' }}, identifique-se com sua Conta Google.
              </p>
              <p class="text-[10px] text-stone-500 font-mono uppercase tracking-widest">
                Segurança Firebase Provedor Identitário
              </p>
            </div>

            <button
              type="button"
              (click)="onGoogleLogin()"
              [disabled]="loading()"
              class="w-full bg-white hover:bg-stone-100 text-stone-900 font-bold py-4 px-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-sm transition-all active:scale-98 cursor-pointer">
              <mat-icon class="text-amber-600">account_circle</mat-icon>
              <span>{{ loading() ? 'Conectando...' : 'Entrar com Google' }}</span>
            </button>

            <div class="relative flex py-1 items-center">
              <div class="flex-grow border-t border-[#3d200f]"></div>
              <span class="flex-shrink mx-3 text-[10px] font-mono text-stone-500 uppercase">Ou para testes</span>
              <div class="flex-grow border-t border-[#3d200f]"></div>
            </div>

            <button
              type="button"
              (click)="onSimulateMerchant()"
              class="w-full bg-[#201007] hover:bg-[#331a0b] text-amber-300 border border-[#482814] font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer transition-all active:scale-98">
              <mat-icon class="text-sm text-amber-400">desktop_windows</mat-icon>
              <span>Modo Simulação / Homologação (Operador Lojista)</span>
            </button>
          </div>
        } @else if (authMode() === 'register' && !isRegistered()) {
          <!-- STEP 2: Verified Store Details (Mandatory Legal & Address Data - P2.9) -->
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-3 p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-stone-950">
                  <mat-icon>verified_user</mat-icon>
                </div>
                <div>
                  <p class="text-xs font-bold text-amber-500">Identidade Verificada</p>
                  <p class="text-[10px] text-stone-400">{{ currentSession()?.email }}</p>
                </div>
              </div>
              <span class="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800 px-2.5 py-1 rounded-lg">
                Homologação Inicial (Trial)
              </span>
            </div>

            <form [formGroup]="registerForm" (ngSubmit)="onRegisterStore()" class="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <div class="space-y-1 sm:col-span-4">
                <label for="regStoreName" class="text-[10px] font-mono font-bold text-amber-400 uppercase">Nome Fantasia da Loja *</label>
                <input
                  id="regStoreName"
                  type="text"
                  formControlName="storeName"
                  placeholder="Ex: Burger Gourmet Jardins"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-2">
                <label for="regCategory" class="text-[10px] font-mono font-bold text-amber-400 uppercase">Segmento *</label>
                <select
                  id="regCategory"
                  formControlName="category"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono cursor-pointer">
                  <option value="Restaurante & Hamburgueria">Restaurante &amp; Hamburgueria</option>
                  <option value="Mercado & Conveniência">Mercado &amp; Conveniência</option>
                  <option value="Varejo & Serviços">Varejo &amp; Serviços</option>
                  <option value="Boutique & Moda">Boutique &amp; Moda</option>
                </select>
              </div>

              <div class="space-y-1 sm:col-span-3">
                <label for="regCnpj" class="text-[10px] font-mono font-bold text-amber-400 uppercase">CNPJ (14 dígitos) *</label>
                <input
                  id="regCnpj"
                  type="text"
                  formControlName="cnpj"
                  placeholder="00.000.000/0001-00"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-3">
                <label for="regPhone" class="text-[10px] font-mono font-bold text-amber-400 uppercase">Telefone Comercial (DDD) *</label>
                <input
                  id="regPhone"
                  type="tel"
                  formControlName="phone"
                  placeholder="(11) 99999-9999"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-4">
                <label for="regStreet" class="text-[10px] font-mono font-bold text-amber-400 uppercase">Logradouro / Rua *</label>
                <input
                  id="regStreet"
                  type="text"
                  formControlName="street"
                  placeholder="Av. Paulista"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-2">
                <label for="regNumber" class="text-[10px] font-mono font-bold text-amber-400 uppercase">Número *</label>
                <input
                  id="regNumber"
                  type="text"
                  formControlName="number"
                  placeholder="1000"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-2">
                <label for="regNeighborhood" class="text-[10px] font-mono font-bold text-amber-400 uppercase">Bairro *</label>
                <input
                  id="regNeighborhood"
                  type="text"
                  formControlName="neighborhood"
                  placeholder="Bela Vista"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-2">
                <label for="regCity" class="text-[10px] font-mono font-bold text-amber-400 uppercase">Cidade *</label>
                <input
                  id="regCity"
                  type="text"
                  formControlName="city"
                  placeholder="São Paulo"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-1">
                <label for="regState" class="text-[10px] font-mono font-bold text-amber-400 uppercase">UF *</label>
                <input
                  id="regState"
                  type="text"
                  maxlength="2"
                  formControlName="state"
                  placeholder="SP"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white uppercase outline-none font-mono">
              </div>

              <div class="space-y-1 sm:col-span-1">
                <label for="regZip" class="text-[10px] font-mono font-bold text-amber-400 uppercase">CEP *</label>
                <input
                  id="regZip"
                  type="text"
                  formControlName="zipCode"
                  placeholder="01310100"
                  class="w-full bg-[#0d0603] border border-[#3d200f] focus:border-amber-500 rounded-xl px-2.5 py-2 text-xs text-white outline-none font-mono">
              </div>

              <div class="sm:col-span-6 pt-2">
                <button
                  type="submit"
                  [disabled]="registerForm.invalid || loading()"
                  class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all active:scale-98">
                  <mat-icon class="text-base">{{ loading() ? 'sync' : 'add_business' }}</mat-icon>
                  <span>{{ loading() ? 'Validando Cadastro...' : 'Criar Empresa em Homologação & Abrir Store OS' }}</span>
                </button>
              </div>
            </form>
          </div>
        } @else if (currentSession()) {
          <!-- REDIRECTING STATE -->
          <div class="flex flex-col items-center justify-center py-12 space-y-6 text-center">
            <div class="relative">
              <div class="w-16 h-16 border-4 border-amber-900 border-t-amber-500 rounded-full animate-spin"></div>
              <mat-icon class="absolute inset-0 flex items-center justify-center text-amber-500">sync</mat-icon>
            </div>
            <div>
              <h3 class="text-lg font-serif font-bold text-white">Sincronizando Sessão...</h3>
              <p class="text-xs text-stone-400 mt-1">Carregando ambiente operacional da sua loja.</p>
            </div>
          </div>
        }

      </div>

    </div>
  `
})
export class MerchantAuthComponent implements OnInit {
  private readonly ecosystem = inject(EcosystemService);
  private readonly security = inject(SecurityService);
  readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly authMode = signal<'login' | 'register'>('login');
  readonly loading = signal(false);
  readonly currentSession = this.security.currentSession;
  readonly isRegistered = computed(() => this.security.isStoreStaff());

  ngOnInit() {
    this.security.setPillar('os');
  }

  readonly registerForm = this.fb.group({
    storeName: ['', [Validators.required, Validators.minLength(3)]],
    cnpj: ['', [Validators.required, Validators.minLength(14)]],
    phone: ['', [Validators.required, Validators.minLength(10)]],
    street: ['', [Validators.required, Validators.minLength(2)]],
    number: ['', [Validators.required]],
    neighborhood: ['', [Validators.required, Validators.minLength(2)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    zipCode: ['', [Validators.required]],
    category: ['Restaurante & Hamburgueria', [Validators.required]]
  });

  onSimulateMerchant() {
    this.ecosystem.loginAs('tenant_owner', 'lojista@3eatcru.com', 'Operador Homologação', 'Loja Modelo 3EAT', 'client');
    this.ecosystem.notify('Sessão de simulação do Lojista ativada com sucesso.', 'info');
    this.router.navigate(['/os']);
  }

  async onGoogleLogin() {
    this.loading.set(true);
    try {
      await this.security.loginWithGoogle();
      if (this.security.isStoreStaff()) {
        const tenantId = this.security.currentSession()?.tenantId;
        if (tenantId) {
          this.ecosystem.currentTenantId.set(tenantId);
        }
        this.ecosystem.notify('Acesso autorizado ao Store OS.', 'success');
        this.router.navigate(['/os']);
      } else if (this.security.currentSession() && this.authMode() === 'login') {
        this.ecosystem.notify(
          'Identidade verificada, mas nenhum estabelecimento vinculado. Cadastre sua loja para continuar.',
          'warning'
        );
        this.authMode.set('register');
      }
    } catch {
      this.ecosystem.notify('Erro ao autenticar com Google.', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  async onRegisterStore() {
    if (this.registerForm.invalid || !this.currentSession()) return;
    this.loading.set(true);

    const val = this.registerForm.getRawValue();
    const categoryMap: Record<string, CompanyTenant['category']> = {
      'Restaurante & Hamburgueria': 'restaurant',
      'Mercado & Conveniência': 'retail',
      'Varejo & Serviços': 'services',
      'Boutique & Moda': 'retail'
    };

    try {
      const result = await this.security.registerMerchant({
        storeName: val.storeName || '',
        cnpj: val.cnpj || '',
        phone: val.phone || '',
        address: {
          street: val.street || '',
          number: val.number || '',
          neighborhood: val.neighborhood || '',
          city: val.city || '',
          state: (val.state || '').toUpperCase(),
          zipCode: val.zipCode || ''
        },
        category: categoryMap[val.category || ''] || 'restaurant'
      });

      this.ecosystem.currentTenantId.set(result.tenantId);
      await this.ecosystem.tenantsService.fetchAllTenants().catch(() => []);
      this.ecosystem.notify(
        `Empresa ${val.storeName} registrada em homologação (Trial)! Aguarde ativação HQ para vitrine pública.`,
        'success'
      );
      this.router.navigate(['/os']);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar estabelecimento.';
      this.ecosystem.notify(message, 'error');
    } finally {
      this.loading.set(false);
    }
  }
}
