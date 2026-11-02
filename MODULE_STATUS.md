# 📊 Mapa Oficial de Maturidade dos Módulos — 3EATCRU Platform (`MODULE_STATUS.md`)

Este documento é o mapa de estado do código da plataforma **3EATCRU ERP & POS / Omnichannel**. Caminhos e capacidades descritos aqui devem existir no repositório; presença de serviço/API não significa que exista uma tela integrada ao Store OS.

**VALIDAÇÃO LOCAL (2026-11-02)**: `npm run check` passou após as correções do HQ e a integração de mapas/GPS: lint, 100/100 testes (11 arquivos) e build de produção. O bundle inicial ficou em 696,33 kB brutos (140,50 kB estimados em transferência); os mapas carregam em chunks lazy de 1,11 MB brutos (245,62 kB estimados), e o HQ em um chunk lazy de 203,06 kB. Permanecem avisos CommonJS de Leaflet no adaptador e gRPC. `npm ci --dry-run` passou. Em cópia limpa sem `node_modules`, `npm ci --include=dev --no-audit --no-fund` instalou 933 pacotes e o build de produção passou. `node server/server.mjs` em `PORT=3102` respondeu HTTP 200 em `/api/health`, no ambiente `development`. Isso valida apenas este checkout; não comprova execução no Cloud Run, persistência do wrapper externo `/app/package.json`, conexão com Cloud SQL ou homologação externa.

**Validação desta continuação (2026-11-02)**: `npm run lint`, `npm run build` e `git diff --check` passaram após as correções em HQ, reservas/mesas, RH/tarefas/notas/O.S., recuperação de dead letter e GPS público. O bundle inicial do build atual ficou em 737,15 kB brutos (146,56 kB estimados); o HQ carrega em chunk lazy de 224,74 kB e os mapas em chunk lazy de 1,11 MB. Permanecem avisos CommonJS de Leaflet e dependências gRPC do Firebase. Os testes não foram executados nesta continuação.

**Validação da etapa pública (2026-11-02)**: `npm run lint`, `npm run build` e `git diff --check` passaram após as correções de vitrine, perfil e histórico do consumidor. O bundle inicial ficou em 739,77 kB brutos (146,81 kB estimados); o HQ carrega em chunk lazy de 224,74 kB e os mapas em chunk lazy de 1,11 MB. Permanecem avisos CommonJS de Leaflet e dependências gRPC do Firebase. Os testes não foram executados; login Google, Firestore, PIX live e dispositivos reais continuam sem homologação nesta etapa.

**Continuação da cobrança SaaS (2026-11-02)**: `npm run lint`, `npm run build` e `git diff --check` passaram após proteger o checkout do HQ contra chamadas simultâneas, respostas atrasadas, cancelamento durante criação e webhooks de tentativas antigas. O bundle inicial ficou em 739,77 kB brutos (146,81 kB estimados); HQ em chunk lazy de 224,74 kB. Os testes não foram executados; provedores live e webhooks continuam dependendo de credenciais e homologação externas.

**Continuação pagamentos/financeiro (2026-11-02)**: sandbox interno ficou restrito a operador autenticado e pedido `pos-counter`; checkout público e outros pedidos recebem erro de configuração em vez de autorização de teste. Lançamentos sandbox continuam marcados como simulação, aparecem com rótulo na tabela e deixam de compor o saldo real; modo simulado mantém totais demonstrativos. `npm run lint`, `npm run build` e `git diff --check` passaram; bundle inicial 739,77 kB brutos / 146,83 kB estimados. Testes não executados. A spec antiga em `security_phase1.spec.ts` ainda espera confirmação e liquidação financeira de PIX sandbox e precisa ser alinhada ao contrato vigente. Integração de adquirente e conciliação seguem pendentes.

