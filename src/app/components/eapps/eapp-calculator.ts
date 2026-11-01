import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-calculator',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4 max-w-sm mx-auto">
      
      <!-- HEADER -->
      <div class="flex items-center gap-2 border-b border-[#381c0c] pb-2 shrink-0">
        <mat-icon class="text-amber-500 text-sm">calculate</mat-icon>
        <span class="text-xs font-bold uppercase text-white">Calculadora Operacional</span>
      </div>

      <!-- DISPLAY -->
      <div class="bg-[#0c0603] border-2 border-[#482814] rounded-2xl p-4 text-right shrink-0">
        <div class="text-[10px] text-stone-500 h-4 truncate">{{ equation() }}</div>
        <div class="text-3xl font-black text-amber-400 truncate">{{ display() }}</div>
      </div>

      <!-- TECLADO -->
      <div class="grid grid-cols-4 gap-2 flex-1 min-h-0">
        <button (click)="clear()" class="p-3 bg-[#261207] hover:bg-[#381c0c] text-rose-400 font-black rounded-xl text-sm cursor-pointer">C</button>
        <button (click)="backspace()" class="p-3 bg-[#261207] hover:bg-[#381c0c] text-stone-300 font-black rounded-xl text-sm cursor-pointer">⌫</button>
        <button (click)="inputOp('%')" class="p-3 bg-[#261207] hover:bg-[#381c0c] text-stone-300 font-black rounded-xl text-sm cursor-pointer">%</button>
        <button (click)="inputOp('/')" class="p-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-sm cursor-pointer">÷</button>

        <button (click)="inputDigit('7')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">7</button>
        <button (click)="inputDigit('8')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">8</button>
        <button (click)="inputDigit('9')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">9</button>
        <button (click)="inputOp('*')" class="p-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-sm cursor-pointer">×</button>

        <button (click)="inputDigit('4')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">4</button>
        <button (click)="inputDigit('5')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">5</button>
        <button (click)="inputDigit('6')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">6</button>
        <button (click)="inputOp('-')" class="p-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-sm cursor-pointer">-</button>

        <button (click)="inputDigit('1')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">1</button>
        <button (click)="inputDigit('2')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">2</button>
        <button (click)="inputDigit('3')" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">3</button>
        <button (click)="inputOp('+')" class="p-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-sm cursor-pointer">+</button>

        <button (click)="inputDigit('0')" class="col-span-2 p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">0</button>
        <button (click)="inputDot()" class="p-3 bg-[#1e0e06] hover:bg-[#2e1509] text-white font-bold rounded-xl text-sm cursor-pointer">.</button>
        <button (click)="calculate()" class="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm cursor-pointer">=</button>
      </div>

    </div>
  `
})
export class EAppCalculatorWindow {
  readonly display = signal<string>('0');
  readonly equation = signal<string>('');
  private resetOnNext = false;

  inputDigit(d: string) {
    if (this.resetOnNext || this.display() === '0') {
      this.display.set(d);
      this.resetOnNext = false;
    } else {
      this.display.update(v => v + d);
    }
  }

  inputDot() {
    if (this.resetOnNext) {
      this.display.set('0.');
      this.resetOnNext = false;
      return;
    }
    if (!this.display().includes('.')) {
      this.display.update(v => v === '0' ? '0.' : v + '.');
    }
  }

  inputOp(op: string) {
    if (!Number.isFinite(Number(this.display()))) return;
    this.equation.set(this.display() + ' ' + op);
    this.resetOnNext = true;
  }

  clear() {
    this.display.set('0');
    this.equation.set('');
    this.resetOnNext = false;
  }

  backspace() {
    const cur = this.display();
    if (cur.length > 1) {
      this.display.set(cur.slice(0, -1));
    } else {
      this.display.set('0');
    }
  }

  calculate() {
    const eq = this.equation().trim();
    if (!eq) return;
    const [num1Str, op, ...unexpected] = eq.split(' ');
    const num1 = Number(num1Str);
    const num2 = Number(this.display());
    if (unexpected.length || !Number.isFinite(num1) || !Number.isFinite(num2)) {
      this.showError();
      return;
    }

    let res: number;
    if (op === '+') res = num1 + num2;
    else if (op === '-') res = num1 - num2;
    else if (op === '*') res = num1 * num2;
    else if (op === '/') {
      if (num2 === 0) {
        this.showError();
        return;
      }
      res = num1 / num2;
    } else if (op === '%') res = (num1 * num2) / 100;
    else {
      this.showError();
      return;
    }

    if (!Number.isFinite(res)) {
      this.showError();
      return;
    }

    const rounded = Math.round(res * 1000) / 1000;
    this.display.set(Object.is(rounded, -0) ? '0' : String(rounded));
    this.equation.set('');
    this.resetOnNext = true;
  }

  private showError() {
    this.display.set('Erro');
    this.equation.set('');
    this.resetOnNext = true;
  }
}
