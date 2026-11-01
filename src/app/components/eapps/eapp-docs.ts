import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-docs',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col md:flex-row bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden">
      
      <!-- MENU LATERAL DE TÓPICOS -->
      <div class="w-full md:w-64 border-r border-[#381c0c] bg-[#1a0c05] p-3 space-y-2 shrink-0">
        <div class="flex items-center gap-2 mb-3">
          <mat-icon class="text-amber-500">menu_book</mat-icon>
          <strong class="text-xs text-white">Manual 3EAT OS</strong>
        </div>

        @for (sec of sections; track sec.id) {
          <button
            type="button"
            (click)="selectedSection.set(sec.id)"
            [class]="selectedSection() === sec.id ? 'bg-amber-600 text-stone-950 font-black' : 'text-stone-400 hover:text-white hover:bg-[#281308]'"
            class="w-full text-left p-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2">
            <mat-icon class="text-sm">{{ sec.icon }}</mat-icon>
            <span class="truncate">{{ sec.title }}</span>
          </button>
        }
      </div>

      <!-- CONTEÚDO DO TÓPICO -->
      <div class="flex-1 p-6 overflow-y-auto custom-scrollbar font-sans space-y-4">
        @switch (selectedSection()) {
          @case ('overview') {
            <h2 class="text-lg font-serif font-black text-amber-400">Visão Geral dos 3 Ambientes</h2>
            <p class="text-xs text-stone-300 leading-relaxed">
              A plataforma 3EATCRU é composta por:
            </p>
            <ul class="text-xs text-stone-400 space-y-2 list-disc list-inside">
              <li><strong>HQ Central:</strong> Governança SaaS do dono da plataforma (planos, comissões, MDM).</li>
              <li><strong>Store OS:</strong> Estação operacional do lojista (PDV Caixa, Salão, KDS, Estoque e DRE).</li>
              <li><strong>Marketplace Público:</strong> Experiência de compra do consumidor final e QR na Mesa.</li>
            </ul>
          }
          @case ('pos') {
            <h2 class="text-lg font-serif font-black text-amber-400">Guia de Frente de Caixa (PDV)</h2>
            <p class="text-xs text-stone-300 leading-relaxed">
              O PDV opera em modo online e offline com contingência automática em IndexedDB.
              Ao escanear códigos de barras (EAN-13), o cupom fiscal acumula os itens em tempo real.
              Para pesagens a granel, acione o botão "Balança".
            </p>
          }
          @case ('offline') {
            <h2 class="text-lg font-serif font-black text-amber-400">Resiliência Offline & Outbox</h2>
            <p class="text-xs text-stone-300 leading-relaxed">
              Em caso de queda de conexão, as vendas são gravadas localmente com chaves de idempotência (UUID v4)
              e sincronizadas automaticamente assim que a conectividade com a nuvem for restabelecida.
            </p>
          }
          @default {
            <h2 class="text-lg font-serif font-black text-amber-400">Documentação do Sistema</h2>
            <p class="text-xs text-stone-300">Selecione um tópico no menu à esquerda para consultar as diretrizes operacionais.</p>
          }
        }
      </div>

    </div>
  `
})
export class EAppDocsWindow {
  readonly selectedSection = signal<string>('overview');

  readonly sections = [
    { id: 'overview', title: 'Visão Geral', icon: 'hub' },
    { id: 'pos', title: 'Frente de Caixa (PDV)', icon: 'point_of_sale' },
    { id: 'offline', title: 'Operação Offline', icon: 'wifi_off' }
  ];
}