**Continuação PDV — terminal externo (2026-11-02)**: incluído lançamento manual real de PIX, crédito e débito da maquininha da própria loja. Proprietário/operador confirma após conferir aprovação externa; Commerce Engine grava pedido, transação e financeiro atomicamente, com idempotência e validação de tenant, papel e método. O comprovante identifica o método e informa que a confirmação foi manual. O sistema não acessa hardware/PSP e não concilia taxas. `npm run lint`, `npm run build` e `git diff --check` passaram; bundle inicial 741,57 kB brutos / 146,97 kB estimados e chunk lazy do PDV 62,18 kB. Testes automatizados não foram executados; a confirmação declaratória e o terminal real não foram homologados.

**Continuação PDV — periféricos da loja (2026-11-02)**: o proprietário/operador cadastra perfis compartilhados de maquininhas e métodos aceitos; HQ não pode alterar essa configuração. O servidor valida terminal ativo/método na venda manual. Impressora usa página de teste e recibo em janela do navegador, com formato 58/80 mm e seleção de impressora já instalada no sistema; preferências são locais por usuário/unidade. Recibos preservam identificação de demonstração, pendência ou confirmação. `npm run lint`, `npm run build` e `git diff --check` passaram; bundle inicial 742,04 kB brutos / 146,73 kB estimados e chunk lazy do PDV 65,63 kB. Testes automatizados e equipamentos reais não foram verificados; sem SDK/TEF, discovery ou ESC/POS.

**Atualização da auditoria Real vs Simulação (2026-11-02)**: após isolar tenant demo, catálogo e fornecedores, pagamentos do PDV, GPS, cobrança/comissão do HQ, CRM, governança HQ, reservas/mesas/KDS e RH/tarefas/notas/O.S., os serviços locais revalidam o contexto e descartam respostas antigas. A dead letter tem reenvio manual escopado com a chave idempotente original. Confira evidências e pendências em [06 — Auditoria Real vs Simulação](./docs/INTEGRACAO/06_AUDITORIA_REAL_VS_SIMULACAO.md).

## Legenda Oficial de Classificação

| Status | Significado | Critério Técnico |
|---|---|---|
| 🟢 **REAL** | Fluxo implementado com persistência | Código conectado ao Cloud Firestore via Admin SDK e verificações de papel/tenant conforme o domínio. Esta classificação não declara produção ou homologação; veja o registro datado de validação. |
| 🟡 **BETA** | Integrado, validação pendente | Conectado ao backend/Firestore, com homologação operacional ou integração externa pendente. |
| 🔵 **MOCK** | Demonstração | Opera com estado reativo local (Signals) ou dados simulados para demonstração comercial de UX sem persistência dedicada no backend. |
| ⚪ **PLACEHOLDER** | Interface ausente ou não integrada | A janela do Store OS não existe/está conectada. O domínio pode ter serviços e endpoints próprios; avaliar esses itens separadamente. |
| 🔴 **DISABLED** | Não usar em produção | Recursos legados desativados ou substituídos. |
| 🧪 **EXPERIMENTAL / ISOLADO** | Código presente sem integração ao fluxo ativo | Não considerar persistência de produção enquanto rotas/serviços e validação operacional não o consumirem. |

---

## 1. Núcleo Backend & Motores Transacionais (`src/server/`)

