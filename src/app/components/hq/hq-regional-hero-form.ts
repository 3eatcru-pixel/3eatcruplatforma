import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RegionalMarketplaceConfig } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-regional-hero-form',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-5 text-stone-200">
      
      <!-- HERO TITLE & TAGLINE -->
      <div class="bg-[#170b04] border border-[#3d200f] rounded-2xl p-4 space-y-3 shadow-lg">
        <div class="flex items-center gap-2 text-amber-400 font-serif font-black text-sm pb-2 border-b border-[#3d200f]">
          <mat-icon class="text-base">view_carousel</mat-icon>
          <span>Hero Banner &amp; Títulos da Praça</span>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label for="hqHeroTag" class="block text-stone-400 font-semibold mb-1">Tag / Distintivo Superior do Banner</label>
            <input
              id="hqHeroTag"
              type="text"
              [value]="form().heroTag"
              (input)="updateField('heroTag', $any($event.target).value)"
              class="w-full bg-[#0e0805] border border-[#4d2813] rounded-xl px-3 py-2 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500 font-bold"
              placeholder="Ex: ARQUIVO DE NEGÓCIOS LOCAIS & BALCÕES PÚBLICOS">
          </div>

          <div>
            <label for="hqHeroTitle" class="block text-stone-400 font-semibold mb-1">Título de Impacto (Headline Principal)</label>
            <input
              id="hqHeroTitle"
              type="text"
              [value]="form().heroTitle"
              (input)="updateField('heroTitle', $any($event.target).value)"
              class="w-full bg-[#0e0805] border border-[#4d2813] rounded-xl px-3 py-2 text-stone-100 font-serif font-black text-sm focus:outline-none focus:border-amber-500"
              placeholder="Ex: Encontre Estabelecimentos pelo Ecossistema 3eatcru">
          </div>

          <div>
            <label for="hqHeroSubtitle" class="block text-stone-400 font-semibold mb-1">Subtítulo / Descrição da Praça Regional</label>
            <textarea
              id="hqHeroSubtitle"
              rows="2"
              [value]="form().heroSubtitle"
              (input)="updateField('heroSubtitle', $any($event.target).value)"
              class="w-full bg-[#0e0805] border border-[#4d2813] rounded-xl px-3 py-2 text-stone-300 text-xs focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Descreva a praça e convide o público a explorar os comércios locais..."></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="hqHeroCta" class="block text-stone-400 font-semibold mb-1">Texto do Botão de Ação (CTA)</label>
              <input
                id="hqHeroCta"
                type="text"
                [value]="form().heroCtaText"
                (input)="updateField('heroCtaText', $any($event.target).value)"
                class="w-full bg-[#0e0805] border border-[#4d2813] rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 font-bold"
                placeholder="Ex: Explorar Balcões da Região">
            </div>

            <div>
              <label for="hqActiveRegion" class="block text-stone-400 font-semibold mb-1">Nome Oficial da Região Atendida</label>
              <input
                id="hqActiveRegion"
                type="text"
                [value]="form().activeRegionName"
                (input)="updateField('activeRegionName', $any($event.target).value)"
                class="w-full bg-[#0e0805] border border-[#4d2813] rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                placeholder="Ex: Grande São Paulo • Polo Central Paulista">
            </div>
          </div>
        </div>
      </div>

      <!-- HERO BANNER IMAGE & PRESETS -->
      <div class="bg-[#170b04] border border-[#3d200f] rounded-2xl p-4 space-y-3 shadow-lg">
        <div class="flex items-center justify-between pb-2 border-b border-[#3d200f]">
          <div class="flex items-center gap-2 text-amber-400 font-serif font-black text-sm">
            <mat-icon class="text-base">image</mat-icon>
            <span>Imagem de Fundo do Banner Hero</span>
          </div>
          <span class="text-[10px] text-stone-400 font-mono">1600x600 Ultra-wide Recomendado</span>
        </div>

        <div class="space-y-3">
          <!-- Live Preview Thumbnail -->
          <div class="h-32 w-full rounded-xl overflow-hidden border-2 border-[#4d2813] relative shadow-inner bg-black">
            <img
              [src]="form().heroBannerImage"
              alt="Banner Hero Regional"
              class="w-full h-full object-cover"
              referrerpolicy="no-referrer">
            <div class="absolute inset-0 bg-gradient-to-t from-[#0e0805] via-[#0e0805]/40 to-transparent flex items-end p-3">
              <span class="text-xs font-serif font-bold text-amber-300 drop-shadow">
                {{ form().heroTitle }}
              </span>
            </div>
          </div>

          <div class="space-y-2 text-xs">
            <label for="hqHeroBannerImg" class="block text-stone-400 font-semibold">URL da Imagem do Banner Hero</label>
            <input
              id="hqHeroBannerImg"
              type="text"
              [value]="form().heroBannerImage"
              (input)="updateField('heroBannerImage', $any($event.target).value)"
              class="w-full bg-[#0e0805] border border-[#4d2813] rounded-xl px-3 py-2 text-stone-300 font-mono text-[11px] focus:outline-none focus:border-amber-500"
              placeholder="https://exemplo.com/hero-banner.jpg">
            
            <!-- Quick Presets -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[10px] text-stone-500 font-mono">Cenas Curadas pelo HQ:</span>
              @for (preset of heroPresets; track preset.label) {
                <button
                  type="button"
                  (click)="updateField('heroBannerImage', preset.url)"
                  class="text-[10px] bg-[#2b160b] hover:bg-[#3d200f] text-amber-300 px-2 py-0.5 rounded-lg border border-[#482814] cursor-pointer">
                  {{ preset.label }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- REGIONAL ANNOUNCEMENT BAR (BROADCAST DE AVISOS DO HQ) -->
      <div class="bg-[#170b04] border border-[#3d200f] rounded-2xl p-4 space-y-3 shadow-lg">
        <div class="flex items-center justify-between pb-2 border-b border-[#3d200f]">
          <div class="flex items-center gap-2 text-amber-400 font-serif font-black text-sm">
            <mat-icon class="text-base">campaign</mat-icon>
            <span>Broadcast Regional • Aviso Oficial do HQ</span>
          </div>

          <button
            type="button"
            (click)="updateField('showHeroAnnouncement', !form().showHeroAnnouncement)"
            [class]="form().showHeroAnnouncement ? 'bg-amber-500 text-stone-950 font-black' : 'bg-[#2b160b] text-stone-400 border border-[#482814]'"
            class="px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
            <mat-icon class="text-xs">{{ form().showHeroAnnouncement ? 'campaign' : 'volume_off' }}</mat-icon>
            <span>{{ form().showHeroAnnouncement ? 'Broadcast Ativo' : 'Desativado' }}</span>
          </button>
        </div>

        <div class="space-y-2 text-xs">
          <label for="hqHeroAnnouncementText" class="block text-stone-400 font-semibold">Mensagem Transmitida no Topo da Praça</label>
          <input
            id="hqHeroAnnouncementText"
            type="text"
            [value]="form().heroAnnouncement"
            (input)="updateField('heroAnnouncement', $any($event.target).value)"
            class="w-full bg-[#0e0805] border border-[#4d2813] rounded-xl px-3 py-2 text-stone-200 focus:outline-none focus:border-amber-500"
            placeholder="Ex: 🚚 Festival Gastronômico da Paulista: Entregas expressas em até 30 minutos em todo o perímetro central!">
        </div>
      </div>

    </div>
  `
})
export class HqRegionalHeroFormComponent {
  form = input.required<RegionalMarketplaceConfig>();
  formChange = output<RegionalMarketplaceConfig>();

  readonly heroPresets = [
    { label: 'Polo Gastronômico & Noite', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80' },
    { label: 'Mercado Central & Especiarias', url: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1600&q=80' },
    { label: 'Cafés & Bistrôs Europeus', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80' },
    { label: 'Paulista & Metrópole Urbana', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1600&q=80' }
  ];

  updateField<K extends keyof RegionalMarketplaceConfig>(field: K, value: RegionalMarketplaceConfig[K]) {
    this.formChange.emit({
      ...this.form(),
      [field]: value
    });
  }
}
