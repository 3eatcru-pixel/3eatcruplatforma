# Store OS — 03: Aplicativos e módulos

## Escopo e nomenclatura

**Módulo** é a capacidade de negócio (ex.: estoque, pedidos, financeiro). **eApp** é uma interface integrada como janela ao desktop /os. Uma rota ou API disponível não comprova que o módulo tenha eApp.

Fontes de referência no código:

- Registro de atalhos: src/app/components/os/os-apps-registry.ts.
- Renderização das janelas: src/app/components/client-os.ts.
- Rotas: src/app/app.routes.ts.
- Serviços e APIs: src/app/services/ e src/server/routes/.

## Estado verificado em 2026-11-01

O registro contém 33 IDs. No desktop, apenas o PDV possui uma rota operacional e três simuladores possuem janela embutida. Os demais IDs mostram um estado explícito de interface ainda não integrada; eles não devem ser descritos como telas implementadas.

| IDs | Estado no Store OS | Implementação encontrada |
|---|---|---|
| pos | 🟡 Rota standalone | /pos carrega src/app/components/pos-terminal.ts; a janela do desktop encaminha para essa rota. Subcomponentes em src/app/components/eapps/pos/. |
| waiter-sim, driver-sim, consumer-sim | 🔵 Simuladores | Molduras de demonstração em src/app/components/eapps/eapp-*-sim.ts, reutilizando as telas de garçom, entregador e marketplace. |
| tables, kds, inventory, finance, suppliers, reconciliation, stock-audit, store-manager, whatsapp, ifood, instagram, tasks, calendar, agenda, services, rh, drivers, history, reports, crm, docs, google-drive, calculator, notes, admin-hub, appstore, browser, settings, system | ⚪ Janela placeholder | IDs estão no registro, mas não têm eApp conectado. client-os.ts mostra o estado de interface ausente. A disponibilidade de API/serviço é avaliada separadamente. |

As telas /waiter, /driver, /hq e as vitrines públicas são rotas próprias, não janelas do Store OS. A existência dessas rotas não altera o estado dos IDs homônimos no desktop.

### Componentes de protótipo fora do desktop

Estes arquivos existem no repositório, mas não estão importados nem renderizados por `client-os.ts`; os IDs continuam abrindo placeholder no Store OS.

