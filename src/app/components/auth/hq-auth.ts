import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { EcosystemService } from '../../services/ecosystem.service';
import { SecurityService } from '../../services/security.service';

@Component({
  selector: 'app-hq-auth',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#0d0604] text-stone-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-rose-600 selection:text-white relative overflow-x-hidden">
      
      <!-- BACKGROUND TEXTURE & GLOW -->
      <div class="absolute inset-0 pointer-events-none opacity-25 bg-carbon-pattern"></div>
      <div class="absolute -top-32 -right-32 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-lg bg-[#180906] border-2 border-rose-600/70 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative z-10 space-y-6">
        
        <!-- HEADER -->
        <div class="flex items-center justify-between border-b border-[#3d200f] pb-5">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 via-rose-700 to-amber-700 text-white flex items-center justify-center font-black shadow-lg">
              <mat-icon class="text-2xl">security</mat-icon>
            </div>
            <div>
              <div class="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest leading-none">
                3EATCRU HQ CENTRAL • GABINETE MESTRE
              </div>
              <h2 class="text-xl font-serif font-black text-white mt-1">
                Acesso Restrito ao Dono do App
              </h2>
            </div>
          </div>

          <span class="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono px-3 py-1 rounded-full uppercase font-bold shrink-0">
            Super Admin
          </span>
        </div>

        <!-- ADVISORY BOX -->
        <div class="bg-rose-950/40 border border-rose-700/50 rounded-2xl p-4 text-xs space-y-1.5 text-stone-300">
          <div class="flex items-center gap-2 text-rose-400 font-bold uppercase font-mono text-[11px]">
            <mat-icon class="text-sm">verified</mat-icon>
            <span>Console de Governança e Banco Global</span>
          </div>
          <p class="text-[11px] leading-relaxed text-stone-300">
            Este portal é reservado aos diretores do ecossistema para gerenciar tenants, acompanhar a preparação da futura comissão das entregas da plataforma, o inventário de dispositivos e as praças regionais.
          </p>
        </div>

        <!-- AUTH ACTION -->
        <div class="space-y-4">
          <p class="text-xs text-stone-400 text-center font-mono uppercase tracking-tighter">
            Identificação via Identidade Corporativa Firebase
          </p>
          
          <button
            type="button"
            (click)="onLogin()"
            [disabled]="loading()"
            class="w-full bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 hover:from-rose-500 hover:to-amber-600 text-white font-black py-4 px-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all active:scale-98">
            <mat-icon class="text-xl">login</mat-icon>
            <span>{{ loading() ? 'Autenticando...' : 'Entrar com Google Admin' }}</span>
          </button>

          <div class="relative flex py-1 items-center">
            <div class="flex-grow border-t border-[#3d200f]"></div>
            <span class="flex-shrink mx-3 text-[10px] font-mono text-stone-500 uppercase">Ou para testes</span>
            <div class="flex-grow border-t border-[#3d200f]"></div>
          </div>

          <button
            type="button"
            (click)="onSimulateHqAdmin()"
            class="w-full bg-[#200d08] hover:bg-[#33150d] text-amber-300 border border-amber-600/40 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer transition-all active:scale-98">
            <mat-icon class="text-sm text-amber-400">admin_panel_settings</mat-icon>
            <span>Modo Simulação / Homologação (Dono do App)</span>
          </button>

          <p class="text-[10px] text-center text-rose-500/60 font-mono italic">
            * Acesso validado via Firebase Custom Claim (role = hq_admin) ou Modo Simulação Homologado.
          </p>
        </div>

      </div>

    </div>
  `
})
export class HqAuthComponent implements OnInit {
  private readonly ecosystem = inject(EcosystemService);
  private readonly security = inject(SecurityService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  ngOnInit() {
    this.security.setPillar('hq');
  }

  onSimulateHqAdmin() {
    this.security.setPillar('hq');
    this.ecosystem.loginAs('hq_admin', '3eatcru@gmail.com', 'Dono do App (Simulação)', '3EATCRU HQ Central', 'hq');
    this.ecosystem.notify('Sessão de simulação do Dono do App ativada com sucesso.', 'info');
    this.router.navigate(['/hq']);
  }

  async onLogin() {
    this.security.setPillar('hq');
    this.loading.set(true);
    try {
      await this.security.loginWithGoogle();
      const session = this.security.currentSession();
      
      if (session && session.role === 'hq_admin') {
        this.ecosystem.notify('Acesso autorizado ao Gabinete HQ Central.', 'success');
        this.router.navigate(['/hq']);
      } else {
        this.ecosystem.notify('Acesso negado: Identidade não possui privilégios de Administrador Global.', 'error');
        await this.security.logout();
      }
    } catch {
      this.ecosystem.notify('Falha na autenticação via Google.', 'error');
    } finally {
      this.loading.set(false);
    }
  }
}
