# Store OS — 03: Aplicativos e módulos

## Escopo e nomenclatura

**Módulo** é a capacidade de negócio (ex.: estoque, pedidos, financeiro). **eApp** é uma interface integrada como janela ao desktop /os. Uma rota ou API disponível não comprova que o módulo tenha eApp.

Fontes de referência no código:

- Registro de atalhos: src/app/components/os/os-apps-registry.ts.
- Renderização das janelas: src/app/components/client-os.ts.
- Rotas: src/app/app.routes.ts.
- Serviços e APIs: src/app/services/ e src/server/routes/.

## Estado verificado em 2026-11-02

O registro contém 33 IDs. O desktop possui 21 eApps operacionais integrados, três simuladores, um catálogo de plugins de delivery sem conectores ativos e sete atalhos que ainda dependem de integrações externas ou administrativas. O PDV operacional fica em rota standalone. O estado de cada ID é descrito abaixo.

| IDs | Estado no Store OS | Implementação encontrada |
|---|---|---|
| pos | 🟡 Rota standalone | /pos carrega src/app/components/pos-terminal.ts; a janela do desktop encaminha para essa rota. Subcomponentes em src/app/components/eapps/pos/. |
| waiter-sim, driver-sim, consumer-sim | 🔵 Simuladores | Molduras de demonstração em src/app/components/eapps/eapp-*-sim.ts, reutilizando as telas de garçom, entregador e marketplace. |
| store-manager | 🟡 eApp integrado | Minha Loja abre pelo desktop e edita nome, descrição pública, horário informativo, aberto/fechado, entrega/retirada, taxa paga pelo cliente, complemento pago pela loja ao entregador, pedido mínimo e chave PIX. A remuneração combinada é a soma das duas parcelas e fica registrada nos pedidos/rotas; pagamento real segue por conta da loja. Lojas novas iniciam sem horário, taxa ou pedido mínimo de exemplo; valores opcionais podem ser removidos. O catálogo de produtos é outro módulo; banner, praça, raio de descoberta e curadoria do marketplace geral são gerenciados pelo HQ. O PATCH valida a lista de campos por perfil; a chave PIX tem limite de 77 caracteres, sem validação de formato ou titularidade. |
| tables | 🟡 eApp integrado — operação de salão | Consulta e atualiza mesas da unidade, permite abrir/liberar mesa e cadastrar mesas para proprietário/operador. O servidor valida tenant, status, capacidade e impede liberação com saldo aberto; reservas controlam os estados `reserved`. |
| agenda | 🟡 eApp integrado — reservas | Lista por data, registra reserva manual, confirma, acomoda, cancela e marca não comparecimento via `AppointmentsService`; atribuição e ocupação de mesa são transacionais no servidor. Não liquida comandas nem libera uma mesa ocupada ao encerrar reserva. |
| kds | 🟡 eApp integrado — escopo operacional | Carrega pedidos da unidade; proprietário/operador pode avançar `pending` → `preparing` → `ready`; garçom tem consulta sem alteração. Cancelamento e conclusão financeira continuam em fluxos autorizados separados. |
| inventory | 🟡 eApp integrado — escopo parcial | Abre no desktop, carrega produtos do tenant selecionado e permite cadastro pelo `InventoryService`. Não oferece ajuste direto de saldo nem histórico de movimentos. |
| finance | 🟡 eApp integrado — consulta | Lê lançamentos da unidade; totais reais excluem `isSimulated`/`mode=simulation`, que continuam visíveis com rótulo próprio. Em modo de plataforma simulado, totais são demonstrativos. Pendências não entram no saldo. Não realiza DRE, conciliação ou lançamentos. |
| history | 🟡 eApp integrado — consulta | Consulta os 200 pedidos mais recentes da unidade, com situação e pagamento. Não tem paginação ou exportação. |
| reports | 🟡 eApp integrado — resumo comercial | Soma pedidos concluídos com pagamento aprovado, calcula ticket médio e agrupa por canal dentro dos 200 pedidos mais recentes. Não é DRE, margem ou conciliação. |
| crm | 🟡 eApp integrado — resumo de clientes | Agrupa clientes identificados nos pedidos pagos recentes da unidade. Não altera pontos nem envia campanhas; política de fidelidade e provedores ainda não estão configurados. |
| drivers | 🟡 eApp integrado — logística da loja | Cadastra frota própria, cria rotas com pedidos prontos e permite atribuição a motorista da mesma unidade. O valor da rota é o combinado da loja e não registra pagamento. |
| delivery-marketplaces | 🟡 eApp e fila persistida — conectores pendentes | Centraliza metadados de plugins iFood, 99Food e Rappi. As APIs de leitura de fila e estado da conexão e a persistência idempotente interna existem; ainda não há webhook, polling, OAuth nem adapter que alimente a fila. As rotas são restritas a proprietário/operador e usam o tenant da sessão. iFood é plugin, não janela própria. |
| settings | 🟡 eApp integrado — preferências e periféricos | Persiste tema, perfil, atalhos e workspaces por usuário/unidade; proprietário/operador cadastra perfis compartilhados de maquininhas da loja e configura nome/largura da impressora local do caixa. Impressão usa diálogo do navegador; sem pareamento de terminal ou ESC/POS. |
| calculator | 🟡 eApp integrado — utilitário local | Calculadora de uma operação, sem persistência ou vínculo com lançamentos comerciais. |
| docs | 🟡 eApp integrado — manual estático | Apresenta guias operacionais embutidos; a fonte canônica de especificações continua na documentação do repositório. |
| system | 🟡 eApp integrado — sessão informativa | Mostra sessão e unidade ativa; não coleta diagnóstico de hardware ou disponibilidade do backend. |
| suppliers | 🟡 eApp integrado — cadastro | Mantém contatos de fornecedores por unidade; não cria pedido de compra nem recebimento de mercadoria. |
| stock-audit | 🟡 eApp integrado — contagem registrada | Salva contagens e divergências com fotografia do saldo consultado no servidor; não altera saldo automaticamente. No modo simulado, o resultado fica apenas na sessão. |
| tasks | 🟡 eApp integrado — checklist | Cria tarefas e persiste conclusão por unidade; não atribui responsável individual nem define recorrência. |
| calendar | 🟡 eApp integrado — consulta | Exibe reservas da unidade na data escolhida; não edita a agenda, que permanece no eApp `agenda`. |
| services | 🟡 eApp integrado — ordens de serviço | Abre O.S. e avança estados operacionais por unidade. Não registra cobrança nem pagamento. |
| rh | 🟡 eApp integrado — equipe e ponto | Cadastro básico de equipe e registro manual de entrada/saída; sem CPF, salário, folha ou integração trabalhista. |
| notes | 🟡 eApp integrado — notas privadas | Notas persistidas por usuário e filtro opcional da unidade ativa; não são compartilhadas entre operadores. |
| reconciliation, whatsapp, instagram, google-drive, admin-hub, appstore, browser | ⚪ Próxima etapa / dependência externa | Ainda sem fluxo integrado de produção. Provedores, OAuth, conectividade física, escopo administrativo e/ou superfície segura de navegação precisam ser definidos e homologados. |