| Módulo / Arquivo | Status | Detalhamento |
|---|---|---|
| **Commerce Engine** (`core/commerce.engine.ts`) | 🟢 **REAL** | Motor comercial transacional único (`adminDb.runTransaction`), preço autoritativo, baixa/estorno atômico de estoque, sincronização com `public_catalog`, idempotência (`X-Idempotency-Key`), liquidação financeira (`fin-sale-*`) e proteção contra cancelamento/pagamento duplicado. |
| **Auth & RBAC Middleware** (`middleware/auth.middleware.ts`) | 🟢 **REAL** | Validação real via `adminAuth.verifyIdToken()`, prioridade para Firebase Custom Claims, matriz explícita de 6 papéis (`hq_admin`, `tenant_owner`, `operator`, `waiter`, `driver`, `consumer`) + `guest` e bloqueio de escalonamento em `/users/{uid}`. |
| **Auth Router** (`routes/auth.router.ts`) | 🟢 **REAL** | Provisionamento de lojista (`/register-merchant`), resolução de perfil (`/me`) e atribuição segura de papéis (`/assign-role`). |
| **Orders Router & Omnichannel Gateway** (`routes/orders.router.ts`) | 🟢 **REAL** | `GET/POST /api/orders`, `POST /api/orders/channels/:channel` (`pos`, `storefront`, `marketplace`, `whatsapp`, `ifood`, `qr_table`) e `PATCH /api/orders/:id/status`. O POS aceita confirmação manual de PIX/crédito/débito em terminal externo com validação no Commerce Engine e chave idempotente. |
| **Products & Public Catalog Router** (`routes/products.router.ts`) | 🟢 **REAL** | Separação física entre catálogo interno do ERP (`products` com custo/fornecedor) e projeção pública sanitizada (`public_catalog`). |
| **Tenants Router** (`routes/tenants.router.ts`) | 🟢 **REAL** | Isolamento multi-tenant, listagem pública sanitizada (`/api/tenants/public`) e governança sem fallback fixo `tenant-1`. Proprietário/operador administra até 8 perfis privados de maquininhas por loja; HQ não pode alterá-los e a API valida métodos, sem credenciais de adquirente. |
| **Tables Router** (`routes/tables.router.ts`) | 🟢 **REAL** | Gestão de mesas e comandas por empresa com bloqueio cruzado entre tenants e estado `reserved` sincronizado. |
| **Reservations Router** (`routes/reservations.router.ts`) | 🟢 **REAL** | Reservas de mesa e fila de espera (`/api/reservations` + `/api/reservations/public`) com isolamento multi-tenant, RBAC por papel e transação ACID sincronizando ocupação/liberação de mesas (`/tables/{tableId}`). No cliente, fixtures e alterações em simulação ficam em memória e revalidam o contexto após mudanças assíncronas de mesa. |
| **Consumer Profile API** (`routes/crm.router.ts`) | 🟡 **BETA** | Perfil próprio via `/api/crm/consumers/me`, cadastro/edição autenticados e limitados ao UID do consumidor; persiste nome, telefone, endereço, bairro e cidade. CPF, pontos e saldo real não são armazenados. Histórico público é filtrado pelo `customerId` retornado pelo servidor. |
| **Financials Router** (`routes/financials.router.ts`) | 🟢 **REAL** | Livro-razão por empresa (`income` / suprimento, `expense` / sangria, bloqueio de `sale` manual e estornos automáticos pelo `CommerceEngine`). |
| **Universal Payment Proxy** (`routes/payments.router.ts`) | 🟡 **BETA** | Registra pagamentos da loja em `/payment_transactions`: PIX do checkout exige chave própria e confirmação manual; dinheiro/voucher ficam sob cobrança da loja; cartão público retorna configuração pendente até existir adquirente conectada ao tenant. No POS, Commerce Engine valida o perfil externo e método configurados pela loja, mas a confirmação é declaratória e não consulta o equipamento. Sandbox interno só atende operador e pedido `pos-counter`, marcando pedido/transação como simulação para exclusão dos valores reais; checkout público não recebe QR/cartão sandbox. Credenciais globais do HQ não processam pedido de loja. Repetir tentativa PIX pendente reutiliza a transação; trocar o meio fica bloqueado. Integração de adquirente, expiração e conciliação continuam pendentes. |
| **Logistics Router** (`routes/logistics.router.ts`) | 🟢 **REAL** | Rotas e motoristas privados da loja (`/routes*`, `/drivers*`) com aceite transacional e isolamento por tenant. Gestor vincula conta autenticada e verificada ao cadastro. GPS é opcional, explícito e restrito ao motorista privado vinculado em rota atribuída `in_progress`; parar/concluir apaga a posição. O HQ não consulta nem opera a frota privada; a rede da plataforma segue `coming_soon`. Distância/tempo não são inventados e remuneração dos motoristas próprios não é processada. |
| **HQ Central** (`components/hq-central.ts`) | 🟡 **BETA** | Console para desktop/tablet com 11 áreas agrupadas, busca filtrável `Ctrl+K`, governança de lojas, catálogo de planos, cobrança SaaS, diretório CRM paginado, portal regional, auditoria e inventário. Dados, formulários e respostas em voo são limpos/validados ao trocar contexto; registros locais de dispositivos e logs de demonstração são marcados como simulados. Status de loja não muda localmente após falha de persistência. Ações de assinatura ficam bloqueadas na simulação; frota privada e dados de rota ficam fora do HQ. Overview e métricas ainda leem o histórico completo de pedidos. |
| **CRM Router** (`routes/crm.router.ts`) | 🟡 **BETA** | Diretório de contatos paginado, restrito ao HQ e com projeção mínima de dados pessoais; campanhas são escopadas por loja e só permitem rascunhos. Pontos e envio externo retornam configuração pendente, sem alterar saldos ou alegar envio. O cliente mantém cadastros de demonstração/rascunhos somente em memória e invalida o diretório ao trocar de contexto. |
| **HR Router** (`routes/hr.router.ts`) | 🟡 **BETA** | Cadastro básico e ponto manual restritos a proprietário/operador da unidade; CPF, salário e folha não são coletados. No cliente, dados de simulação ficam em memória e não chamam a API. |
| **Service Orders Router** (`routes/service-orders.router.ts`) | 🟡 **BETA** | Criação/listagem e transições operacionais de O.S. por unidade; não registra valores recebidos nem liquidação. O.S. simuladas são locais e não geram cobrança. |
| **Suppliers Router** (`routes/suppliers.router.ts`) | 🟡 **BETA** | Diretório persistente de fornecedores por unidade; produtos só podem referenciar fornecedor da mesma unidade. Compras/recebimento não fazem parte do fluxo. |
| **Stock Audits Router** (`routes/stock-audits.router.ts`) | 🟡 **BETA** | Registro transacional de contagens e divergências, validando que todos os produtos pertencem ao tenant; não altera saldo de estoque. |
| **Tasks Router** (`routes/tasks.router.ts`) | 🟡 **BETA** | Checklist persistido por unidade, com transição de conclusão protegida; atribuições individuais ainda não existem. Em simulação, as tarefas ficam em memória e são marcadas como demonstração. |
| **HQ Governance Router** (`routes/hq.router.ts`) | 🟡 **BETA** | Exclusivo `hq_admin` (exceto `GET /regional` público): visão global SaaS, catálogo de planos com acesso completo ao OS em todas as faixas e cota por dispositivos, MDM de terminais e auditoria estrutural. A comissão de 8% permanece travada em `coming_soon`, inclusive se houver valor legado `active` em `hq_settings`. |
| **SaaS Billing Engine** (`routes/billing.router.ts`, `services/billing/`) | 🟡 **BETA** | Checkout recorrente do plano SaaS em Mercado Pago/Stripe, idempotência de tentativa, lease transacional contra chamadas concorrentes, gravação de resultados somente para a tentativa atual, rejeição de webhook atrasado de tentativa anterior, webhooks assinados, conciliação de faturas e cancelamento protegido contra alterações concorrentes. O HQ recebe a assinatura; credenciais e homologação live ainda precisam ser configuradas. Inadimplência não suspende tenant automaticamente. |
| **Camada Neutra Compartilhada** (`src/shared/`) | 🟢 **REAL** | Contratos tipados (`models/ecosystem.model.ts`) e motor puro de fila offline (`offline/offline-outbox.engine.ts`) compartilhados com **zero imports `src/app/` em `src/server/`**. |
| **PostgreSQL / Drizzle scaffold** (`src/db/`) | 🧪 **EXPERIMENTAL / ISOLADO** | Código define `pg.Pool`, esquema e helpers de usuário, mas nenhuma rota ou serviço do app importa `src/db/`; os fluxos de negócio ativos continuam usando Firestore. Este checkout não comprova conexão, migração, schema físico ou instância Cloud SQL disponível. |
| **Arquivos Locais `.data/*.json`** | 🔴 **DISABLED** | Removidos definitivamente para eliminar duplicidade de fonte da verdade. |

