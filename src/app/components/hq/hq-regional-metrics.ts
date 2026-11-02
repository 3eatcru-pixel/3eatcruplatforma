import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CompanyTenant } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-regional-metrics',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      
      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Lojas cadastradas</span>
          <mat-icon class="text-amber-700 text-sm">storefront</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-stone-900">{{ tenants().length }}</div>
          <span class="text-[10px] text-stone-600 font-bold">Registros do painel atual do HQ</span>
      </div>

      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Status ativo</span>
          <mat-icon class="text-amber-700 text-sm">check_circle</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-stone-900">{{ activeTenantCount() }}</div>
        <span class="text-[10px] text-stone-600 font-bold">Lojas com status ativo</span>
      </div>

      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Maior raio cadastrado</span>
          <mat-icon class="text-amber-700 text-sm">radar</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-stone-900">{{ maxDeliveryRadiusDisplay() }}</div>
        <span class="text-[10px] text-stone-600 font-bold">Maior valor salvo pelas lojas; sem cálculo no mapa</span>
      </div>

      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Acessos à Praça</span>
          <mat-icon class="text-amber-700 text-sm">trending_up</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-stone-900">Não coletado</div>
        <span class="text-[10px] text-stone-600 font-bold">Analytics de acessos não conectado</span>
      </div>

      <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-4 shadow-lg text-stone-900">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-mono font-bold text-amber-900 uppercase">Taxa Média de Entrega</span>
          <mat-icon class="text-amber-700 text-sm">delivery_dining</mat-icon>
        </div>
        <div class="text-2xl font-serif font-black text-emerald-800">{{ averageDeliveryFeeDisplay() }}</div>
        <span class="text-[10px] text-stone-600 font-bold">Média das taxas preenchidas pelas lojas</span>
      </div>

    </div>
  `
})
export class HqRegionalMetricsComponent {
  tenants = input.required<CompanyTenant[]>();
  readonly activeTenantCount = computed(() => this.tenants().filter((tenant) => tenant.status === 'active').length);
  readonly maxDeliveryRadiusKm = computed<number | null>(() => {
    const radii = this.tenants().map((tenant) => tenant.deliveryRadiusKm).filter((radius): radius is number => typeof radius === 'number' && Number.isFinite(radius) && radius >= 0);
    return radii.length ? Math.max(...radii) : null;
  });
  readonly maxDeliveryRadiusDisplay = computed(() => {
    const radius = this.maxDeliveryRadiusKm();
    return radius === null ? '—' : `${radius} km`;
  });
  readonly averageDeliveryFee = computed<number | null>(() => {
    const fees = this.tenants().map((tenant) => tenant.deliveryFee).filter((fee): fee is number => typeof fee === 'number' && Number.isFinite(fee) && fee >= 0);
    return fees.length ? fees.reduce((sum, fee) => sum + fee, 0) / fees.length : null;
  });
  readonly averageDeliveryFeeDisplay = computed(() => {
    const fee = this.averageDeliveryFee();
    return fee === null ? '—' : `R$ ${fee.toFixed(2)}`;
  });
}
