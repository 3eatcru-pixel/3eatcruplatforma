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
                <span>Documentação Oficial do SaaS</span>
                <span aria-hidden="true">·</span>
                <span class="text-stone-500">V7.0 CONSOLIDADA · 7 PILARES</span>
              </div>
              <h2 class="text-xl font-serif font-black text-stone-950 mt-1">Manual Executivo HQ Central (Governança dos 7 Pilares)</h2>
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
            <span>1. Os 7 Pilares</span>
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
            <span>4. Matriz RBAC (6 Papéis)</span>
          </button>

          <button
            type="button"
            (click)="activeSection.set('compliance')"
            [class]="activeSection() === 'compliance' ? 'bg-amber-900 text-white shadow' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'"
            class="px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
            <mat-icon class="text-sm">library_books</mat-icon>
            <span>5. Documentação Profunda (5 Núcleos)</span>
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
                    <span>Arquitetura Consolidada em 7 Pilares Independentes</span>
                  </h3>
                  <p class="text-stone-700 leading-relaxed">
                    O ecossistema 3EATCRU V7.0 separa cada superfície operacional, público-alvo e fronteira de API em 7 pilares estruturais documentados em <code>/docs/PILAR_1_*.md</code> a <code>/docs/PILAR_7_*.md</code>:
                  </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-rose-900 uppercase text-xs">1. HQ Central (/hq)</div>
                    <p class="text-stone-600 text-[11px]">Gabinete exclusivo do Dono SaaS (<code>hq_admin</code>): ativação de tenants, planos MDM, split 8%, banner regional e auditoria master.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-amber-900 uppercase text-xs">2. Store OS Lojista (/os &amp; /seja-parceiro)</div>
                    <p class="text-stone-600 text-[11px]">Estação Desktop/Tablet multissegmento (Restaurante, Varejo/Eletro, Farmácia, Auto/O.S.), PDV, KDS, Reservas, Estoque e DRE.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-emerald-900 uppercase text-xs">3. Portal do Consumidor &amp; Marketplace (/home)</div>
                    <p class="text-stone-600 text-[11px]">Praça pública do consumidor com descoberta geodésica Haversine, destaques curados e perfil de fidelidade (<code>/consumer/login</code>). Suporta alias <code>/marketplace</code>.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-teal-900 uppercase text-xs">4. Vitrine Pública &amp; Reservas (/p/:id)</div>
                    <p class="text-stone-600 text-[11px]">Catálogo sanitizado (<code>availableOnline</code>), checkout Delivery / Retirada Balcão / QR Code Mesa e Reserva Online de Mesa.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-orange-900 uppercase text-xs">5. App Mobile do Garçom (/waiter)</div>
                    <p class="text-stone-600 text-[11px]">Atendimento volante no salão com status de mesas (Livre, Reservada, Ocupada, Conta), 3 tempos de cozinha e pré-conta.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1">
                    <div class="font-serif font-black text-purple-900 uppercase text-xs">6. App do Entregador &amp; Logística (/driver)</div>
                    <p class="text-stone-600 text-[11px]">Roteirização Haversine, isolamento estrito <code>driverId === uid</code>, validação de frota própria vs parceira e telemetria GPS.</p>
                  </div>

                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-1 md:col-span-2">
                    <div class="font-serif font-black text-slate-900 uppercase text-xs">7. Núcleo Backend, Pagamentos, Offline &amp; Firestore Zero-Trust</div>
                    <p class="text-stone-600 text-[11px]">12 roteadores Express desacoplados, <code>CommerceEngine</code> ACID, Proxy Universal <code>/api/payments</code>, Outbox Offline idempotente e 18 coleções protegidas em <code>firestore.rules</code>.</p>
                  </div>
                </div>
              </div>
            }

            @case ('modules') {
              <div class="space-y-3">
                <div class="bg-white p-4 rounded-2xl border border-[#e8dfce] space-y-2">
                  <h4 class="font-serif font-black text-amber-950 uppercase text-xs">Módulos Principais do HQ Central (/api/hq/*)</h4>
                  <ul class="list-disc pl-5 space-y-1.5 text-stone-700">
                    <li><strong>Portfólio de Lojas:</strong> Homologação de estabelecimentos cadastrados com CNPJ de 14 dígitos (<code>trial</code> → <code>active</code> / <code>suspended</code>).</li>
                    <li><strong>Planos Comerciais SaaS:</strong> 100% dos módulos liberados em todos os planos; diferenciação objetiva por limite de terminais MDM conectados.</li>
                    <li><strong>Frota MDM &amp; Supervisão Global:</strong> Bloqueio/reinício remoto auditado de terminais POS e supervisão global de entregadores em <code>/api/logistics/drivers</code>.</li>
                    <li><strong>Tesouraria &amp; Split (8%):</strong> Consolidação exclusiva de vendas efetivamente pagas (<code>paymentStatus === 'paid'</code>) via <code>CommerceEngine</code>.</li>
                    <li><strong>Portal Regional:</strong> Separação entre <code>/hq_settings/global</code> (privado) e <code>/public_regional/default</code> (banner público do Marketplace).</li>
                    <li><strong>Auditoria Master:</strong> Inspeção aritmética e estrutural em <code>POST /api/hq/audit/run</code> gravando logs append-only em <code>/audit_logs</code>.</li>
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
                        <td class="py-2 px-3 text-stone-800 font-sans">Governança global SaaS, ativação de empresas, planos, split, MDM e auditoria.</td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 font-bold text-amber-900">tenant_owner</td>
                        <td class="py-2 px-3 text-stone-600">/os</td>
                        <td class="py-2 px-3 text-stone-800 font-sans">Gestão integral da própria loja, equipe interna, catálogo ERP, reservas e DRE.</td>
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
                    <span>Documentação Técnica Profunda em 5 Núcleos (28 Manuais Técnicos)</span>
                  </h3>
                  <p class="text-stone-700 leading-relaxed text-[11px]">
                    Cada módulo do ecossistema possui documentação detalhada estruturada em 4 perspectivas (Responsabilidade Funcional, Implementação Real, Conexões e Validação Empírica) e classificada pelo modelo de maturidade de 5 níveis:
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
                      <li><code>00_ARQUITETURA_HQ.md</code>: Gabinete Executivo e isolamento.</li>
                      <li><code>01_EMPRESAS_E_TENANTS.md</code>: Validação algorítmica de CNPJ e aprovação.</li>
                      <li><code>02_CONTAS_E_PERMISSOES.md</code>: Claims Firebase Auth e RBAC.</li>
                      <li><code>03_PLANOS_LICENCAS_E_ASSINATURAS.md</code>: Quotas de hardware MDM.</li>
                      <li><code>04_PAGAMENTOS_E_COBRANCA.md</code>: Split SaaS de 8% e livro-razão.</li>
                      <li><code>05_DISPOSITIVOS_E_ATIVACAO.md</code>: Bloqueio remoto e reboot de terminais.</li>
                      <li><code>06_OPERACOES_E_AUDITORIA.md</code>: Auditoria estrutural autônoma.</li>
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
                      <li><code>01_IDENTIDADE_E_ACESSOS.md</code>: PIN de 6 dígitos bancários.</li>
                      <li><code>02_EMPRESAS_E_FILIAIS.md</code>: Fronteira física da filial e isolamento.</li>
                      <li><code>03_APLICATIVOS_E_MODULOS.md</code>: Catálogo canônico dos 30 eApps.</li>
                      <li><code>04_PDV_E_OPERACOES.md</code>: Abertura, sangria, suprimento e fechamento cego.</li>
                      <li><code>05_ESTOQUE_E_PRODUTOS.md</code>: NFe XML, perdas e etiquetas térmicas.</li>
                      <li><code>06_FINANCEIRO.md</code>: DRE em tempo real e bloqueio 403 de salão.</li>
                      <li><code>07_PEDIDOS_E_ATENDIMENTO.md</code>: KDS e 3 tempos gastronômicos.</li>
                      <li><code>08_DISPOSITIVOS_E_PERIFERICOS.md</code>: ESC/POS, balanças e leitores.</li>
                      <li><code>09_PERSISTENCIA_E_SINCRONIZACAO.md</code>: Outbox offline e 409 STOCK_CONFLICT.</li>
                    </ul>
                  </div>

                  <!-- Núcleo 3: Espaços Públicos -->
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-2">
                    <div class="flex items-center gap-2 text-emerald-900 font-bold uppercase text-xs">
                      <mat-icon class="text-sm">storefront</mat-icon>
                      <span>3. Espaços Públicos (/docs/PUBLICO/)</span>
                    </div>
                    <ul class="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                      <li><code>00_ARQUITETURA_PUBLICO.md</code>: Barreira de sanitização anti-vazamento.</li>
                      <li><code>01_MARKETPLACE_REGIONAL.md</code>: Praça com mapa Leaflet e raio geodésico.</li>
                      <li><code>02_VITRINE_LOJA_E_CARDAPIO.md</code>: Vitrine /loja/:slug e takeout taxa zero.</li>
                      <li><code>03_AUTOATENDIMENTO_E_QR_MESA.md</code>: Autoatendimento sem fila via QR code.</li>
                      <li><code>04_CHECKOUT_PAGAMENTO_E_PIX.md</code>: Pix dinâmico EMV e trava anti-fraude.</li>
                      <li><code>05_PERFIL_CONSUMIDOR_E_RESERVAS.md</code>: Reservas ACID e endereços salvos.</li>
                    </ul>
                  </div>

                  <!-- Núcleo 4: Apps Mobile Android -->
                  <div class="bg-white p-3.5 rounded-2xl border border-[#e8dfce] space-y-2">
                    <div class="flex items-center gap-2 text-purple-900 font-bold uppercase text-xs">
                      <mat-icon class="text-sm">smartphone</mat-icon>
                      <span>4. Apps Mobile Android (/docs/APPS_MOBILE/)</span>
                    </div>
                    <ul class="text-[11px] text-stone-600 space-y-1 list-disc pl-4">
                      <li><code>00_ARQUITETURA_MOBILE_ANDROID.md</code>: PWA/TWA Android e sensores.</li>
                      <li><code>01_APP_MOTORISTA_ENTREGADOR.md</code>: App /driver com QR clock-in e GPS.</li>
                      <li><code>02_APP_GARCOM_E_SALAO.md</code>: App /waiter com comandas e bloqueio 403.</li>
                      <li><code>03_APP_CONSUMIDOR_MARKETPLACE.md</code>: PWA /marketplace para smartphone touch.</li>
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
                        <p>Propriedade de dados e permissões estritas de alteração.</p>
                      </div>
                      <div>
                        <p class="font-bold text-stone-800">01_MODELO_DE_DADOS.md</p>
                        <p>17 coleções canônicas do Firestore e interfaces TS.</p>
                      </div>
                      <div>
                        <p class="font-bold text-stone-800">02_API_E_EVENTOS.md</p>
                        <p>Os 12 roteadores Express e dicionário de erros.</p>
                      </div>
                      <div>
                        <p class="font-bold text-stone-800">03_SEGURANCA_MULTITENANT.md</p>
                        <p>Regras Firestore default-deny e trava client SDK.</p>
                      </div>
                      <div class="sm:col-span-2">
                        <p class="font-bold text-stone-800">04_TESTES_E_RECUPERACAO.md</p>
                        <p>8 Guerras Comerciais, 79 testes automatizados e recuperação de desastres.</p>
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
            Sincronizado com /docs/PILAR_1_HQ_CENTRAL.md .. PILAR_7_NUCLEO_BACKEND_OFFLINE_E_SEGURANCA.md
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