---

## 2. Camada de Serviços Frontend (`src/app/services/` & `src/app/core/`)

| Serviço | Status | Papel Arquitetural |
|---|---|---|
| `SecurityService` | 🟢 **REAL** | Sessão em memória via Firebase Auth + `/api/auth/me` com resiliência `waitForAuth()` em Guards (sem armazenamento de permissões/tokens em `localStorage`). A troca para simulação usa contexto demo (`tenant-1`, `hq` para administrador) e não reaproveita a identidade do tenant real. |
| `OfflineSyncService` | 🟢 **REAL** | Fila offline do PDV com `X-Idempotency-Key`, replay somente após Auth real com escopo por tenant/UID, bloqueio em simulação, detecção de conflito determinístico (`409 STOCK_CONFLICT`), cancelamento local auditável e alerta ao operador. Falhas transitórias em dead letter podem ser reenfileiradas pelo mesmo usuário/unidade com a chave idempotente original. A recuperação física e concorrência entre abas ainda não foram homologadas. |
| `FirebaseService` | 🟢 **REAL** | Autenticação Google e *listeners* `onSnapshot` somente-leitura escopados por papel/tenant. |
| `OrdersService` | 🟢 **REAL** | Consumo de `/api/orders` + projeção reativa em tempo real. Troca de modo, tenant ou revisão de sessão limpa pedidos e listeners do UID anterior. |
| `InventoryService` | 🟡 **BETA** | CRUD de produtos via `/api/products`; fixtures e catálogo da vitrine são carregados somente no modo simulado. Catálogo público confere requisição mais recente e tenant; falhas limpam o catálogo sem fallback. Promoções ainda são `🔵 MOCK`; fornecedores usam serviço/rota dedicada com guarda de modo e tenant. |
| `FinancialsService` | 🟢 **REAL** | Livro-razão hidratado exclusivamente por `/api/financials` (sem saldos fixos de `tenant-1`). |
| `TenantsService` | 🟢 **REAL** | Gestão de estabelecimentos e vitrines públicas (`/api/tenants`); respostas públicas validam requisição mais recente, revisão do contexto e geração da sessão. |
| `TablesService` | 🟢 **REAL** | Mapa de mesas, setores e status `reserved`/`occupied` (`/api/tables`). |
| `AppointmentsService` | 🟢 **REAL** | Reservas de mesa e fila de espera conectadas a `/api/reservations` e `/api/reservations/public`. |
| `OsPreferencesService` | 🟢 **REAL** | Personalização persistente escopada por `(usuário, empresa)`, reordenação de atalhos, restauração de sessão de janelas e Perfis Operacionais por Segmento (`restaurant`, `retail_electro`, `pharmacy`, `automotive_services`). |
| `MarketplaceService` | 🟢 **REAL** | Configuração regional (`/api/hq/regional`) e navegação para vitrines. |
| `CrmService` / `ConsumerProfileComponent` | 🟡 **BETA** | Perfil real autentica com Google, lê/escreve o documento do próprio UID e reidrata nome/endereço; histórico consulta `/api/orders` e filtra pelo `customerId` da sessão. Falha de histórico tem estado de erro e reintento. Simulação usa estado local. CPF, fidelidade real e campanhas externas permanecem desabilitados. |
| `LogisticsService` / `HqService` | 🟡 **BETA** | Conectados aos domínios segregados `/api/logistics/*` e `/api/hq/*`; o serviço de logística invalida caches e listeners em mudanças de modo, tenant ou revisão da sessão. |
| `NotesService` | 🟡 **BETA** | Notas privadas persistidas por operador em `/api/notes`, filtradas pela unidade ativa quando informada. |
| `HrService` / `ServiceOrdersService` | 🟡 **BETA** | Conectados aos novos routers `/api/hr/*` e `/api/service-orders/*`, com controle por unidade e papéis de gestão. |
| `SuppliersService` / `StockAuditsService` / `TasksService` | 🟡 **BETA** | Diretório de fornecedores, registros de contagem e checklist operacional persistidos em coleções segregadas por tenant. |
| `UiNotificationService` | 🟢 **REAL** | Serviço enxuto de notificações toast desacoplando guards de rota e preferências do OS do `EcosystemService`. |
| `EcosystemService` | 🟡 **BETA** | Transformado em **Compatibility Facade** (`@deprecated` nos delegadores legados) sem `tenant-1` fixo, permitindo migração progressiva segura dos componentes. |
| `GoogleDriveService` | 🟡 **BETA** | Fluxo OAuth client-side com token estritamente em memória. |
| `CommunicationsService` | 🔵 **MOCK** | Estado local para demonstração de chat social; mensagens externas continuam sem provedor. |

