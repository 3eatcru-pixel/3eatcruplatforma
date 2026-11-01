import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RegionalMarketplaceComponent } from '../regional-marketplace';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-consumer-sim',
  standalone: true,
  imports: [CommonModule, MatIconModule, RegionalMarketplaceComponent],
  template: `
    <div class="flex flex-col items-center justify-center h-full bg-[#0e0805] p-4 overflow-hidden relative group">
      <!-- iPhone Hardware Buttons -->
      <div class="absolute left-10 top-32 flex flex-col gap-4">
        <div class="w-1.5 h-8 bg-stone-800 rounded-r-md"></div> <!-- Mute switch -->
        <button type="button" aria-label="Aumentar Volume" (click)="volumeUp()" class="w-1.5 h-12 bg-stone-700 rounded-r-md hover:bg-stone-500 cursor-pointer shadow-sm transition-colors"></button>
        <button type="button" aria-label="Diminuir Volume" (click)="volumeDown()" class="w-1.5 h-12 bg-stone-700 rounded-r-md hover:bg-stone-500 cursor-pointer shadow-sm transition-colors"></button>
      </div>
      <div class="absolute right-10 top-40">
        <button type="button" aria-label="Botão Liga/Desliga" (click)="power()" class="w-1.5 h-20 bg-stone-700 rounded-l-md hover:bg-stone-500 cursor-pointer shadow-sm transition-colors"></button>
      </div>

      <!-- iOS Phone Frame (Marketplace) -->
      <div class="relative w-[360px] h-[720px] bg-[#1a1a1c] border-[12px] border-[#3a3a3c] rounded-[60px] shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col ring-4 ring-black/30">
        
        <!-- Dynamic Island -->
        <div class="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-3xl z-[60] flex items-center justify-between px-4">
           <div class="w-1 h-1 rounded-full bg-blue-500/20"></div>
           <div class="w-2 h-2 rounded-full bg-emerald-500/10"></div>
        </div>

        <!-- Status Bar -->
        <div class="h-10 bg-transparent flex items-center justify-between px-10 shrink-0 z-50">
          <span class="text-[12px] font-black text-white">10:47</span>
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-[14px] h-[14px] w-[14px] text-white">signal_cellular_alt</mat-icon>
            <mat-icon class="text-[14px] h-[14px] w-[14px] text-white">wifi</mat-icon>
            <mat-icon class="text-[14px] h-[14px] w-[14px] text-white">battery_std</mat-icon>
          </div>
        </div>

        <!-- App Content Area -->
        <div class="flex-1 overflow-auto bg-white rounded-t-[40px] -mt-1">
          <app-regional-marketplace />
        </div>

        <!-- Home Indicator -->
        <div class="h-8 bg-white flex items-center justify-center shrink-0">
          <div class="w-32 h-1.5 bg-stone-200 rounded-full"></div>
        </div>
      </div>
      
      <div class="mt-6 text-center">
        <p class="text-stone-500 text-[10px] uppercase font-black tracking-[0.3em]">Marketplace Client Simulator • iOS 17</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class EAppConsumerSimWindow {
  volumeUp() { console.log('iOS Volume Up'); }
  volumeDown() { console.log('iOS Volume Down'); }
  power() { console.log('iOS Power Toggle'); }
}
