import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-suppliers',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER FORNECEDORES -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 flex items-center justify-center">
            <mat-icon class="text-xl">local_shipping</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Fornecedores • Protótipo local</h2>
            <p class="text-[10px] text-stone-400">Lista de exemplo em memória; não cadastra fornecedores nem gera compras.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="addDemoSupplier()"
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
          <mat-icon class="text-sm">add</mat-icon>
          <span>Adicionar exemplo</span>
        </button>
      </div>

      <!-- LISTA DE FORNECEDORES -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-[#381c0c] rounded-2xl bg-[#180b04]">
        <table class="w-full text-left text-xs font-mono">
          <thead class="bg-[#200e05] text-stone-400 border-b border-[#381c0c] sticky top-0">
            <tr>
              <th class="p-3">Razão Social / Fantasia</th>
              <th class="p-3">Categoria de Insumos</th>
              <th class="p-3">Contato / Vendedor</th>
              <th class="p-3">Prazo Entrega</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2a1307]">
            @for (sup of suppliers(); track sup.id) {
              <tr class="hover:bg-[#200e05]/60 transition-colors">
                <td class="p-3 font-bold text-white">
                  {{ sup.name }}
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-lg bg-[#261207] text-[10px] border border-[#381c0c] text-amber-300">
                    {{ sup.category }}
                  </span>
                </td>
                <td class="p-3 text-stone-300">
                  <div>{{ sup.contact }}</div>
                  <div class="text-[10px] text-stone-500">{{ sup.phone }}</div>
                </td>
                <td class="p-3 text-stone-400 text-[11px]">
                  {{ sup.leadTime }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class EAppSuppliersWindow {
  readonly suppliers = signal([
    { id: 'demo-1', name: 'Fornecedor de demonstração 1', category: 'Exemplo de categoria', contact: 'Contato de exemplo', phone: 'Número de exemplo', leadTime: 'Prazo demonstrativo' },
    { id: 'demo-2', name: 'Fornecedor de demonstração 2', category: 'Exemplo de categoria', contact: 'Contato de exemplo', phone: 'Número de exemplo', leadTime: 'Prazo demonstrativo' },
    { id: 'demo-3', name: 'Fornecedor de demonstração 3', category: 'Exemplo de categoria', contact: 'Contato de exemplo', phone: 'Número de exemplo', leadTime: 'Prazo demonstrativo' }
  ]);

  addDemoSupplier() {
    this.suppliers.update(sups => [
      ...sups,
      {
        id: 'sup-' + Date.now(),
        name: 'Fornecedor de demonstração ' + (sups.length + 1),
        category: 'Exemplo de categoria',
        contact: 'Contato de exemplo',
        phone: 'Número de exemplo',
        leadTime: 'Prazo demonstrativo'
      }
    ]);
  }
}
