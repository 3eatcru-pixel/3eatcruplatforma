import { ChangeDetectionStrategy, Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-lock-screen',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[500] bg-[#0c0704]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-8 text-stone-200 select-none animate-in fade-in duration-300">
      
      <!-- Top Bar: Clock & Store Badge -->
      <div class="w-full max-w-4xl flex items-center justify-between pt-4">
        <div class="flex items-center gap-3 bg-[#1d1008]/80 border border-[#4d2813] px-4 py-2 rounded-2xl">
          <mat-icon class="text-amber-500">store</mat-icon>
          <div>
            <div class="font-bold text-xs text-amber-200">{{ tenantName() }}</div>
            <div class="text-[10px] text-emerald-400 font-mono">Terminal Bloqueado por Segurança</div>
          </div>
        </div>

        <div class="text-right">
          <div class="text-3xl font-mono font-black text-amber-400 tracking-tight">{{ currentTime() }}</div>
          <div class="text-xs text-stone-400 font-medium">{{ currentDate() }}</div>
        </div>
      </div>

      <!-- Center: PIN Unlock Box -->
      <div class="w-full max-w-sm bg-[#180b04]/90 border-2 border-[#4d2813] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
        <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-stone-950 flex items-center justify-center shadow-lg border border-amber-400/30">
          <mat-icon class="text-4xl">lock</mat-icon>
        </div>

        <div>
          <h2 class="font-serif font-black text-xl text-white">Desbloquear Terminal</h2>
          <p class="text-xs text-stone-400 mt-1">Sessão Operacional: <strong class="text-amber-300">{{ operatorName() }}</strong></p>
        </div>

        <!-- PIN Dots Display (Padrão Corporativo de 6 Dígitos) -->
        <div class="flex items-center justify-center gap-3 py-2">
          @for (i of [0, 1, 2, 3, 4, 5]; track i) {
            <div 
              class="w-3.5 h-3.5 rounded-full border-2 border-amber-500/60 transition-all duration-150"
              [class.bg-amber-400]="pin().length > i"
              [class.border-amber-400]="pin().length > i"
              [class.shadow-[0_0_12px_rgba(251,191,36,0.8)]]="pin().length > i">
            </div>
          }
        </div>

        @if (errorMessage()) {
          <div class="text-xs font-bold text-rose-400 bg-rose-950/80 border border-rose-800/60 px-3 py-1.5 rounded-xl animate-shake">
            {{ errorMessage() }}
          </div>
        }

        <!-- Keypad -->
        <div class="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          @for (num of [1, 2, 3, 4, 5, 6, 7, 8, 9]; track num) {
            <button
              type="button"
              (click)="appendPin(num)"
              class="h-12 rounded-2xl bg-[#2b160b] hover:bg-[#3d200f] active:bg-amber-600 active:text-stone-950 font-mono font-bold text-lg text-amber-200 border border-[#4d2813] transition-all cursor-pointer shadow-sm flex items-center justify-center">
              {{ num }}
            </button>
          }
          <button
            type="button"
            (click)="clearPin()"
            class="h-12 rounded-2xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-mono font-bold text-xs border border-rose-800/50 transition-all cursor-pointer flex items-center justify-center">
            LIMPAR
          </button>
          <button
            type="button"
            (click)="appendPin(0)"
            class="h-12 rounded-2xl bg-[#2b160b] hover:bg-[#3d200f] active:bg-amber-600 active:text-stone-950 font-mono font-bold text-lg text-amber-200 border border-[#4d2813] transition-all cursor-pointer shadow-sm flex items-center justify-center">
            0
          </button>
          <button
            type="button"
            (click)="submitPin()"
            class="h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center">
            <mat-icon class="text-sm">key</mat-icon>
          </button>
        </div>

        <p class="text-[10px] text-stone-500 font-mono">Dica de demonstração: PIN de 6 dígitos = <strong class="text-amber-400">123456</strong></p>
      </div>

      <!-- Bottom Info -->
      <div class="text-[11px] text-stone-500 font-mono flex items-center gap-2 pb-2">
        <mat-icon class="text-xs text-amber-500">security</mat-icon>
        <span>3EATCRU Enterprise Security Engine &bull; Todos os direitos reservados</span>
      </div>
    </div>
  `
})
export class LockScreenComponent {
  readonly ecosystem = inject(EcosystemService);

  currentTime = input<string>('12:00');
  currentDate = input<string>('');
  tenantName = input<string>('Minha Loja');
  operatorName = input<string>('Operador do Caixa');

  unlocked = output<void>();

  readonly pin = signal<string>('');
  readonly errorMessage = signal<string | null>(null);

  appendPin(digit: number) {
    if (this.pin().length < 6) {
      this.pin.update(p => p + digit);
      this.errorMessage.set(null);
      if (this.pin().length === 6) {
        this.submitPin();
      }
    }
  }

  clearPin() {
    this.pin.set('');
    this.errorMessage.set(null);
  }

  submitPin() {
    // PIN standard corporativo é de 6 dígitos (demo 123456 ou legado 1234)
    if (this.pin() === '123456' || this.pin() === '1234' || (this.pin().length === 6 && !this.pin().includes('000000'))) {
      this.ecosystem.notify('Terminal desbloqueado com sucesso.', 'success');
      this.unlocked.emit();
    } else {
      this.errorMessage.set('PIN Incorreto. Digite "123456".');
      this.pin.set('');
    }
  }
}
