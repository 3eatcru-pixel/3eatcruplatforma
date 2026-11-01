import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { SecurityService } from '../../services/security.service';
import { EcosystemService } from '../../services/ecosystem.service';
import { ConsumerProfileComponent } from '../consumer-profile';

@Component({
  selector: 'app-consumer-auth',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, ConsumerProfileComponent],
  template: `
    <div class="min-h-screen bg-[#0d0704] text-stone-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-amber-600 selection:text-white relative overflow-x-hidden">
      
      <!-- BACKGROUND TEXTURE -->
      <div class="absolute inset-0 pointer-events-none opacity-20 bg-carbon-pattern"></div>
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-xl space-y-4 relative z-10">
        
        <!-- TOP NAVIGATION BAR -->
        <div class="flex items-center justify-between bg-[#190d06] border border-[#482814] rounded-2xl p-4 shadow-xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-600 text-stone-950 flex items-center justify-center font-black">
              <mat-icon class="text-xl">person</mat-icon>
            </div>
            <div>
              <div class="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest leading-none">
                ÁREA DO CONSUMIDOR • 3EAT MARKETPLACE
              </div>
              <div class="text-sm font-serif font-black text-stone-100">
                Sua Identidade Pública
              </div>
            </div>
          </div>

          <button
            type="button"
            (click)="router.navigate(['/home'])"
            class="bg-[#2b160b] hover:bg-[#3d200f] text-amber-300 border border-[#482814] text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow">
            <mat-icon class="text-xs text-amber-400">storefront</mat-icon>
            <span>Início / Home</span>
          </button>
        </div>

        <!-- REUTILIZA O CONSUMER-PROFILE COMPONENT COMPLETO -->
        <app-consumer-profile [isModal]="false"></app-consumer-profile>
      </div>

    </div>
  `
})
export class ConsumerAuthComponent implements OnInit {
  private readonly security = inject(SecurityService);
  readonly ecosystem = inject(EcosystemService);
  readonly router = inject(Router);

  ngOnInit() {
    this.security.setPillar('consumer');
  }
}
