import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-system-config',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      <!-- SYSTEM GOVERNANCE CONTROLS -->
      <div class="lg:col-span-4 space-y-6">
         <div class="bg-[#2a160b] border border-[#482814] rounded-3xl p-5 shadow-2xl space-y-5">
            <h3 class="font-serif font-black text-white text-base border-b border-[#4d2813] pb-2">Variáveis de Governança</h3>

            @if (!canEditSettings()) {
              <p role="alert" class="rounded-xl border border-rose-700 bg-rose-950/40 p-3 text-xs text-rose-200">Configurações globais não carregadas do servidor. Edição desabilitada para evitar gravar valores padrão locais.</p>
            } @else if (ecosystem.isSimulationMode()) {
              <p class="rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-200">Modo de simulação: alterações locais não são persistidas no servidor.</p>
            }
            
            <div class="space-y-4">
               <div class="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 space-y-2" role="status">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-xs font-bold text-amber-200">Comissão de entregas da plataforma</span>
                    <strong class="rounded-full border border-amber-500/40 px-2.5 py-1 text-[10px] uppercase tracking-wide text-amber-300">{{ platformCommissionStatus() === 'coming_soon' ? 'Em breve' : 'Ativa' }}</strong>
                  </div>
                  @if (platformCommissionStatus() === 'coming_soon') {
                    <p class="text-[9px] leading-relaxed text-amber-100/70">Mantida em breve até a plataforma ter sua própria rede de entregadores e a inteligência da operação estar pronta. Motoristas da loja e o valor pago a eles continuam sob decisão do lojista; essa comissão não entra no caixa do Store OS.</p>
                  } @else {
                    <p class="text-[9px] leading-relaxed text-amber-100/70">A comissão da rede própria está ativa. Motoristas da loja e o valor pago a eles continuam sob decisão do lojista; a comissão não entra no caixa do Store OS.</p>
                  }
               </div>

               <div class="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-2">
                  <div class="flex justify-between items-center">
                     <span class="text-xs font-bold text-rose-200">Flag de manutenção do shell Store OS</span>
                     <button type="button" aria-label="Alternar Modo Manutenção" [disabled]="!canEditSettings()" class="w-10 h-5 bg-stone-900 border border-stone-700 rounded-full relative cursor-pointer focus:outline-none disabled:opacity-50" (click)="toggleMaintenanceMode()">
                        <div [class]="ecosystem.maintenanceMode() ? 'bg-rose-500 translate-x-5' : 'bg-stone-500 translate-x-0'" class="w-4 h-4 rounded-full absolute left-0.5 top-0.5 transition-all duration-300 shadow-sm"></div>
                     </button>
                  </div>
                  <p class="text-[9px] text-rose-400 uppercase leading-snug">Ao ativar, o shell do Store OS exibirá um bloqueio após sincronizar. As rotas de API e checkout não são bloqueadas por esta flag.</p>
               </div>

               <div class="space-y-2">
                  <label for="globalBroadcastText" class="text-[10px] font-mono font-bold text-amber-500 uppercase">Broadcast Global (Mensagem Interna)</label>
                  <textarea id="globalBroadcastText" #broadcastArea maxlength="500" [disabled]="!canEditSettings()" placeholder="Digite um aviso para todos os lojistas..." class="w-full h-24 bg-[#1a0e07] border border-[#4d2813] rounded-xl p-3 text-xs text-white focus:border-amber-500 outline-none no-scrollbar disabled:opacity-50"></textarea>
                  <button type="button" [disabled]="!canEditSettings()" (click)="sendBroadcast(broadcastArea)" class="w-full bg-[#3b1e0d] text-amber-400 font-black py-2 rounded-xl text-[10px] uppercase border border-amber-600/30 hover:bg-amber-900/40 transition-all cursor-pointer disabled:opacity-50">Publicar aviso</button>
               </div>
            </div>
         </div>
      </div>

      <!-- INFRASTRUCTURE MONITORING -->
      <div class="lg:col-span-8 space-y-6">
         <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-3xl p-6 shadow-2xl space-y-5 text-stone-900">
            <div class="border-b border-[#e8dfce] pb-3">
               <h3 class="font-serif font-black text-base uppercase tracking-tight">Telemetria de infraestrutura</h3>
               <p class="mt-1 text-xs text-stone-600">O HQ não está conectado a um coletor de métricas, inventário de certificados ou monitoramento de armazenamento.</p>
            </div>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
               @for (metric of unavailableMetrics; track metric) {
                 <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
                   <span class="block text-[9px] font-black uppercase text-stone-400">{{ metric }}</span>
                   <strong class="mt-1 block text-xs text-stone-500">Não coletado</strong>
                 </div>
               }
            </div>
         </div>
      </div>

    </div>
  `
})
export class HqSystemConfigComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly canEditSettings = computed(() => this.ecosystem.isSimulationMode() || this.ecosystem.hqOverview() !== null);
  readonly platformCommissionStatus = computed(() => this.ecosystem.hqOverview()?.platformDeliveryCommissionStatus ?? 'coming_soon');
  readonly unavailableMetrics = ['Latência API', 'Vazão do banco', 'Uso de armazenamento', 'Tráfego global'];

  async toggleMaintenanceMode() {
    if (!this.canEditSettings()) return;
    const next = !this.ecosystem.maintenanceMode();
    try {
      await this.ecosystem.setMaintenance(next);
      this.ecosystem.notify(`Bloqueio do shell do Store OS ${next ? 'ativado' : 'desativado'}.`, 'success');
    } catch {
      this.ecosystem.notify('Falha ao atualizar a flag de manutenção. O estado anterior continua ativo.', 'error');
    }
  }

  async sendBroadcast(textarea: HTMLTextAreaElement) {
    if (!this.canEditSettings()) return;
    const message = textarea.value.trim();
    if (!message) {
      this.ecosystem.notify('Digite um aviso antes de publicar.', 'warning');
      return;
    }
    try {
      await this.ecosystem.setBroadcast(message);
      textarea.value = '';
      this.ecosystem.notify('Aviso publicado para o Store OS após a próxima sincronização.', 'success');
    } catch {
      this.ecosystem.notify('Falha ao publicar o aviso. O texto foi mantido para nova tentativa.', 'error');
    }
  }
}
