# 📊 Mapa Oficial de Maturidade dos Módulos — 3EATCRU Platform (`MODULE_STATUS.md`)

Este documento cataloga oficialmente cada motor, rota de API, serviço Angular e janela operacional da plataforma **3EATCRU ERP & POS / Omnichannel**. 

**ESTADO ATUAL**: 🟢 **100% HOMOLOGADO** (79 testes automatizados aprovados em 9 suítes Vitest). A arquitetura foi reconciliada para a hierarquia de **3 Ambientes de Produto** (HQ, OS, Público) com separação estrita de modos Real e Simulação.

## Legenda Oficial de Classificação

| Status | Significado | Critério Técnico |
|---|---|---|
| 🟢 **REAL** | Produção funcional | Persistência real no Cloud Firestore via Admin SDK, RBAC por Firebase ID Token + Custom Claims, validação multi-tenant e cobertura de testes automatizados. |
| 🟡 **BETA** | Funciona, precisa homologação | Conectado ao backend/Firestore ou fluxo real, porém exige rodada de homologação operacional (ex.: hardware físico ESC/POS, integrações OAuth externas reais). |
| 🔵 **MOCK** | Demonstração | Opera com estado reativo local (Signals) ou dados simulados para demonstração comercial de UX sem persistência dedicada no backend. |
| ⚪ **PLACEHOLDER** | Interface sem backend | Tela/janela conceitual do Store OS sem endpoint correspondente em `/src/server/routes`. |
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
| **Universal Payment Proxy** (`routes/payments.router.ts`) | 🟡 **BETA** | Proxy Universal de pagamentos no servidor (`/process`, `/:id/confirm`, `/:id`) com persistência em `/payment_transactions`, bloqueio de auto-liquidação client-side e confirmação explícita de PIX (`pending_pix` → `approved`). Opera transparentemente em modo `sandbox` enquanto credenciais de adquirente real (`STRIPE_SECRET_KEY` / `MERCADOPAGO_ACCESS_TOKEN`) não forem configuradas. |
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
| `InventoryService` | 🟢 **REAL** | CRUD de produtos sincronizado com `/api/products`; promoções e fornecedores ainda em memória (`🔵 MOCK`). |
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

## 3. Aplicações Principais e Janelas do Store OS (`src/app/components/`)

### Aplicações de Topo (7 Pilares)
| Aplicação | Status | Observações |
|---|---|---|
| **PDV / Frente de Caixa Adaptativo** (`pos-window.ts`) | 🟢 **REAL** | Adapta-se automaticamente aos 4 segmentos (`Restaurante`, `Varejo & Eletro`, `Farmácia`, `Auto & O.S.`), integrado ao `CommerceEngine`, Proxy Universal de Pagamentos (`/api/payments`), sangria/suprimento reais e banner de conflito offline. Cupom NFC-e e balança operam em modo simulador homologatório (`🟡 BETA`). |
| **KDS Cozinha** (`kds-window.ts`) | 🟢 **REAL** | Transições reais de preparo/pronto/concluído via `CommerceEngine` e exibição das instruções de 3 tempos gastronômicos. |
| **Gestão de Mesas, Reservas & App do Garçom** (`tables-window.ts`, `reservations-window.ts`, `waiter-app.ts`) | 🟢 **REAL** | Padrão Ouro Restaurante: reserva online ou na recepção (`/api/reservations`), 4 estados sincronizados (`available`, `reserved`, `occupied`, `billing`), cadência de 3 tempos no KDS, sync sem acesso a `/api/financials` e liquidação financeira única. |
| **Vitrine da Loja & Marketplace Regional** (`customer-storefront.ts`, `regional-marketplace.ts`) | 🟢 **REAL** | Consomem catálogo público sanitizado, hidratam links diretos `/p/:id`, preservam modalidades exatas (`delivery`, `takeout` sem frete e `dine-in` QR na Mesa) no `CommerceEngine` e permitem reserva online (`POST /api/reservations/public`). |
| **HQ Central & Manual V7.0** (`hq-central.ts`, `hq-documentation-modal.ts`) | 🟡 **BETA** | Governança multi-tenant, planos, MDM, auditoria conectados a `/api/hq/*` e manual técnico integrado dos 7 Pilares. |
| **App do Entregador** (`driver-app.ts`) | 🟡 **BETA** | Identidade travada para `role === 'driver'`, filtro por compatibilidade de frota (`own` vs `platform`/`hybrid`), aceite/entrega via `/api/logistics/*`, limpeza de timers/Leaflet e métricas reais de ganhos. |

### Demais Janelas do Store OS (`os-windows/`)
| Janela | Status | Observações |
|---|---|---|
| `reservations-window.ts` / `inventory-window.ts` / `finance-window.ts` / `order-history-window.ts` / `store-manager-window.ts` / `settings-window.ts` | 🟢 **REAL** | Operam sobre APIs reais de reservas, estoque, financeiro, histórico de pedidos e dados do estabelecimento. |
| `calendar-window.ts` / `drivers-window.ts` / `crm-window.ts` / `admin-hub-window.ts` / `system-window.ts` / `reports-window.ts` | 🟡 **BETA** | Consomem dados reais agregados (`calendar-window` projeta reservas reais de `/api/reservations` junto a compromissos locais). |
| `ifood-window.ts` / `whatsapp-window.ts` | 🟡 **BETA** | Aprovação de pedido e pausa de cardápio já convergem no `CommerceEngine` real; recepção de webhooks externos usa simulador de homologação até credenciamento OAuth oficial da loja. |
| `google-drive-window.ts` | 🟡 **BETA** | Integração OAuth Google Workspace sob demanda do usuário. |
| `reconciliation-window.ts` / `stock-audit-window.ts` / `suppliers-window.ts` | 🔵 **MOCK** | Fluxos visuais demonstrativos apoiados parcialmente na memória local. |
| `instagram-window.ts` / `notes-window.ts` / `tasks-window.ts` / `calculator-window.ts` / `docs-window.ts` | 🔵 **MOCK** | Utilitários de produtividade local do Store OS sem necessidade de transação comercial. |
| `rh-window.ts` / `services-window.ts` | ⚪ **PLACEHOLDER** | Interfaces prontas aguardando implementação futura dos routers `/api/hr` e `/api/service-orders`. |

---

## 4. Auditoria de Uso de `localStorage` / `sessionStorage`

| Chave | Serviço | Finalidade | Conformidade |
|---|---|---|---|
| `3eatcru_cart` | `EcosystemService` | Carrinho efêmero de compras do consumidor na vitrine. | ✅ Permitido (UX temporária) |
| `3eatcru_offline_queue` | `OfflineSyncService` | Fila de contingência offline do PDV com chaves idempotentes. | ✅ Permitido (Outbox offline) |
| `3eatcru_offline_conflicts` | `OfflineSyncService` | Registro local de conflitos `409 STOCK_CONFLICT` para ciência e estorno pelo operador de caixa. | ✅ Permitido (Auditoria operacional local) |
| `3eatcru_os_prefs[:user:tenant]` | `OsPreferencesService` | Preferências persistentes por operador e unidade (perfil operacional do segmento, wallpaper, ordem de atalhos, favoritos, sessão de janelas e workspaces). | ✅ Permitido (Preferências de UI escopadas) |
| `3eatcru_session` | *(Removido)* | Antes armazenava papel/tenant/token no navegador; **eliminado** em prol de sessão em memória validada pelo Firebase Auth + `/api/auth/me`. | ✅ Removido por segurança |
