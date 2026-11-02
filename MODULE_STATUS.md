# 📊 Mapa Oficial de Maturidade dos Módulos — 3EATCRU Platform (`MODULE_STATUS.md`)

Este documento é o mapa de estado do código da plataforma **3EATCRU ERP & POS / Omnichannel**. Caminhos e capacidades descritos aqui devem existir no repositório; presença de serviço/API não significa que exista uma tela integrada ao Store OS.

**VALIDAÇÃO LOCAL (2026-11-02)**: `npm run check` passou, executando lint, 100/100 testes (11 arquivos) e build de produção em sequência; o bundle inicial ficou em 611,35 kB brutos (130,49 kB estimados em transferência), com avisos CommonJS de Leaflet e gRPC. `npm ci --dry-run` passou. Em cópia limpa sem `node_modules`, `npm ci --include=dev --no-audit --no-fund` instalou 933 pacotes e o build de produção passou. `node server/server.mjs` em `PORT=3102` respondeu HTTP 200 em `/api/health`, no ambiente `development`. Isso valida apenas este checkout; não comprova execução no Cloud Run, persistência do wrapper externo `/app/package.json`, conexão com Cloud SQL ou homologação externa.

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
| **Orders Router & Omnichannel Gateway** (`routes/orders.router.ts`) | 🟢 **REAL** | `GET/POST /api/orders`, `POST /api/orders/channels/:channel` (`pos`, `storefront`, `marketplace`, `whatsapp`, `ifood`, `qr_table`) e `PATCH /api/orders/:id/status`. |
| **Products & Public Catalog Router** (`routes/products.router.ts`) | 🟢 **REAL** | Separação física entre catálogo interno do ERP (`products` com custo/fornecedor) e projeção pública sanitizada (`public_catalog`). |
| **Tenants Router** (`routes/tenants.router.ts`) | 🟢 **REAL** | Isolamento multi-tenant, listagem pública sanitizada (`/api/tenants/public`) e governança sem fallback fixo `tenant-1`. |
| **Tables Router** (`routes/tables.router.ts`) | 🟢 **REAL** | Gestão de mesas e comandas por empresa com bloqueio cruzado entre tenants e estado `reserved` sincronizado. |
| **Reservations Router** (`routes/reservations.router.ts`) | 🟢 **REAL** | Reservas de mesa e fila de espera (`/api/reservations` + `/api/reservations/public`) com isolamento multi-tenant, RBAC por papel e transação ACID sincronizando ocupação/liberação de mesas (`/tables/{tableId}`). |
| **Financials Router** (`routes/financials.router.ts`) | 🟢 **REAL** | Livro-razão por empresa (`income` / suprimento, `expense` / sangria, bloqueio de `sale` manual e estornos automáticos pelo `CommerceEngine`). |
| **Universal Payment Proxy** (`routes/payments.router.ts`) | 🟡 **BETA** | Registra transações em `/payment_transactions`. PIX live pode ir direto à chave da loja, cadastrada em Minha Loja, mas a confirmação é manual. Dinheiro/voucher ficam sob gestão da loja. Cartão real é bloqueado enquanto não houver adquirente conectada ao tenant; a chave Stripe global não é usada para cobrar pedidos das lojas. Repetir a mesma tentativa pendente reutiliza a transação; trocar o meio fica bloqueado. Não há expiração/cancelamento automático, idempotência no PSP ou conciliação. |
| **Logistics Router** (`routes/logistics.router.ts`) | 🟢 **REAL** | Rotas e motoristas privados da loja (`/routes*`, `/drivers*`) com aceite transacional e isolamento por tenant. GPS é opcional, explícito e restrito a motorista privado em rota atribuída `in_progress`; parar/concluir apaga a posição. Cadastro/conversão e operações de motoristas da plataforma seguem `coming_soon`; distância/tempo não são inventados e remuneração dos motoristas próprios não é processada. |
| **CRM Router** (`routes/crm.router.ts`) | 🟡 **BETA** | Diretório consumidor restrito ao HQ; campanhas são escopadas por loja e só permitem rascunhos. Pontos e envio externo retornam configuração pendente, sem alterar saldos ou alegar envio. |
| **HR Router** (`routes/hr.router.ts`) | 🟡 **BETA** | Cadastro básico e ponto manual restritos a proprietário/operador da unidade; CPF, salário e folha não são coletados. |
| **Service Orders Router** (`routes/service-orders.router.ts`) | 🟡 **BETA** | Criação/listagem e transições operacionais de O.S. por unidade; não registra valores recebidos nem liquidação. |
| **Suppliers Router** (`routes/suppliers.router.ts`) | 🟡 **BETA** | Diretório persistente de fornecedores por unidade; produtos só podem referenciar fornecedor da mesma unidade. Compras/recebimento não fazem parte do fluxo. |
| **Stock Audits Router** (`routes/stock-audits.router.ts`) | 🟡 **BETA** | Registro transacional de contagens e divergências, validando que todos os produtos pertencem ao tenant; não altera saldo de estoque. |
| **Tasks Router** (`routes/tasks.router.ts`) | 🟡 **BETA** | Checklist persistido por unidade, com transição de conclusão protegida; atribuições individuais ainda não existem. |
| **HQ Governance Router** (`routes/hq.router.ts`) | 🟡 **BETA** | Exclusivo `hq_admin` (exceto `GET /regional` público): visão global SaaS, catálogo de planos com acesso completo ao OS em todas as faixas e cota por dispositivos, MDM de terminais e auditoria estrutural. A comissão de 8% permanece travada em `coming_soon`, inclusive se houver valor legado `active` em `hq_settings`. |
| **SaaS Billing Engine** (`routes/billing.router.ts`, `services/billing/`) | 🟡 **BETA** | Checkout recorrente do plano SaaS em Mercado Pago/Stripe, idempotência de tentativa, confirmação via webhooks assinados, conciliação das faturas recorrentes, cancelamento no provedor e registro de assinaturas/faturas. O HQ recebe a assinatura; credenciais e homologação live ainda precisam ser configuradas. Inadimplência não suspende tenant automaticamente. |
| **Camada Neutra Compartilhada** (`src/shared/`) | 🟢 **REAL** | Contratos tipados (`models/ecosystem.model.ts`) e motor puro de fila offline (`offline/offline-outbox.engine.ts`) compartilhados com **zero imports `src/app/` em `src/server/`**. |
| **PostgreSQL / Drizzle scaffold** (`src/db/`) | 🧪 **EXPERIMENTAL / ISOLADO** | Código define `pg.Pool`, esquema e helpers de usuário, mas nenhuma rota ou serviço do app importa `src/db/`; os fluxos de negócio ativos continuam usando Firestore. Este checkout não comprova conexão, migração, schema físico ou instância Cloud SQL disponível. |
| **Arquivos Locais `.data/*.json`** | 🔴 **DISABLED** | Removidos definitivamente para eliminar duplicidade de fonte da verdade. |

