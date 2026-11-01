import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CompanyTenant } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-regional-spotlight',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 text-stone-200">
      
      <div class="bg-[#170b04] border border-[#3d200f] rounded-2xl p-4 space-y-3 shadow-lg">
        <div class="flex items-center justify-between pb-2 border-b border-[#3d200f]">
          <div class="flex items-center gap-2 text-amber-400 font-serif font-black text-sm">
            <mat-icon class="text-base">star</mat-icon>
            <span>Curadoria de Estabelecimentos • Escolha do HQ</span>
          </div>
          <span class="text-[10px] text-stone-400 font-mono">
            {{ featuredTenantIds().length }} de {{ tenants().length }} destacados
          </span>
        </div>

        <p class="text-xs text-stone-400">
          As lojas selecionadas recebem o selo dourado <strong class="text-amber-300 font-bold">"⭐ Escolha do HQ"</strong> e ganham prioridade nas buscas e no catálogo cartográfico da praça regional.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          @for (tenant of tenants(); track tenant.id) {
            <button
              type="button"
              (click)="toggleTenantSpotlight(tenant.id)"
              [class]="isFeatured(tenant.id) ? 'bg-[#2b160b] border-amber-500 ring-1 ring-amber-500/50 shadow-md' : 'bg-[#0e0805] border-[#3d200f] hover:bg-[#150a04]'"
              class="p-3 rounded-xl border flex items-center justify-between gap-3 text-left transition-all cursor-pointer w-full">
              
              <div class="flex items-center gap-3">
                <img
                  [src]="tenant.logo || tenant.coverImage"
                  [alt]="tenant.name"
                  class="w-12 h-12 rounded-xl object-cover border border-[#482814] bg-stone-900 shrink-0"
                  referrerpolicy="no-referrer">
                
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-serif font-bold text-stone-100 line-clamp-1">{{ tenant.name }}</span>
                    @if (isFeatured(tenant.id)) {
                      <span class="bg-amber-500 text-stone-950 font-black text-[9px] px-1.5 py-0.2 rounded font-mono">HQ</span>
                    }
                  </div>
                  <div class="text-[10px] text-stone-400 font-mono line-clamp-1">{{ tenant.badgeCategory || tenant.category }}</div>
                  <div class="text-[10px] text-amber-400 font-mono mt-0.5">
                    ★ {{ tenant.rating || 4.9 }} • {{ tenant.address.neighborhood }}
                  </div>
                </div>
              </div>

              <div [class]="isFeatured(tenant.id) ? 'text-amber-400' : 'text-stone-600'" class="shrink-0">
                <mat-icon class="text-xl">{{ isFeatured(tenant.id) ? 'bookmark_added' : 'bookmark_border' }}</mat-icon>
              </div>

            </button>
          }
        </div>
      </div>

    </div>
  `
})
export class HqRegionalSpotlightComponent {
  tenants = input.required<CompanyTenant[]>();
  featuredTenantIds = input.required<string[]>();
  featuredChange = output<string[]>();

  isFeatured(id: string): boolean {
    return this.featuredTenantIds().includes(id);
  }

  toggleTenantSpotlight(id: string) {
    const current = this.featuredTenantIds();
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    this.featuredChange.emit(next);
  }
}