---

## 3. Interfaces e Janelas do Store OS

O registro em `src/app/components/os/os-apps-registry.ts` contém atalhos, mas o registro sozinho não comprova que uma tela existe. A renderização ocorre em `src/app/components/client-os.ts`.

| ID / grupo | Estado da interface | Evidência no repositório |
|---|---|---|
| `pos` | 🟡 **BETA — rota standalone** | `/pos` carrega `src/app/components/pos-terminal.ts`; a janela do OS oferece navegação para essa rota. Os subcomponentes estão em `src/app/components/eapps/pos/`. Suporta caixa em dinheiro, fluxo PIX/cartão processado pelo sistema, perfis externos de PIX/crédito/débito configurados pelo proprietário/operador e impressão de recibo/teste em janela do navegador com papel 58/80 mm. Pagamento continua manual, sem SDK/TEF; impressão depende de driver/destino instalado no sistema. Não há homologação física. |
| `kds` | 🟡 **BETA — escopo operacional** | Janela integrada ao desktop; carrega pedidos da unidade e permite a proprietário/operador avançar de `pending` para `preparing` e `ready`. Garçom consulta sem alterar status. O servidor valida tenant, papel e transições; na simulação as alterações são locais e marcadas como demonstração. |
| `waiter-sim`, `driver-sim`, `consumer-sim` | 🔵 **MOCK — simuladores integrados** | `src/app/components/eapps/eapp-waiter-sim.ts`, `eapp-driver-sim.ts` e `eapp-consumer-sim.ts`; são molduras de demonstração para telas móveis/web. |
| `store-manager` | 🟡 **BETA** | eApp Minha Loja integrado ao desktop. Edita perfil da vitrine, taxa de entrega, pedido mínimo e chave PIX do tenant; o cadastro de chave não valida titularidade. |
| `inventory` | 🟡 **BETA — escopo parcial** | Janela integrada ao desktop; lista e cadastra produtos da unidade por `InventoryService` e `/api/products`. Ajuste de saldo, histórico de movimentos e fornecedores não estão disponíveis. |
| `finance` | 🟡 **BETA — consulta somente leitura** | Janela integrada ao desktop; consulta lançamentos da unidade, exclui simulações do saldo real e identifica essas linhas; no modo de plataforma simulado, usa totais demonstrativos. Não cria lançamentos, não produz DRE e não concilia adquirentes. |
| `tables` | 🟡 **BETA — salão** | Janela integrada; consulta, abre e libera mesas, e permite cadastro para proprietário/operador. API limita campos, tenant e transições; não libera mesa com saldo positivo. Fixtures e mudanças simuladas são locais, marcadas e limpas na troca de contexto. |
| `agenda` | 🟡 **BETA — reservas** | Janela integrada; lista por data e cria/atualiza reservas. API sincroniza a mesa em transação, valida capacidade, conflito de horário, papel e tenant. Simulação usa registros locais e revalida a sessão após atualizar a mesa. |
| `history` | 🟡 **BETA — até 200 pedidos** | Histórico integrado, consulta os pedidos recentes da unidade com situação e pagamento; sem paginação/exportação. |
| `reports` | 🟡 **BETA — resumo comercial** | Métricas de pagamentos aprovados, ticket médio e canais nos 200 pedidos recentes; sem DRE, margem ou conciliação. |
| `crm` | 🟡 **BETA — consulta de clientes** | Agrupa clientes identificados em pedidos pagos recentes da unidade; não altera pontos nem envia campanhas. |
| `drivers` | 🟡 **BETA — logística da loja** | Cadastra motoristas privados, cria rota manual para pedidos prontos e atribui rota a motorista da unidade. O valor registrado é referência combinada, sem pagamento pelo sistema. |
| `suppliers` | 🟡 **BETA — diretório** | Cadastro e desativação de fornecedores da unidade; sem pedidos de compra ou recebimento. |
| `stock-audit` | 🟡 **BETA — contagem** | Registra contagem e divergências; não ajusta automaticamente o saldo do produto. Em simulação, os dados ficam na sessão. |
| `tasks` | 🟡 **BETA — checklist** | Tarefas e conclusão persistidas por unidade; em simulação, ações são locais e marcadas como demonstração. Sem atribuição individual ou recorrência. |
| `calendar` | 🟡 **BETA — consulta de reservas** | Mostra reservas por data; `agenda` continua responsável por criar e alterar reservas. |
| `services` | 🟡 **BETA — ordens de serviço** | Abre e avança O.S. da unidade; em simulação atua só na memória. Não registra cobrança ou pagamento. |
| `rh` | 🟡 **BETA — equipe e ponto** | Cadastro operacional e batidas manuais; em simulação atua só na memória. Não coleta CPF/salário nem executa folha. |
| `notes` | 🟡 **BETA — notas privadas** | Notas persistidas por usuário, com filtro de unidade; em simulação ficam na memória e vinculadas à sessão. |
| `settings` | 🟡 **BETA — loja e periféricos** | Tema, perfil, atalhos, workspaces e preferências locais da impressora (rótulo e bobina) são persistidos por usuário/unidade. Proprietário/operador administra perfis de maquininhas compartilhados no tenant; HQ não os altera. Impressora usa o diálogo do navegador, sem discovery/ESC/POS, e terminal externo não integra com adquirente. |
| `calculator`, `docs`, `system` | 🟡 **Utilitários locais** | Calculadora sem persistência, manual estático e resumo de sessão/unidade sem diagnóstico de hardware ou backend. |
| `reconciliation`, `whatsapp`, `ifood`, `instagram`, `google-drive`, `admin-hub`, `appstore`, `browser` | ⚪ **PRÓXIMA ETAPA / dependência externa** | Provedores de pagamento/comunicação, OAuth, MDM, catálogo de apps ou superfície segura de navegação ainda não homologados; o desktop informa integração pendente. |
| `/waiter`, `/driver`, `/hq`, vitrine pública | Aplicações/rotas separadas | Componentes próprios em `src/app/components/`; não são janelas do Store OS. GPS de descoberta do Marketplace é pedido somente em modo real, usado para distância no navegador e limpo ao trocar sessão; app do motorista permite compartilhar posição atual durante entrega; eApp de logística mostra pings recentes da frota da própria loja. Mapas não geocodificam endereços nem calculam trajeto/ETA. |