---

## 2. Camada de Serviços Frontend (`src/app/services/` & `src/app/core/`)

| Serviço | Status | Papel Arquitetural |
|---|---|---|
| `SecurityService` | 🟢 **REAL** | Sessão em memória via Firebase Auth + `/api/auth/me` com resiliência `waitForAuth()` em Guards (sem armazenamento de permissões/tokens em `localStorage`). |
| `OfflineSyncService` | 🟢 **REAL** | Fila offline do PDV com `X-Idempotency-Key`, detecção de conflito determinístico (`409 STOCK_CONFLICT`), cancelamento local auditável e alerta ao operador. |
| `FirebaseService` | 🟢 **REAL** | Autenticação Google e *listeners* `onSnapshot` somente-leitura escopados por papel/tenant. |
| `OrdersService` | 🟢 **REAL** | Consumo de `/api/orders` + projeção reativa em tempo real. |
| `InventoryService` | 🟡 **BETA** | CRUD de produtos via `/api/products`; fixtures são carregadas somente no modo simulado. Promoções ainda são `🔵 MOCK`; fornecedores usam serviço/rota dedicada. |
| `FinancialsService` | 🟢 **REAL** | Livro-razão hidratado exclusivamente por `/api/financials` (sem saldos fixos de `tenant-1`). |
| `TenantsService` | 🟢 **REAL** | Gestão de estabelecimentos e vitrines públicas (`/api/tenants`). |
| `TablesService` | 🟢 **REAL** | Mapa de mesas, setores e status `reserved`/`occupied` (`/api/tables`). |
| `AppointmentsService` | 🟢 **REAL** | Reservas de mesa e fila de espera conectadas a `/api/reservations` e `/api/reservations/public`. |
| `OsPreferencesService` | 🟢 **REAL** | Personalização persistente escopada por `(usuário, empresa)`, reordenação de atalhos, restauração de sessão de janelas e Perfis Operacionais por Segmento (`restaurant`, `retail_electro`, `pharmacy`, `automotive_services`). |
| `MarketplaceService` | 🟢 **REAL** | Configuração regional (`/api/hq/regional`) e navegação para vitrines. |
| `LogisticsService` / `HqService` / `CrmService` | 🟡 **BETA** | Conectados aos domínios segregados `/api/logistics/*`, `/api/hq/*` e `/api/crm/*`; pontos e despacho de campanhas permanecem desabilitados até configuração. |
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
| `pos` | 🟡 **BETA — rota standalone** | `/pos` carrega `src/app/components/pos-terminal.ts`; a janela do OS oferece navegação para essa rota. Os subcomponentes estão em `src/app/components/eapps/pos/`. O build de produção passou; homologação operacional continua pendente. |
| `kds` | 🟡 **BETA — escopo operacional** | Janela integrada ao desktop; carrega pedidos da unidade e permite a proprietário/operador avançar de `pending` para `preparing` e `ready`. Garçom consulta sem alterar status. O servidor valida tenant, papel e transições. |
| `waiter-sim`, `driver-sim`, `consumer-sim` | 🔵 **MOCK — simuladores integrados** | `src/app/components/eapps/eapp-waiter-sim.ts`, `eapp-driver-sim.ts` e `eapp-consumer-sim.ts`; são molduras de demonstração para telas móveis/web. |
| `store-manager` | 🟡 **BETA** | eApp Minha Loja integrado ao desktop. Edita perfil da vitrine, taxa de entrega, pedido mínimo e chave PIX do tenant; o cadastro de chave não valida titularidade. |
| `inventory` | 🟡 **BETA — escopo parcial** | Janela integrada ao desktop; lista e cadastra produtos da unidade por `InventoryService` e `/api/products`. Ajuste de saldo, histórico de movimentos e fornecedores não estão disponíveis. |
| `finance` | 🟡 **BETA — consulta somente leitura** | Janela integrada ao desktop; consulta lançamentos da unidade e soma vendas/entradas e saídas liquidadas. Não cria lançamentos, não produz DRE e não concilia adquirentes. |
| `tables` | 🟡 **BETA — salão** | Janela integrada; consulta, abre e libera mesas, e permite cadastro para proprietário/operador. API limita campos, tenant e transições; não libera mesa com saldo positivo. |
| `agenda` | 🟡 **BETA — reservas** | Janela integrada; lista por data e cria/atualiza reservas. API sincroniza a mesa em transação, valida capacidade, conflito de horário, papel e tenant. |
| `history` | 🟡 **BETA — até 200 pedidos** | Histórico integrado, consulta os pedidos recentes da unidade com situação e pagamento; sem paginação/exportação. |
| `reports` | 🟡 **BETA — resumo comercial** | Métricas de pagamentos aprovados, ticket médio e canais nos 200 pedidos recentes; sem DRE, margem ou conciliação. |
| `crm` | 🟡 **BETA — consulta de clientes** | Agrupa clientes identificados em pedidos pagos recentes da unidade; não altera pontos nem envia campanhas. |
| `drivers` | 🟡 **BETA — logística da loja** | Cadastra motoristas privados, cria rota manual para pedidos prontos e atribui rota a motorista da unidade. O valor registrado é referência combinada, sem pagamento pelo sistema. |
| `suppliers` | 🟡 **BETA — diretório** | Cadastro e desativação de fornecedores da unidade; sem pedidos de compra ou recebimento. |
| `stock-audit` | 🟡 **BETA — contagem** | Registra contagem e divergências; não ajusta automaticamente o saldo do produto. Em simulação, os dados ficam na sessão. |
| `tasks` | 🟡 **BETA — checklist** | Tarefas e conclusão persistidas por unidade; sem atribuição individual ou recorrência. |
| `calendar` | 🟡 **BETA — consulta de reservas** | Mostra reservas por data; `agenda` continua responsável por criar e alterar reservas. |
| `services` | 🟡 **BETA — ordens de serviço** | Abre e avança O.S. da unidade; não registra cobrança ou pagamento. |
| `rh` | 🟡 **BETA — equipe e ponto** | Cadastro operacional e batidas manuais; não coleta CPF/salário nem executa folha. |
| `notes` | 🟡 **BETA — notas privadas** | Notas persistidas por usuário, com filtro de unidade. |
| `settings` | 🟡 **BETA — preferências locais** | Tema, perfil operacional, atalhos e workspaces são persistidos por usuário/unidade; hardware continua sem configuração. |
| `calculator`, `docs`, `system` | 🟡 **Utilitários locais** | Calculadora sem persistência, manual estático e resumo de sessão/unidade sem diagnóstico de hardware ou backend. |
| `reconciliation`, `whatsapp`, `ifood`, `instagram`, `google-drive`, `admin-hub`, `appstore`, `browser` | ⚪ **PRÓXIMA ETAPA / dependência externa** | Provedores de pagamento/comunicação, OAuth, MDM, catálogo de apps ou superfície segura de navegação ainda não homologados; o desktop informa integração pendente. |
| `/waiter`, `/driver`, `/hq`, vitrine pública | Aplicações/rotas separadas | Componentes próprios em `src/app/components/`; não são janelas do Store OS. Marketplace usa GPS do consumidor somente no navegador; app do motorista permite compartilhar posição atual durante entrega; eApp de logística mostra pings recentes da frota da própria loja. Mapas não geocodificam endereços nem calculam trajeto/ETA. |

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
