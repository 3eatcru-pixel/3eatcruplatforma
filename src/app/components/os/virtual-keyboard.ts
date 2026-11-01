import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-virtual-keyboard',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="absolute bottom-14 right-6 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 w-96 text-white animate-in slide-in-from-bottom-5">
      <div class="flex justify-between items-center pb-2 border-b border-slate-800 mb-3 text-xs">
        <span class="font-bold text-slate-300 flex items-center gap-1.5">
          <mat-icon class="text-sm text-orange-400">keyboard</mat-icon> Teclado Tátil do Terminal
        </span>
        <button type="button" (click)="closeClicked.emit()" class="text-slate-400 hover:text-white">✕</button>
      </div>
      <div class="space-y-1.5 font-mono text-xs">
        <div class="flex gap-1">
          @for (key of ['1','2','3','4','5','6','7','8','9','0']; track key) {
            <button type="button" class="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded font-bold transition-colors">{{ key }}</button>
          }
        </div>
        <div class="flex gap-1">
          @for (key of ['Q','W','E','R','T','Y','U','I','O','P']; track key) {
            <button type="button" class="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded font-bold transition-colors">{{ key }}</button>
          }
        </div>
        <div class="flex gap-1">
          @for (key of ['A','S','D','F','G','H','J','K','L']; track key) {
            <button type="button" class="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded font-bold transition-colors">{{ key }}</button>
          }
        </div>
        <div class="flex gap-1">
          @for (key of ['Z','X','C','V','B','N','M','⌫']; track key) {
            <button type="button" class="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded font-bold transition-colors">{{ key }}</button>
          }
        </div>
        <div class="flex gap-1 pt-1">
          <button type="button" class="flex-[2] bg-slate-700 hover:bg-slate-600 py-2 rounded font-bold text-[10px]">SHIFT</button>
          <button type="button" class="flex-[5] bg-slate-800 hover:bg-slate-700 py-2 rounded font-bold">ESPAÇO</button>
          <button type="button" class="flex-[2] bg-orange-600 hover:bg-orange-500 py-2 rounded font-bold text-[10px]">ENTER</button>
        </div>
      </div>
    </div>
  `
})
export class VirtualKeyboardComponent {
  closeClicked = output<void>();
}