| Arquivo | Limite verificado |
|---|---|
| `eapp-kds.ts` | Protótipo de fila que altera pedidos apenas até `ready`; não finaliza pedidos nem liquida pagamentos. No modo simulado, a notificação identifica a alteração como local. |
| `eapp-tables.ts` | Protótipo de mesas; recusa liberar reserva, conta solicitada ou mesa com valor em aberto. |
| `eapp-store-manager.ts` | Formulário protótipo; o desktop não abre a janela. O componente chama a API de tenant no modo real e altera apenas estado local no modo simulado. |
| `eapp-ifood.ts` | Demonstração com pedidos estáticos e estado local; não possui API, webhook ou despacho conectado. |
| `eapp-services.ts` | Demonstração de O.S. em signal local; não envia ordens de exemplo à API. |
| `eapp-crm.ts` | Altera apenas o signal local `customers`; não carrega nem grava clientes e pontos na API de CRM. |
| `eapp-inventory.ts` | Componente fora do desktop; o cadastro chama o serviço de produtos, mas não há ajuste de saldo sem movimento auditável. |
| `eapp-stock-audit.ts` | Contagem demonstrativa em memória; concluir não grava contagem nem aplica ajuste. |
| `eapp-google-drive.ts` | Lista arquivos de exemplo; o botão de backup fica desabilitado e não chama o serviço de Drive. |
| `GoogleDriveService` e seletor compartilhado | OAuth só marca conexão ativa após obter token e carregar arquivos. Sem token, a lista e uploads são locais/demonstrativos; não estão conectados ao desktop do lojista. |
| `eapp-whatsapp.ts` | Contatos e mensagens locais de demonstração; não envia mensagens externas. |
| `eapp-instagram.ts` | Publicações e métricas estáticas; não consulta nem publica na rede social. |
| `eapp-reports.ts` | Resume pedidos pagos carregados do tenant ativo; distribuição de canais não é calculada nem conciliada. |
| `eapp-reconciliation.ts` | Sem importação de extratos; não calcula taxas, liquidação ou divergências. |
| `eapp-docs.ts` | Manual embutido com limites operacionais alinhados ao fluxo offline documentado; não é uma janela de suporte integrada. |
| `eapp-reservations.ts` | Reservas de exemplo e transição local para acomodado; não chama o serviço de reservas. |
| `eapp-suppliers.ts` | Lista de fornecedores demonstrativa em memória; não mantém cadastro nem gera compras. |
| `eapp-drivers.ts` | Entregadores demonstrativos; não chama logística, despacha rotas ou consulta GPS. |
| `eapp-rh.ts` | Colaboradores de exemplo; não chama a API nem persiste dados pessoais. |
| `eapp-notes.ts` | Notas locais de demonstração; não envia dados ao serviço de notas. |
| `eapp-admin-hub.ts` | Mostra dados da sessão/unidade; não monitora terminais nem executa MDM. |
| `eapp-settings.ts` | Perfil e papel de parede são preferências locais; a seção de hardware informa dispositivos não configurados. |
| `eapp-tasks.ts` | Checklist demonstrativo; marcações não persistem nem são atribuídas a operadores. |
| `eapp-calendar.ts` | Eventos estáticos de exemplo; não consulta agenda nem reservas. |
| `eapp-system.ts` | Resumo estático da aplicação, sem diagnóstico do dispositivo ou verificação de conexão. |
| `eapp-finance.ts` | Resumo visual dos lançamentos carregados do tenant ativo; não é janela integrada de DRE nem de conciliação. |
| `eapp-order-history.ts` | Lista apenas pedidos carregados do tenant ativo; não consulta histórico completo nem está integrada ao desktop. |
| `eapp-calculator.ts` | Calculadora local sem APIs ou persistência; erros aritméticos são exibidos como `Erro`. O ID `calculator` ainda abre placeholder no desktop. |

## Módulos de negócio existentes fora das janelas

| Domínio | Serviços/rotas encontrados | Situação da interface desktop |
|---|---|---|
| Pedidos | OrdersService, orders.router.ts | Sem janela de histórico/KDS integrada. |
| Produtos e estoque | InventoryService, products.router.ts | Sem janela de estoque. CRUD real; promoções e fornecedores ainda sem persistência. |
| Catálogo público | InventoryService.publicCatalog e /api/products/public | Signal separado do catálogo interno e filtrado pelo tenant da vitrine. |
| Financeiro | FinancialsService, financials.router.ts | Sem janela financeira. Operações de caixa iniciadas no PDV usam o serviço financeiro. |
| Mesas e reservas | TablesService, AppointmentsService, tables.router.ts, reservations.router.ts | Sem janela de mesas/reservas; o App Garçom é uma rota separada. Ele registra pedidos e consulta seus status, sem confirmação integrada de uma estação KDS. No modo simulado, mesas, reservas e pedidos ficam em memória local. |
| Logística e CRM | LogisticsService, CrmService e routers correspondentes | Sem eApp desktop conectado. O App Entregador carrega fixtures locais quando está no modo simulado. |

## Limite do modo simulado

O modo simulado mantém pedidos, lançamentos financeiros, reservas, mesas, motoristas, rotas e produtos no estado local da sessão. Mesas e rotas recebem fixtures de demonstração para os apps do Garçom e do Entregador; esses dados são marcados como simulados e descartados ao alternar o modo de execução ou o tenant ativo. A fila offline de pedidos não recebe operações simuladas. Isso não representa persistência, sincronização com o servidor ou homologação dos módulos.

## Critérios para atualizar este mapa

Marcar um módulo como eApp implementado somente após confirmar arquivo de componente existente, registro/import no client-os.ts e caso de renderização correspondente. Marcar como produção somente depois de confirmar integração, autorização e homologação; a documentação não deve declarar testes executados sem evidência da execução atual.
