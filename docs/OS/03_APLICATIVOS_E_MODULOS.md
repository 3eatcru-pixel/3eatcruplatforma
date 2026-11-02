# Store OS — 03: Aplicativos e módulos

## Escopo e nomenclatura

**Módulo** é a capacidade de negócio (ex.: estoque, pedidos, financeiro). **eApp** é uma interface integrada como janela ao desktop /os. Uma rota ou API disponível não comprova que o módulo tenha eApp.

Fontes de referência no código:

- Registro de atalhos: src/app/components/os/os-apps-registry.ts.
- Renderização das janelas: src/app/components/client-os.ts.
- Rotas: src/app/app.routes.ts.
- Serviços e APIs: src/app/services/ e src/server/routes/.

## Estado verificado em 2026-11-01

O registro contém 33 IDs. O desktop possui 21 eApps operacionais integrados e três simuladores; oito integrações externas ou administrativas continuam como próximas etapas explícitas. O PDV operacional fica em rota standalone. O estado de cada ID é descrito abaixo.

| IDs | Estado no Store OS | Implementação encontrada |
|---|---|---|
| pos | 🟡 Rota standalone | /pos carrega src/app/components/pos-terminal.ts; a janela do desktop encaminha para essa rota. Subcomponentes em src/app/components/eapps/pos/. |
| waiter-sim, driver-sim, consumer-sim | 🔵 Simuladores | Molduras de demonstração em src/app/components/eapps/eapp-*-sim.ts, reutilizando as telas de garçom, entregador e marketplace. |
| store-manager | 🟡 eApp integrado | Minha Loja abre pelo desktop e permite editar a vitrine, taxa, pedido mínimo e chave PIX da conta da loja. O servidor limita a chave a 77 caracteres, mas não verifica formato ou titularidade. |
| tables | 🟡 eApp integrado — operação de salão | Consulta e atualiza mesas da unidade, permite abrir/liberar mesa e cadastrar mesas para proprietário/operador. O servidor valida tenant, status, capacidade e impede liberação com saldo aberto; reservas controlam os estados `reserved`. |
| agenda | 🟡 eApp integrado — reservas | Lista por data, registra reserva manual, confirma, acomoda, cancela e marca não comparecimento via `AppointmentsService`; atribuição e ocupação de mesa são transacionais no servidor. Não liquida comandas nem libera uma mesa ocupada ao encerrar reserva. |
| kds | 🟡 eApp integrado — escopo operacional | Carrega pedidos da unidade; proprietário/operador pode avançar `pending` → `preparing` → `ready`; garçom tem consulta sem alteração. Cancelamento e conclusão financeira continuam em fluxos autorizados separados. |
| inventory | 🟡 eApp integrado — escopo parcial | Abre no desktop, carrega produtos do tenant selecionado e permite cadastro pelo `InventoryService`. Não oferece ajuste direto de saldo nem histórico de movimentos. |
| finance | 🟡 eApp integrado — consulta | Lê lançamentos da unidade; vendas/entradas e despesas liquidadas compõem o resumo. Pendências aparecem sem entrar no saldo. Não realiza DRE, conciliação ou lançamentos. |
| history | 🟡 eApp integrado — consulta | Consulta os 200 pedidos mais recentes da unidade, com situação e pagamento. Não tem paginação ou exportação. |
| reports | 🟡 eApp integrado — resumo comercial | Soma pedidos concluídos com pagamento aprovado, calcula ticket médio e agrupa por canal dentro dos 200 pedidos mais recentes. Não é DRE, margem ou conciliação. |
| crm | 🟡 eApp integrado — resumo de clientes | Agrupa clientes identificados nos pedidos pagos recentes da unidade. Não altera pontos nem envia campanhas; política de fidelidade e provedores ainda não estão configurados. |
| drivers | 🟡 eApp integrado — logística da loja | Cadastra frota própria, cria rotas com pedidos prontos e permite atribuição a motorista da mesma unidade. O valor da rota é o combinado da loja e não registra pagamento. |
| settings | 🟡 eApp integrado — preferências locais | Persiste tema, perfil operacional, atalhos e workspaces por usuário/unidade. Não configura hardware. |
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
| reconciliation, whatsapp, ifood, instagram, google-drive, admin-hub, appstore, browser | ⚪ Próxima etapa / dependência externa | Ainda sem fluxo integrado de produção. Provedores, OAuth, conectividade física, escopo administrativo e/ou superfície segura de navegação precisam ser definidos e homologados. |

As telas /waiter, /driver, /hq e as vitrines públicas são rotas próprias, não janelas do Store OS. A existência dessas rotas não altera o estado dos IDs homônimos no desktop.

### Componentes de protótipo fora do desktop

Os arquivos abaixo ainda são protótipos ou dependem de configuração externa; não são fluxos integrados prontos para produção.

| Arquivo | Limite verificado |
|---|---|
| `eapp-ifood.ts` | Demonstração com pedidos estáticos e estado local; não possui API, webhook ou despacho conectado. |
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
| Financeiro | FinancialsService, financials.router.ts | eApp de consulta somente leitura integrado; não é DRE nem conciliação. Operações de caixa continuam iniciadas no PDV. |
| Relatórios e CRM | OrdersService, orders.router.ts, CrmService | eApps integrados em resumo de vendas/clientes dos 200 pedidos mais recentes; sem pontos, campanhas ou exportação. O backend de campanhas só salva rascunhos e não envia mensagens externas. |
| Mesas e reservas | TablesService, AppointmentsService, tables.router.ts, reservations.router.ts | eApps `tables` e `agenda` integrados; status e permissões são validados pelo servidor, com conflito de horário e capacidade de mesa verificados para reservas. O App Garçom continua em rota separada. No modo simulado, mesas, reservas e pedidos ficam em memória local. |
| Logística | LogisticsService, logistics.router.ts | eApp Hub Logística integrado para frota privada, criação de rota manual, atribuição e mapa com posições recentes compartilhadas pelo entregador autenticado durante rota em andamento. O App Entregador permanece em rota separada; não há geocodificação, cálculo de rota ou histórico GPS. O valor de rota não é pagamento. |
| Equipe, tarefas e ordens de serviço | HrService, TasksService, ServiceOrdersService e routers dedicados | Cadastro básico de equipe/ponto, tarefas simples e fluxo operacional de O.S.; sem folha, atribuição de responsáveis, cobrança ou pagamento. |
| Notas e calendário | NotesService, AppointmentsService e routers dedicados | Notas privadas de operador e calendário somente leitura de reservas; o eApp `agenda` mantém as operações de reserva. |

## Limite do modo simulado

O modo simulado mantém pedidos, lançamentos financeiros, reservas, mesas, motoristas, rotas e produtos no estado local da sessão; a conferência de estoque pode ser calculada localmente e não é persistida. Notas, RH, fornecedores, tarefas e O.S. não enviam chamadas de leitura ou escrita real durante a simulação. Mesas e rotas recebem fixtures de demonstração para os apps do Garçom e do Entregador; esses dados são marcados como simulados e descartados ao alternar o modo de execução ou o tenant ativo. A fila offline de pedidos não recebe operações simuladas. Isso não representa persistência, sincronização com o servidor ou homologação dos módulos.

## Critérios para atualizar este mapa

Marcar um módulo como eApp implementado somente após confirmar arquivo de componente existente, registro/import no client-os.ts e caso de renderização correspondente. Marcar como produção somente depois de confirmar integração, autorização e homologação; a documentação não deve declarar testes executados sem evidência da execução atual.
