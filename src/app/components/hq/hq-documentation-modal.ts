import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type DocSection = 'tripartite' | 'modules' | 'delivery' | 'permissions' | 'compliance';

@Component({
  selector: 'app-hq-documentation-modal',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[140] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div class="bg-[#faf7f0] border-2 border-[#d6c7b0] rounded-3xl max-w-4xl w-full p-6 text-stone-950 shadow-2xl max-h-[90vh] flex flex-col space-y-5 animate-in zoom-in-95">
        
        <!-- MODAL HEADER -->
        <div class="flex justify-between items-start pb-4 border-b border-[#e8dfce] shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold shadow-md shrink-0">
              <mat-icon class="text-2xl">menu_book</mat-icon>
            </div>
            <div>
              <div class="flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-amber-900">
                <span>Base documental do ecossistema</span>
                <span aria-hidden="true">·</span>
                <span class="text-stone-500">DOCUMENTAÇÃO DO CÓDIGO ATUAL</span>
              </div>
              <h2 class="text-xl font-serif font-black text-stone-950 mt-1">Guia do HQ Central</h2>
            </div>
          </div>

          <button
            type="button"
            (click)="dismiss.emit()"
            class="text-stone-400 hover:text-stone-800 p-2 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- SECTION NAVIGATION TABS -->
        <div class="flex items-center gap-2 border-b border-[#e8dfce] pb-2 overflow-x-auto no-scrollbar shrink-0 text-xs font-bold">
          <button
            type="button"
            (click)="activeSection.set('tripartite')"
            [class]="activeSection() === 'tripartite' ? 'bg-amber-900 text-white shadow' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'"
            class="px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
            <mat-icon class="text-sm">account_tree</mat-icon>
            <span>1. Arquitetura do ecossistema</span>
          </button>

          <button
            type="button"
            (click)="activeSection.set('modules')"
            [class]="activeSection() === 'modules' ? 'bg-amber-900 text-white shadow' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'"
            class="px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
            <mat-icon class="text-sm">view_module</mat-icon>
            <span>2. Módulos do HQ Central</span>
          </button>

          <button
            type="button"
            (click)="activeSection.set('delivery')"
            [class]="activeSection() === 'delivery' ? 'bg-amber-900 text-white shadow' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'"
            class="px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
            <mat-icon class="text-sm">local_shipping</mat-icon>
            <span>3. Logística &amp; Pagamentos</span>
          </button>

          <button
            type="button"
            (click)="activeSection.set('permissions')"
            [class]="activeSection() === 'permissions' ? 'bg-amber-900 text-white shadow' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'"
            class="px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
            <mat-icon class="text-sm">security</mat-icon>
            <span>4. Matriz de papéis (7 papéis)</span>
          </button>

          <button
            type="button"
            (click)="activeSection.set('compliance')"
            [class]="activeSection() === 'compliance' ? 'bg-amber-900 text-white shadow' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'"
            class="px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
            <mat-icon class="text-sm">library_books</mat-icon>
            <span>5. Documentação por módulo</span>
          </button>
        </div>

        <!-- TAB CONTENT VIEWPORT -->
        <div class="flex-1 overflow-y-auto pr-1 text-xs space-y-4 font-sans text-stone-800 leading-relaxed custom-scrollbar">
          
          @switch (activeSection()) {
            @case ('tripartite') {
              <div class="space-y-3">
                <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1">
                  <h3 class="font-serif font-black text-sm text-amber-950 uppercase flex items-center gap-2">
                    <mat-icon class="text-amber-800">account_tree</mat-icon>
                    <span>Superfícies e limites documentados</span>
                  </h3>
                  <p class="text-stone-700 leading-relaxed">
                    O ecossistema separa superfícies administrativas, operacionais e públicas. Os limites documentados abaixo descrevem o código encontrado nesta versão.
                  </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-rose-900 uppercase text-xs">1. HQ Central (/hq)</div>
                    <p class="text-stone-600 text-[11px]">Área de governança de tenants, planos cadastrados, inventário e configuração regional. A comissão das entregas da plataforma está marcada como em breve. O acesso é validado por <code>hq_admin</code>.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-amber-900 uppercase text-xs">2. Store OS Lojista (/os &amp; /seja-parceiro)</div>
                    <p class="text-stone-600 text-[11px]">Área operacional para lojas. Consulte a documentação do Store OS para módulos e limites observados.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-emerald-900 uppercase text-xs">3. Portal do Consumidor &amp; Marketplace (/home)</div>
                    <p class="text-stone-600 text-[11px]">Superfície pública de descoberta e acesso do consumidor. Consulte os guias de marketplace e público para os fluxos descritos.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-teal-900 uppercase text-xs">4. Vitrine pública e fluxos do consumidor</div>
                    <p class="text-stone-600 text-[11px]">Páginas públicas de loja. Os guias de público descrevem catálogo, pedidos e reservas.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-orange-900 uppercase text-xs">5. App Mobile do Garçom (/waiter)</div>
                    <p class="text-stone-600 text-[11px]">Interface web de atendimento e salão. Consulte o manual do garçom para recursos e limites observados.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-purple-900 uppercase text-xs">6. App do Entregador &amp; Logística (/driver)</div>
                    <p class="text-stone-600 text-[11px]">Área web do motorista e rotas de logística. A localização pode ser enviada pelo próprio motorista; não há GPS de hardware verificado por esta tela.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1 md:col-span-2">
                    <div class="font-serif font-black text-slate-900 uppercase text-xs">7. Backend, pagamentos e persistência</div>
                    <p class="text-stone-600 text-[11px]">A API, os fluxos de pagamento e a persistência estão descritos nos guias de integração. Consulte os contratos para as garantias de cada operação.</p>
                  </div>
                </div>
              </div>
            }

            @case ('modules') {
              <div class="space-y-3">
                <div class="bg-white p-4 rounded-2xl border border-[#e8dfce] space-y-2">
                  <h4 class="font-serif font-black text-amber-950 uppercase text-xs">Módulos Principais do HQ Central (/api/hq/*)</h4>
                  <ul class="list-disc pl-5 space-y-1.5 text-stone-700">
                    <li><strong>Portfólio de Lojas:</strong> Provisionamento em <code>trial</code>, validação de CNPJ, métricas históricas de pedidos, consulta do responsável atual e vínculo de uma conta existente com e-mail confirmado. O HQ não cria a conta nem substitui um responsável já vinculado.</li>
                    <li><strong>Planos Comerciais SaaS:</strong> Edição de mensalidade e cota inicial para novos tenants. O cadastro de dispositivos respeita a cota definida no tenant; alterar o plano não ajusta a cota automaticamente nos tenants existentes nem inicia cobrança recorrente.</li>
                    <li><strong>Inventário de dispositivos:</strong> Cadastro de tenant, nome e serial com bloqueio transacional ao atingir a cota; não envia comandos remotos nem recebe telemetria de hardware.</li>
                    <li><strong>Comissão da plataforma:</strong> Está em breve. A configuração permite manter ou restaurar esse estado; a API não permite ativar antes de existirem entregadores próprios da plataforma e a inteligência operacional estar pronta. Motoristas da loja e seus pagamentos continuam sob responsabilidade do lojista.</li>
                    <li><strong>Portal Regional:</strong> Separação entre <code>/hq_settings/global</code> (privado) e <code>/public_regional/default</code> (banner público do Marketplace).</li>
                    <li><strong>Auditoria estrutural:</strong> Varredura sob demanda de tenants, produtos, pedidos e inventário; não certifica todos os dados do sistema. Logs são persistidos sem garantia de imutabilidade.</li>
                  </ul>
                </div>
              </div>
            }

            @case ('delivery') {
              <div class="space-y-3">
                <div class="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                  <h4 class="font-serif font-black text-amber-950 uppercase text-xs">Governança de Liquidação Financeira &amp; Logística</h4>
                  <p class="text-stone-700 leading-relaxed">
                    Regras auditadas pelo servidor para impedir fraudes de pagamento e vazamento entre frotas de lojas concorrentes:
                  </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-bold text-stone-900">1. Proxy Universal (/api/payments)</div>
                    <p class="text-stone-600 text-[11px]">
                      Nenhuma venda é liquidada por status enviado do navegador. PIX nasce <code>pending_pix</code> até confirmação; espécie exige operador autenticado.
                    </p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-bold text-stone-900">2. Isolamento de Motorista</div>
                    <p class="text-stone-600 text-[11px]">
                      Entregadores consultam e alteram exclusivamente pedidos com <code>driverId === uid</code>; pedidos sem motorista jamais ficam expostos.
                    </p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-bold text-stone-900">3. Frota Própria vs Parceira</div>
                    <p class="text-stone-600 text-[11px]">
                      Rotas de lojas com frota <code>own</code> bloqueiam entregadores externos ou de lojas rivais com <code>403 TENANT_MISMATCH</code>.
                    </p>
                  </div>
                </div>
              </div>
            }

            @case ('permissions') {
              <div class="space-y-3">
                <div class="bg-white p-4 rounded-2xl border border-[#e8dfce] overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-stone-200 font-mono font-bold text-stone-500 uppercase text-[10px]">
                        <th class="py-2 px-3">PAPEL RBAC</th>
                        <th class="py-2 px-3">SUPERFÍCIE</th>
                        <th class="py-2 px-3">ESCOPO DE AUTORIDADE</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-stone-100 font-mono">
                      <tr>
                        <td class="py-2 px-3 font-bold text-rose-900">hq_admin</td>
                        <td class="py-2 px-3 text-stone-600">/hq</td>
                        <td class="py-2 px-3 text-stone-800 font-sans">Governança SaaS, tenants, planos cadastrados, preparação da comissão futura de entregas, inventário e auditoria estrutural.</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 font-bold text-amber-900">tenant_owner</td>
                        <td class="py-2 px-3 text-stone-600">/os</td>
                        <td class="py-2 px-3 text-stone-800 font-sans">Gestão integral da própria loja, equipe interna, catálogo ERP, reservas e DRE. O vínculo inicial da conta é feito pelo HQ no tenant.</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 font-bold text-amber-800">operator</td>
                        <td class="py-2 px-3 text-stone-600">/os</td>
                        <td class="py-2 px-3 text-stone-800 font-sans">PDV, KDS, mesas, reservas, estoque, sangria/suprimento e despacho da filial.</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 font-bold text-orange-800">waiter</td>
                        <td class="py-2 px-3 text-stone-600">/waiter &amp; /os</td>
                        <td class="py-2 px-3 text-stone-800 font-sans">Mapa de mesas, reservas e comandas de salão (bloqueado em financeiro 403).</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 font-bold text-purple-900">driver</td>
                        <td class="py-2 px-3 text-stone-600">/driver</td>
                        <td class="py-2 px-3 text-stone-800 font-sans">Rotas compatíveis com sua frota e entregas estritamente atribuídas (driverId).</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 font-bold text-emerald-900">consumer / guest</td>
                        <td class="py-2 px-3 text-stone-600">/home, /marketplace &amp; /p/:id</td>
                        <td class="py-2 px-3 text-stone-800 font-sans">Catálogo público sanitizado, checkout validado, reserva online e histórico próprio.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @case ('compliance') {
              <div class="space-y-4">
                <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1">
                  <h3 class="font-serif font-black text-sm text-amber-950 uppercase flex items-center gap-2">
                    <mat-icon class="text-amber-800">menu_book</mat-icon>
                    <span>Documentação técnica por módulo</span>
                  </h3>
                  <p class="text-stone-700 leading-relaxed text-[11px]">
                    Este índice aponta os temas cobertos pelos arquivos. O nome ou descrição de um documento não certifica que cada recurso esteja implementado ou validado:
                  </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- Núcleo 1: HQ Central -->
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-2">
                    <div class="flex items-center gap-2 text-rose-900 font-bold uppercase text-xs">
                      <mat-icon class="text-sm">admin_panel_settings</mat-icon>
                      <span>1. HQ Central (/docs/HQ/)</span>
                    </div>
                    <ul class="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                      <li><code>00_ARQUITETURA_HQ.md</code>: Escopo e governança.</li>
                      <li><code>01_EMPRESAS_E_TENANTS.md</code>: Cadastro e ciclo de vida de tenants.</li>
                      <li><code>02_CONTAS_E_PERMISSOES.md</code>: Identidade e controles de acesso.</li>
                      <li><code>03_PLANOS_LICENCAS_E_ASSINATURAS.md</code>: Cotas cadastradas e limites de aplicação.</li>
                      <li><code>04_PAGAMENTOS_E_COBRANCA.md</code>: Comissão da plataforma em breve; cobrança de planos e payout ainda não automatizados.</li>
                      <li><code>05_DISPOSITIVOS_E_ATIVACAO.md</code>: Inventário sem agente MDM físico localizado.</li>
                      <li><code>06_OPERACOES_E_AUDITORIA.md</code>: Escopo da varredura e da flag de manutenção.</li>
                    </ul>
                  </div>

                  <!-- Núcleo 2: Store OS Lojista -->
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-2">
                    <div class="flex items-center gap-2 text-amber-900 font-bold uppercase text-xs">
                      <mat-icon class="text-sm">desktop_windows</mat-icon>
                      <span>2. Store OS Lojista (/docs/OS/)</span>
                    </div>
                    <ul class="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                      <li><code>00_ARQUITETURA_OS.md</code>: Estação de trabalho desktop multitarefa.</li>
                      <li><code>01_IDENTIDADE_E_ACESSOS.md</code>: Identidade e acessos.</li>
                      <li><code>02_EMPRESAS_E_FILIAIS.md</code>: Empresas e filiais.</li>
                      <li><code>03_APLICATIVOS_E_MODULOS.md</code>: Catálogo de módulos e eApps.</li>
                      <li><code>04_PDV_E_OPERACOES.md</code>: Operações de caixa e rotinas do PDV.</li>
                      <li><code>05_ESTOQUE_E_PRODUTOS.md</code>: Estoque e cadastro de produtos.</li>
                      <li><code>06_FINANCEIRO.md</code>: Registros e fluxos financeiros.</li>
                      <li><code>07_PEDIDOS_E_ATENDIMENTO.md</code>: Pedidos e atendimento.</li>
                      <li><code>08_DISPOSITIVOS_E_PERIFERICOS.md</code>: Dispositivos e periféricos.</li>
                      <li><code>09_PERSISTENCIA_E_SINCRONIZACAO.md</code>: Persistência e sincronização.</li>
                    </ul>
                  </div>

                  <!-- Núcleo 3: Espaços Públicos -->
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-2">
                    <div class="flex items-center gap-2 text-emerald-900 font-bold uppercase text-xs">
                      <mat-icon class="text-sm">storefront</mat-icon>
                      <span>3. Espaços Públicos (/docs/PUBLICO/)</span>
                    </div>
                    <ul class="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                      <li><code>00_ARQUITETURA_PUBLICO.md</code>: Arquitetura das superfícies públicas.</li>
                      <li><code>01_MARKETPLACE_REGIONAL.md</code>: Marketplace regional.</li>
                      <li><code>02_VITRINE_LOJA_E_CARDAPIO.md</code>: Vitrine e cardápio.</li>
                      <li><code>03_AUTOATENDIMENTO_E_QR_MESA.md</code>: Autoatendimento e QR de mesa.</li>
                      <li><code>04_CHECKOUT_PAGAMENTO_E_PIX.md</code>: Checkout, pagamentos e Pix.</li>
                      <li><code>05_PERFIL_CONSUMIDOR_E_RESERVAS.md</code>: Perfil do consumidor e reservas.</li>
                    </ul>
                  </div>

                  <!-- Núcleo 4: Apps Mobile Android -->
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-2">
                    <div class="flex items-center gap-2 text-purple-900 font-bold uppercase text-xs">
                      <mat-icon class="text-sm">smartphone</mat-icon>
                      <span>4. Apps Mobile Android (/docs/APPS_MOBILE/)</span>
                    </div>
                    <ul class="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                      <li><code>00_ARQUITETURA_MOBILE_ANDROID.md</code>: Arquitetura e escopo móvel descritos.</li>
                      <li><code>01_APP_MOTORISTA_ENTREGADOR.md</code>: Fluxos de motorista e entregador.</li>
                      <li><code>02_APP_GARCOM_E_SALAO.md</code>: Fluxos de garçom e salão.</li>
                      <li><code>03_APP_CONSUMIDOR_MARKETPLACE.md</code>: Fluxos móveis do consumidor.</li>
                    </ul>
                  </div>

                  <!-- Núcleo 5: Contrato e Integração -->
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-2 md:col-span-2">
                    <div class="flex items-center gap-2 text-slate-900 font-bold uppercase text-xs">
                      <mat-icon class="text-sm">sync_alt</mat-icon>
                      <span>5. Contrato e Integração Transversal (/docs/INTEGRACAO/)</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600">
                      <div>
                        <p class="font-bold text-stone-800">00_CONTRATO_HQ_OS.md</p>
                        <p>Contrato entre HQ e Store OS.</p>
                      </div>
                      <div>
                        <p class="font-bold text-stone-800">01_MODELO_DE_DADOS.md</p>
                        <p>Modelo de dados e interfaces do sistema.</p>
                      </div>
                      <div>
                        <p class="font-bold text-stone-800">02_API_E_EVENTOS.md</p>
                        <p>Rotas de API e eventos documentados.</p>
                      </div>
                      <div>
                        <p class="font-bold text-stone-800">03_SEGURANCA_MULTITENANT.md</p>
                        <p>Controles de segurança multitenant documentados.</p>
                      </div>
                      <div class="sm:col-span-2">
                        <p class="font-bold text-stone-800">04_TESTES_E_RECUPERACAO.md</p>
                        <p>Estratégia de testes e recuperação descrita. Consulte os resultados atuais antes de considerar qualquer cenário validado.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          }

        </div>

        <!-- FOOTER ACTIONS -->
        <div class="pt-3 border-t border-[#e8dfce] flex justify-between items-center shrink-0">
          <span class="text-[10px] font-mono text-stone-500">
            Arquivos de referência em /docs; consulte o conteúdo atual no repositório.
          </span>

          <button
            type="button"
            (click)="dismiss.emit()"
            class="bg-amber-900 hover:bg-amber-950 text-white font-bold px-5 py-2 rounded-xl text-xs shadow cursor-pointer">
            Entendido
          </button>
        </div>

      </div>
    </div>
  `
})
export class HqDocumentationModalComponent {
  dismiss = output<void>();
  readonly activeSection = signal<DocSection>('tripartite');
}

