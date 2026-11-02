import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-crm',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 animate-in fade-in duration-500">
       <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-950">
          <div class="flex justify-between items-center gap-3 mb-4">
             <h3 class="font-serif font-black text-sm uppercase text-amber-900">Diretório Unificado de Consumidores (CRM)</h3>
             <button type="button" (click)="refresh()" [disabled]="crm.consumerDirectoryStatus() === 'loading' || crm.consumerDirectoryLoadingMore() || ecosystem.isSimulationMode()" class="shrink-0 rounded-xl border border-[#ded4c2] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-stone-700 hover:bg-amber-50 disabled:opacity-50">Atualizar</button>
          </div>
          <p class="text-[10px] text-stone-600 mb-3">Consulta paginada de contatos. Endereço e CPF não são enviados para esta tela; GMV, frequência de pedidos e auditoria individual não são calculados aqui.</p>
          @if (ecosystem.isSimulationMode()) {
            <p class="text-xs text-stone-600 py-4">O diretório administrativo fica disponível no modo real. Os perfis de demonstração permanecem locais neste dispositivo.</p>
          } @else if (crm.consumerDirectoryStatus() === 'loading' || crm.consumerDirectoryStatus() === 'idle') {
            <p class="text-xs text-stone-600 py-4">Carregando diretório do servidor...</p>
          } @else if (crm.consumerDirectoryStatus() === 'error') {
            <p role="alert" class="text-xs text-rose-800 py-4">Não foi possível carregar o diretório de consumidores.</p>
          } @else if (crm.consumerDirectory().length === 0) {
            <p class="text-xs text-stone-600 py-4">Nenhum perfil retornado pelo servidor.</p>
          } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-sans">
              <thead>
                <tr class="text-[10px] font-mono font-bold uppercase text-stone-400 border-b border-[#e8dfce]">
                  <th class="p-3">NOME DO CONSUMIDOR</th>
                  <th class="p-3">E-MAIL</th>
                  <th class="p-3">TELEFONE</th>
                  <th class="p-3">ATUALIZADO EM</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e8dfce]/50">
                @for (cons of crm.consumerDirectory(); track cons.id) {
                  <tr class="hover:bg-[#f2e8d5]/40 transition-colors">
                    <td class="p-3">
                       <div class="font-bold text-stone-900">{{ cons.name }}</div>
                    </td>
                    <td class="p-3 text-stone-600 font-mono">{{ cons.email || 'Não informado' }}</td>
                    <td class="p-3 text-stone-600 font-mono">{{ cons.phone || 'Não informado' }}</td>
                    <td class="p-3 text-stone-500 font-mono">{{ formatDate(cons.updatedAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          }
       </div>
          @if (!ecosystem.isSimulationMode() && crm.consumerDirectoryLoadMoreError()) {
            <p role="alert" class="mt-3 text-xs text-rose-800">Falha ao carregar a próxima página. Tente novamente.</p>
          }
          @if (!ecosystem.isSimulationMode() && crm.consumerDirectoryNextPageToken()) {
            <div class="mt-4 flex justify-center">
              <button type="button" (click)="loadMore()" [disabled]="crm.consumerDirectoryLoadingMore()" class="rounded-xl bg-stone-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-stone-700 disabled:opacity-50">
                {{ crm.consumerDirectoryLoadingMore() ? 'Carregando...' : crm.consumerDirectoryLoadMoreError() ? 'Tentar novamente' : 'Carregar mais' }}
              </button>
            </div>
          }
    </div>
  `
})
export class HqCrmComponent implements OnInit {
  readonly ecosystem = inject(EcosystemService);
  readonly crm = this.ecosystem.crmService;

  ngOnInit(): void {
    if (!this.ecosystem.isSimulationMode() && this.crm.consumerDirectoryStatus() === 'idle') {
      void this.crm.fetchConsumerDirectoryPage();
    }
  }

  refresh(): void {
    if (!this.ecosystem.isSimulationMode()) void this.crm.fetchConsumerDirectoryPage();
  }

  loadMore(): void {
    const pageToken = this.crm.consumerDirectoryNextPageToken();
    if (pageToken) void this.crm.fetchConsumerDirectoryPage(pageToken);
  }

  formatDate(value?: string): string {
    if (!value) return 'Não informado';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR');
  }
}
