import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { WaiterAppComponent } from '../waiter-app';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-waiter-sim',
  standalone: true,
  imports: [CommonModule, MatIconModule, WaiterAppComponent],
  template: `
    <div class="flex flex-col items-center justify-center h-full bg-[#0e0805] p-4 overflow-hidden relative group">
      <!-- Device Hardware Buttons (Right Side) -->
      <div class="absolute right-12 top-32 flex flex-col gap-4">
        <button (click)="volumeUp()" class="w-1.5 h-12 bg-stone-700 rounded-l-md hover:bg-stone-500 cursor-pointer shadow-sm transition-colors" title="Volume Up"></button>
        <button (click)="volumeDown()" class="w-1.5 h-12 bg-stone-700 rounded-l-md hover:bg-stone-500 cursor-pointer shadow-sm transition-colors" title="Volume Down"></button>
        <button (click)="power()" class="w-1.5 h-16 bg-rose-900/50 rounded-l-md hover:bg-rose-700 cursor-pointer shadow-sm mt-4 border-l border-rose-500/20" title="Power / Lock"></button>
      </div>

      <!-- Android Phone Frame -->
      <div class="relative w-[320px] h-[640px] bg-[#1a0e05] border-[10px] border-[#3d200f] rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ring-2 ring-black/50">
        
        <!-- Notch/Status Bar -->
        <div class="h-7 bg-black flex items-center justify-between px-8 shrink-0 relative">
          <span class="text-[10px] font-black text-stone-300">10:45</span>
          <div class="absolute left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-b-xl flex items-center justify-center gap-1">
             <div class="w-2 h-2 rounded-full bg-stone-900 border border-stone-800"></div>
          </div>
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-[12px] h-[12px] w-[12px] text-stone-400">wifi</mat-icon>
            <mat-icon class="text-[12px] h-[12px] w-[12px] text-stone-400">battery_full</mat-icon>
          </div>
        </div>

        <!-- App Content Area -->
        <div class="flex-1 overflow-auto bg-stone-950 relative">
          <app-waiter-app />
          
          <!-- Floating Action Button for Scan (Simulator Specific) -->
          <button (click)="triggerScan()" class="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-amber-500 text-stone-950 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer border-4 border-black/20 z-50">
            <mat-icon>qr_code_scanner</mat-icon>
          </button>
        </div>

        <!-- Android Nav Bar -->
        <div class="h-12 bg-black flex items-center justify-around px-8 shrink-0 border-t border-white/5">
          <button class="p-2 text-stone-600 hover:text-white transition-colors cursor-pointer"><mat-icon>stop</mat-icon></button>
          <button class="p-2 text-stone-600 hover:text-white transition-colors cursor-pointer"><mat-icon>circle</mat-icon></button>
          <button class="p-2 text-stone-600 hover:text-white transition-colors cursor-pointer"><mat-icon>play_arrow</mat-icon></button>
        </div>
      </div>
      
      <div class="mt-6 text-center animate-pulse">
        <p class="text-stone-500 text-[10px] uppercase font-black tracking-[0.2em]">Android 14 Development Environment</p>
        <p class="text-amber-500/50 text-[9px] font-mono mt-1">S/N: 3EAT-WAT-2026-X1</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class EAppWaiterSimWindow {
  volumeUp() { console.log('Simulated Volume Up'); }
  volumeDown() { console.log('Simulated Volume Down'); }
  power() { console.log('Simulated Power Toggle'); }
  triggerScan() { console.log('Simulated QR/Barcode Scan'); }
}