### Correção do modo de estoque

`InventoryService` inicia sem produtos no modo real. `MOCK_PRODUCTS` só é aplicado no modo de simulação; uma falha em `/api/products` deixa a lista vazia em vez de exibir estoque de demonstração como estoque da loja.

---

## 4. Auditoria de Uso de `localStorage` / `sessionStorage`

| Chave | Serviço | Finalidade | Conformidade |
|---|---|---|---|
| `3eatcru_cart` | `EcosystemService` | Carrinho efêmero de compras do consumidor na vitrine. | ✅ Permitido (UX temporária) |
| `3eatcru_offline_queue` | `OfflineSyncService` | Fila de contingência offline do PDV com chaves idempotentes. | ✅ Permitido (Outbox offline) |
| `3eatcru_offline_conflicts` | `OfflineSyncService` | Registro local de conflitos `409 STOCK_CONFLICT` para ciência e estorno pelo operador de caixa. | ✅ Permitido (Auditoria operacional local) |
| `3eatcru_os_prefs[:user:tenant]` | `OsPreferencesService` | Preferências persistentes por operador e unidade (perfil operacional do segmento, wallpaper, ordem de atalhos, favoritos, sessão de janelas e workspaces). | ✅ Permitido (Preferências de UI escopadas) |
| `3eatcru_session` | *(Removido)* | Antes armazenava papel/tenant/token no navegador; **eliminado** em prol de sessão em memória validada pelo Firebase Auth + `/api/auth/me`. | ✅ Removido por segurança |
