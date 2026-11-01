import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CompanyTenant } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-regional-metrics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      
      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Balcões na Praça</span>
          <mat-icon class="text-amber-700 text-sm">storefront</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-stone-900">{{ tenants().length }}</div>
        <span class="text-[10px] text-emerald-700 font-bold">100% Homologados HQ</span>
      </div>

      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Raio de Cobertura</span>
          <mat-icon class="text-amber-700 text-sm">radar</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-stone-900">30 km</div>
        <span class="text-[10px] text-stone-600 font-bold">Perímetro Central SP</span>
      </div>

      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Acessos à Praça</span>
          <mat-icon class="text-amber-700 text-sm">trending_up</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-stone-900">4.820</div>
        <span class="text-[10px] text-emerald-700 font-bold">+24% nesta semana</span>
      </div>

      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Taxa Média de Entrega</span>
          <mat-icon class="text-amber-700 text-sm">delivery_dining</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-emerald-800">R$ 5,10</div>
        <span class="text-[10px] text-emerald-700 font-bold">Competitivo c/ iFood</span>
      </div>

    </div>
  `
})
export class HqRegionalMetricsComponent {
  tenants = input.required<CompanyTenant[]>();
}