As telas /waiter, /driver, /hq e as vitrines públicas são rotas próprias, não janelas do Store OS. A existência dessas rotas não altera o estado dos IDs homônimos no desktop.

### Componentes de protótipo fora do desktop

Os arquivos abaixo ainda são protótipos ou dependem de configuração externa; não são fluxos integrados prontos para produção.

| Arquivo | Limite verificado |
|---|---|
| `features/delivery-marketplaces/` | eApp com catálogo de plugins e fila persistida, vazia enquanto os adapters não forem conectados. iFood, 99Food e Rappi ainda não têm conector de produção; veja [o contrato e as dependências](../INTEGRACAO/05_PLUGINS_MARKETPLACES_DELIVERY.md). |
| `eapp-google-drive.ts` | Lista arquivos de exemplo; o botão de backup fica desabilitado e não chama o serviço de Drive. |
| `GoogleDriveService` e seletor compartilhado | OAuth só marca conexão ativa após obter token e carregar arquivos. Sem token, a lista e uploads são locais/demonstrativos; não estão conectados ao desktop do lojista. |
| `eapp-whatsapp.ts` | Contatos e mensagens locais de demonstração; não envia mensagens externas. |
| `eapp-instagram.ts` | Publicações e métricas estáticas; não consulta nem publica na rede social. |
| `eapp-reconciliation.ts` | Sem importação de extratos; não calcula taxas, liquidação ou divergências. |
| `eapp-admin-hub.ts` | Mostra dados da sessão/unidade; não monitora terminais nem executa MDM. |

