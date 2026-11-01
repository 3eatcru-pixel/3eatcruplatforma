import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-mobile-warning',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="block md:hidden min-h-screen w-full bg-[#0d0704] text-stone-200 overflow-y-auto p-4 sm:p-6 font-sans relative z-50">
      <div class="max-w-md mx-auto space-y-5 pb-10">
        
        <div class="flex items-center justify-between border-b border-[#3d200f] pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center font-black shadow-lg">
              <mat-icon class="text-xl">desktop_windows</mat-icon>
            </div>
            <div>
              <div class="font-serif font-black text-amber-400 text-sm tracking-wider">3EATCRU STORE OS</div>
              <div class="text-[9px] font-mono text-stone-400 font-bold uppercase tracking-widest">TERMINAL DA UNIDADE</div>
            </div>
          </div>
          <span class="bg-amber-950/80 text-amber-300 border border-amber-700/60 text-[9px] font-mono px-2.5 py-1 rounded-full uppercase font-bold">
            Desktop &amp; Tablet
          </span>
        </div>

        <div class="bg-[#190c05] border-2 border-amber-600/70 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <mat-icon class="text-3xl">devices</mat-icon>
          </div>
          <div class="space-y-2">
            <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 block">
              DIRETRIZ DE HARDWARE &amp; USABILIDADE
            </span>
            <h2 class="font-serif font-black text-xl text-white leading-tight">
              Ambiente Operacional Exclusivo para Computadores e Tablets
            </h2>
            <p class="text-xs text-stone-300 leading-relaxed">
              O <strong>Store OS</strong> é a estação web de operação da loja. O PDV está conectado; outras janelas do catálogo podem aparecer como ainda não integradas.
            </p>
            <p class="text-[11px] text-stone-400 leading-relaxed">
              Para garantir máxima agilidade, velocidade no leitor e controle das comandas, a interface completa foi desenhada exclusivamente para telas a partir de <strong>768px</strong>.
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <button
            type="button"
            (click)="router.navigate(['/marketplace'])"
            class="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black py-4 px-5 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 text-xs uppercase tracking-wider cursor-pointer active:scale-98 transition-all">
            <mat-icon class="text-base">storefront</mat-icon>
            <span>Explorar Marketplace Público</span>
          </button>

          <button
            type="button"
            (click)="router.navigate(['/seja-parceiro'])"
            class="w-full bg-[#201007] hover:bg-[#2e170b] text-amber-300 border border-[#482814] font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs cursor-pointer transition-all">
            <mat-icon class="text-base text-amber-400">business</mat-icon>
            <span>Você tem um negócio? Conheça o 3eatcru OS</span>
          </button>
        </div>

        <div class="bg-[#140a04] border border-[#381c0c] rounded-2xl p-4 space-y-3">
          <div class="flex items-center gap-2 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider">
            <mat-icon class="text-xs">smartphone</mat-icon>
            <span>Rotas web auxiliares para celular</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              (click)="router.navigate(['/waiter'])"
              class="bg-[#1f0d05] border border-[#482814] hover:border-amber-500/60 p-3 rounded-xl text-left transition-all cursor-pointer">
              <div class="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                <mat-icon class="text-sm">table_restaurant</mat-icon>
                <span>App Garçom</span>
              </div>
              <p class="text-[10px] text-stone-400 leading-tight">Lançar pedidos por mesa no salão.</p>
            </button>

            <button
              type="button"
              (click)="router.navigate(['/driver'])"
              class="bg-[#1f0d05] border border-[#482814] hover:border-amber-500/60 p-3 rounded-xl text-left transition-all cursor-pointer">
              <div class="flex items-center gap-1.5 text-purple-400 font-bold mb-1">
                <mat-icon class="text-sm">two_wheeler</mat-icon>
                <span>App Entregas</span>
              </div>
              <p class="text-[10px] text-stone-400 leading-tight">Rotas e baixa; prévia do mapa só na simulação.</p>
            </button>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-black/40 border border-[#381c0c] text-[11px] text-stone-400 flex items-start gap-2.5">
          <mat-icon class="text-amber-500 text-sm shrink-0 mt-0.5">info</mat-icon>
          <span>Para abrir o PDV, acesse este link em uma tela de computador ou tablet. Os demais módulos do catálogo informam seu estado de integração ao serem abertos.</span>
        </div>

      </div>
    </div>
  `
})
export class OsMobileWarningComponent {
  readonly router = inject(Router);
}
