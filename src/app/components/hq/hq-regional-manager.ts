import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { RegionalMarketplaceConfig } from '../../models/ecosystem.model';

import { HqRegionalMetricsComponent } from './hq-regional-metrics';
import { HqRegionalHeroFormComponent } from './hq-regional-hero-form';
import { HqRegionalSpotlightComponent } from './hq-regional-spotlight';
import { HqRegionalMapToolsComponent } from './hq-regional-map-tools';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-regional-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HqRegionalMetricsComponent,
    HqRegionalHeroFormComponent,
    HqRegionalSpotlightComponent,
    HqRegionalMapToolsComponent
  ],
  template: `
    <div class="space-y-6 text-stone-200">
      
      <!-- SUB-HEADER ACTION BAR -->
      <div class="bg-[#170b04] border border-[#3d200f] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center font-black shadow-md">
            <mat-icon>public</mat-icon>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-serif font-black text-base text-white">Governança do Marketplace Regional</h2>
              <span class="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded font-bold">
                HQ CENTRAL CONTROL
              </span>
            </div>
            <p class="text-xs text-stone-400">Configure o banner hero da praça, avisos da central, raio de geolocalização e curadoria de destaques.</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openRegionalMarketplace()"
            class="bg-[#2b160b] hover:bg-[#3d200f] text-emerald-400 px-3.5 py-2.5 rounded-xl border border-[#482814] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer">
            <mat-icon class="text-sm">open_in_new</mat-icon>
            <span>Ver Praça ao Vivo</span>
          </button>

          <button
            type="button"
            (click)="saveRegionalConfig()"
            class="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg border border-amber-400/50 cursor-pointer">
            <mat-icon class="text-sm">save</mat-icon>
            <span>Publicar Alterações no Portal</span>
          </button>
        </div>
      </div>

      <!-- METRICS TELEMETRY HUD -->
      <app-hq-regional-metrics [tenants]="ecosystem.tenants()" />

      <!-- GEODETIC ANALYSIS TOOLS (NEW) -->
      <app-hq-regional-map-tools />

      <!-- SPLIT VIEW: EDITOR & SPOTLIGHT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- LEFT: HERO BANNER FORM -->
        <div class="lg:col-span-7 space-y-4">
          <app-hq-regional-hero-form
            [form]="draftConfig()"
            (formChange)="onFormChange($event)" />
        </div>

        <!-- RIGHT: SPOTLIGHT CURATION & LIVE PREVIEW -->
        <div class="lg:col-span-5 space-y-5">
          
          <!-- LIVE MINI PREVIEW OF HERO BANNER -->
          <div class="bg-[#170b04] border border-[#3d200f] rounded-2xl p-4 space-y-3 shadow-xl">
            <div class="flex items-center justify-between pb-2 border-b border-[#3d200f]">
              <div class="flex items-center gap-2 text-amber-400 font-serif font-black text-xs">
                <mat-icon class="text-sm">visibility</mat-icon>
                <span>Prévia ao Vivo do Banner Regional</span>
              </div>
              <span class="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono px-1.5 py-0.2 rounded font-bold">
                SINCRONIZADO
              </span>
            </div>

            <!-- LIVE PREVIEW HERO BANNER -->
            <div class="relative rounded-2xl overflow-hidden border-2 border-[#4d2813] bg-stone-950 shadow-2xl p-4 min-h-[160px] flex flex-col justify-between">
              <img
                [src]="draftConfig().heroBannerImage"
                alt="Banner Background"
                class="absolute inset-0 w-full h-full object-cover opacity-35"
                referrerpolicy="no-referrer">
              
              <div class="relative z-10 space-y-1.5">
                <span class="inline-block bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-stone-950 font-black uppercase text-[8px] px-2 py-0.5 rounded-full border border-amber-400 font-mono tracking-wider">
                  {{ draftConfig().heroTag }}
                </span>

                <h3 class="font-serif font-black text-sm sm:text-base text-white leading-tight drop-shadow">
                  {{ draftConfig().heroTitle }}
                </h3>

                <p class="text-[10px] text-stone-300 font-serif line-clamp-2 leading-snug">
                  {{ draftConfig().heroSubtitle }}
                </p>
              </div>

              <!-- CTA & REGION BADGE -->
              <div class="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                <span class="text-[9px] font-mono text-amber-400 font-bold">
                  📍 {{ draftConfig().activeRegionName }}
                </span>

                <span class="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-extrabold text-[9px] px-2.5 py-1 rounded-lg shadow font-sans">
                  {{ draftConfig().heroCtaText }}
                </span>
              </div>
            </div>

            @if (draftConfig().showHeroAnnouncement && draftConfig().heroAnnouncement) {
              <div class="bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-amber-950/90 text-amber-200 border border-amber-600/70 p-2 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                <mat-icon class="text-xs text-amber-400">campaign</mat-icon>
                <span class="line-clamp-1">{{ draftConfig().heroAnnouncement }}</span>
              </div>
            }
          </div>

          <!-- SPOTLIGHT CURATION TOOL -->
          <app-hq-regional-spotlight
            [tenants]="ecosystem.tenants()"
            [featuredTenantIds]="draftConfig().featuredTenantIds"
            (featuredChange)="onFeaturedChange($event)" />

        </div>

      </div>

    </div>
  `
})
export class HqRegionalManagerComponent {
  readonly ecosystem = inject(EcosystemService);

  readonly draftConfig = signal<RegionalMarketplaceConfig>({
    heroTitle: '',
    heroSubtitle: '',
    heroTag: '',
    heroBannerImage: '',
    heroCtaText: '',
    heroAnnouncement: '',
    showHeroAnnouncement: true,
    featuredTenantIds: [],
    defaultSearchRadiusKm: 15,
    activeRegionName: ''
  });

  constructor() {
    effect(() => {
      const cfg = this.ecosystem.regionalConfig();
      this.draftConfig.set({
        ...cfg,
        featuredTenantIds: [...cfg.featuredTenantIds]
      });
    });
  }

  onFormChange(form: RegionalMarketplaceConfig) {
    this.draftConfig.set(form);
  }

  onFeaturedChange(ids: string[]) {
    this.draftConfig.update(c => ({
      ...c,
      featuredTenantIds: ids
    }));
  }

  saveRegionalConfig() {
    this.ecosystem.updateRegionalConfig(this.draftConfig());
  }

  openRegionalMarketplace() {
    this.ecosystem.openRegionalMarketplace();
  }
}