## Módulos de negócio existentes fora das janelas

| Domínio | Serviços/rotas encontrados | Situação da interface desktop |
|---|---|---|
| Pedidos | OrdersService, orders.router.ts | eApps KDS e Histórico integrados. Histórico consulta até 200 registros recentes; KDS avança preparo até `ready`, sem concluir pedido ou liquidar pagamento. |
| Produtos e estoque | InventoryService, products.router.ts, stock-audits.router.ts, suppliers.router.ts | Consulta/cadastro de produtos, diretório de fornecedores e registro de contagens com divergência. Ajuste direto de saldo, pedidos de compra e recebimento ainda não disponíveis. |
| Catálogo público | InventoryService.publicCatalog e /api/products/public | Signal separado do catálogo interno e filtrado pelo tenant da vitrine. |
| Perfil e pedidos do consumidor | ConsumerProfileComponent, CrmService, `/api/crm/consumers/me`, OrdersService | Google/Firebase autentica a identidade; perfil próprio é carregado e salvo por UID; o histórico usa `customerId` exato. Salão/QR não é oferecido sem uma mesa disponível do tenant. CPF e programa real de pontos não estão ativos. Pedidos e perfis demo são locais. |
| Financeiro | FinancialsService, financials.router.ts | eApp somente leitura; totais reais excluem lançamentos simulados e a tabela os identifica. Em modo de plataforma simulado, os totais usam somente a demonstração. Não é DRE nem conciliação; operações de caixa continuam iniciadas no PDV. |
| Relatórios e CRM | OrdersService, orders.router.ts, CrmService | eApps integrados em resumo de vendas/clientes dos 200 pedidos mais recentes; sem pontos, campanhas ou exportação. O backend de campanhas só salva rascunhos e não envia mensagens externas. |
| Mesas e reservas | TablesService, AppointmentsService, tables.router.ts, reservations.router.ts | eApps `tables` e `agenda` integrados; status e permissões são validados pelo servidor, com conflito de horário e capacidade de mesa verificados para reservas. O App Garçom continua em rota separada. No modo simulado, mesas, reservas e pedidos ficam em memória local. |
| Logística | LogisticsService, logistics.router.ts | eApp Hub Logística integrado para frota privada, vínculo de conta por e-mail verificado, criação e atribuição de rotas e mapa com posições recentes compartilhadas pelo entregador autenticado durante rota em andamento. O App Entregador permanece em rota separada; não há geocodificação, cálculo de rota ou histórico GPS. O valor de rota não é pagamento. |
| Equipe, tarefas e ordens de serviço | HrService, TasksService, ServiceOrdersService e routers dedicados | Cadastro básico de equipe/ponto, tarefas simples e fluxo operacional de O.S.; sem folha, atribuição de responsáveis, cobrança ou pagamento. |
| Notas e calendário | NotesService, AppointmentsService e routers dedicados | Notas privadas de operador e calendário somente leitura de reservas; o eApp `agenda` mantém as operações de reserva. |

## Limite do modo simulado

O modo simulado mantém pedidos, lançamentos financeiros, reservas, mesas, motoristas, rotas, produtos, perfis de consumidor, notas, RH, tarefas e ordens de serviço no estado local da sessão; a conferência de estoque pode ser calculada localmente e não é persistida. Rascunhos de campanha são locais, mas despacho continua bloqueado. Esses módulos não enviam chamadas de leitura ou escrita real durante a simulação; suas alterações ficam marcadas como simuladas e são descartadas ao trocar modo, tenant ou usuário. Mesas e rotas recebem fixtures de demonstração para os apps do Garçom e do Entregador. O GPS do consumidor não é solicitado na simulação; no modo real serve apenas para calcular distância no navegador. A fila offline de pedidos não recebe operações simuladas. Isso não representa persistência, sincronização com o servidor ou homologação dos módulos.

A simulação cobre apenas os fluxos com tratamento local explícito. Ela não emula hardware, não executa teste de carga e não substitui a homologação de pagamento, autenticação ou integrações externas. No modo real, cada recurso depende de seu endpoint, credenciais e configuração próprios.

## Critérios para atualizar este mapa

Marcar um módulo como eApp implementado somente após confirmar arquivo de componente existente, registro/import no client-os.ts e caso de renderização correspondente. Marcar como produção somente depois de confirmar integração, autorização e homologação; a documentação não deve declarar testes executados sem evidência da execução atual.
