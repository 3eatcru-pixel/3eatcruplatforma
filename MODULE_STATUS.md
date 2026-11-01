# 📊 Mapa Oficial de Maturidade dos Módulos — 3EATCRU Platform (`MODULE_STATUS.md`)

Este documento é o mapa de estado do código da plataforma **3EATCRU ERP & POS / Omnichannel**. Caminhos e capacidades descritos aqui devem existir no repositório; presença de serviço/API não significa que exista uma tela integrada ao Store OS.

**ESTADO DA AUDITORIA (2026-11-01)**: build de produção passou, lint passou e `npm run test:ci` passou com 90/90 testes. O bundle inicial mede 600,66 kB brutos (126,50 kB estimados em transferência), sem aviso de limite; avisos CommonJS de Leaflet e gRPC continuam. Não houve homologação com Firebase real nem validação de produção. O erro anterior de compilação por import de janela ausente não se reproduziu. O PDV segue como rota standalone `/pos`; KDS, Estoque e Financeiro agora abrem no desktop com escopos definidos abaixo. Consulte [testes e recuperação](./docs/INTEGRACAO/04_TESTES_E_RECUPERACAO.md) para os limites da validação.

## Legenda Oficial de Classificação

| Status | Significado | Critério Técnico |
|---|---|---|
| 🟢 **REAL** | Fluxo implementado com persistência | Código conectado ao Cloud Firestore via Admin SDK e verificações de papel/tenant conforme o domínio. Esta classificação não declara produção ou homologação; veja o registro datado de validação. |
| 🟡 **BETA** | Integrado, validação pendente | Conectado ao backend/Firestore, com homologação operacional ou integração externa pendente. |
| 🔵 **MOCK** | Demonstração | Opera com estado reativo local (Signals) ou dados simulados para demonstração comercial de UX sem persistência dedicada no backend. |
| ⚪ **PLACEHOLDER** | Interface ausente ou não integrada | A janela do Store OS não existe/está conectada. O domínio pode ter serviços e endpoints próprios; avaliar esses itens separadamente. |
| 🔴 **DISABLED** | Não usar em produção | Recursos legados desativados ou substituídos. |

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
| **Logistics Router** (`routes/logistics.router.ts`) | 🟢 **REAL** | Rotas e entregadores (`/routes*`, `/drivers*`) desacoplados do `/api/hq`, aceite transacional com validação estrita de empresa/frota (`403 TENANT_MISMATCH`), vínculo `driverId` propagado aos pedidos e listagem restrita a pedidos atribuídos (`driverId === uid`). |
| **CRM Router** (`routes/crm.router.ts`) | 🟡 **BETA** | Endpoint dedicado `/api/crm/consumers` desacoplado do namespace `/api/hq`, com escopo global para `hq_admin` e escopo por loja para `tenant_owner`/`operator`. |
| **HQ Governance Router** (`routes/hq.router.ts`) | 🟡 **BETA** | Exclusivo `hq_admin` (exceto `GET /regional` público): visão global SaaS, planos, comissão (`{ percent }`), MDM de terminais, auditoria estrutural e separação `hq_settings` (privado) vs `public_regional` (público). |
| **Camada Neutra Compartilhada** (`src/shared/`) | 🟢 **REAL** | Contratos tipados (`models/ecosystem.model.ts`) e motor puro de fila offline (`offline/offline-outbox.engine.ts`) compartilhados com **zero imports `src/app/` em `src/server/`**. |
| **Arquivos Locais `.data/*.json`** | 🔴 **DISABLED** | Removidos definitivamente para eliminar duplicidade de fonte da verdade. |

---

## 2. Camada de Serviços Frontend (`src/app/services/` & `src/app/core/`)

| Serviço | Status | Papel Arquitetural |
|---|---|---|
| `SecurityService` | 🟢 **REAL** | Sessão em memória via Firebase Auth + `/api/auth/me` com resiliência `waitForAuth()` em Guards (sem armazenamento de permissões/tokens em `localStorage`). |
| `OfflineSyncService` | 🟢 **REAL** | Fila offline do PDV com `X-Idempotency-Key`, detecção de conflito determinístico (`409 STOCK_CONFLICT`), cancelamento local auditável e alerta ao operador. |
| `FirebaseService` | 🟢 **REAL** | Autenticação Google e *listeners* `onSnapshot` somente-leitura escopados por papel/tenant. |
| `OrdersService` | 🟢 **REAL** | Consumo de `/api/orders` + projeção reativa em tempo real. |
| `InventoryService` | 🟡 **BETA** | CRUD de produtos via `/api/products`; fixtures são carregadas somente no modo simulado. Promoções e fornecedores ainda não têm persistência (`🔵 MOCK`). |
| `FinancialsService` | 🟢 **REAL** | Livro-razão hidratado exclusivamente por `/api/financials` (sem saldos fixos de `tenant-1`). |
| `TenantsService` | 🟢 **REAL** | Gestão de estabelecimentos e vitrines públicas (`/api/tenants`). |
| `TablesService` | 🟢 **REAL** | Mapa de mesas, setores e status `reserved`/`occupied` (`/api/tables`). |
| `AppointmentsService` | 🟢 **REAL** | Reservas de mesa e fila de espera conectadas a `/api/reservations` e `/api/reservations/public`. |
| `OsPreferencesService` | 🟢 **REAL** | Personalização persistente escopada por `(usuário, empresa)`, reordenação de atalhos, restauração de sessão de janelas e Perfis Operacionais por Segmento (`restaurant`, `retail_electro`, `pharmacy`, `automotive_services`). |
| `MarketplaceService` | 🟢 **REAL** | Configuração regional (`/api/hq/regional`) e navegação para vitrines. |
| `LogisticsService` / `HqService` / `CrmService` | 🟡 **BETA** | Conectados aos domínios segregados `/api/logistics/*`, `/api/hq/*` e `/api/crm/consumers`; submódulos de campanhas/crédito em homologação. |
| `UiNotificationService` | 🟢 **REAL** | Serviço enxuto de notificações toast desacoplando guards de rota e preferências do OS do `EcosystemService`. |
| `EcosystemService` | 🟡 **BETA** | Transformado em **Compatibility Facade** (`@deprecated` nos delegadores legados) sem `tenant-1` fixo, permitindo migração progressiva segura dos componentes. |
| `GoogleDriveService` | 🟡 **BETA** | Fluxo OAuth client-side com token estritamente em memória. |
| `CommunicationsService` / `NotesService` | 🔵 **MOCK** | Estado local em Signals para demonstração de chat social e notas rápidas. |
| `HrService` / `ServiceOrdersService` | ⚪ **PLACEHOLDER** | Serviços prontos no cliente apontando para `/api/hr` e `/api/service-orders` (rotas de backend ainda não provisionadas). |

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
| `tables`, `suppliers`, `reconciliation`, `stock-audit`, `whatsapp`, `ifood`, `instagram`, `tasks`, `calendar`, `agenda`, `services`, `rh`, `drivers`, `history`, `reports`, `crm`, `docs`, `google-drive`, `calculator`, `notes`, `admin-hub`, `appstore`, `browser`, `settings`, `system` | ⚪ **PLACEHOLDER no desktop** | Os IDs constam no registro, mas não têm janela standalone integrada. `client-os.ts` exibe estado explícito de interface ausente. Serviços, APIs e rotas móveis existentes continuam avaliados nas seções próprias; não são evidência de eApp. |
| `/waiter`, `/driver`, `/hq`, vitrine pública | Aplicações/rotas separadas | Componentes próprios em `src/app/components/`; não são janelas do Store OS. |

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
