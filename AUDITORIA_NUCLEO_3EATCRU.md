# AUDITORIA NÚCLEO 3EATCRU ERP, POS & COMMERCE PLATFORM (V7.0 — 7 PILARES CONSOLIDADOS)

## 1. Arquitetura Oficial de Persistência e Camada Neutra (`src/shared/`)

O diretório legado `/.data/*.json` permanece **permanentemente extinto (`🔴 DISABLED`)**, e o servidor (`src/server/`) possui **zero dependências de `src/app/`**:

```text
[1] Cloud Firestore Enterprise (Admin SDK + firestore.rules Zero-Trust em 18 coleções)
    └── FONTE OFICIAL E ÚNICA DA VERDADE (Tenants, Produtos, Catálogo Público, Pedidos, Pagamentos, Mesas, Reservas, Financeiro, Rotas, Governança HQ)

[2] Camada Neutra & Outbox Offline (/src/shared/models/ecosystem.model.ts + /src/shared/offline/offline-outbox.engine.ts)
    └── CONTINGÊNCIA DO PDV OFFLINE (`X-Idempotency-Key` escopada ao ator autenticado e captura determinística de `409 STOCK_CONFLICT`)

[3] Angular 21 Zoneless Signals (`OrdersService`, `InventoryService`, `FinancialsService`, `TablesService`, `AppointmentsService`, `OsPreferencesService`, `SecurityService`)
    └── PROJEÇÃO REATIVA EM MEMÓRIA (Alimentada por `/api/*` nos 12 routers + listeners `onSnapshot` somente-leitura; zero sessão em `localStorage`)
```

---

## 2. Rastreamento Ponta a Ponta por Papel (`ROLE_PERMISSION_MATRIX`)

Fluxo canônico:
`Firebase Auth -> Bearer ID Token -> authContext(verifyIdToken + Custom Claims) -> Router / CommerceEngine -> Transação Firestore -> Resposta`

| Papel | Resolução de Autoridade | Escopo de Tenant | Rotas Permitidas | Escritas Diretas via Client SDK |
|---|---|---|---|---|
| **1. Super Admin (`hq_admin`)** | Custom Claim `role == 'hq_admin'` ou e-mail verificado (`email_verified == true`) em `/admins/{uid}` (sem curinga `@3eatcru.com`) | Global (`*`) | `/api/hq/*`, `/api/tenants`, `/api/logistics/drivers*`, `/api/crm/consumers`, `/api/reservations`, `/api/auth/assign-role` | Apenas `/admins/*` e `/hq_settings/*` validados por `isAdmin()` |
| **2. Dono da Loja (`tenant_owner`)** | Custom Claim `role == 'tenant_owner'` + `tenantId` via `/api/auth/register-merchant` (CNPJ 14 dígitos + endereço -> `trial`) | Estrito ao próprio `tenantId` | `/api/products`, `/api/orders`, `/api/payments`, `/api/tables`, `/api/reservations`, `/api/financials`, `/api/logistics`, `/api/crm/consumers`, `/api/auth/assign-role` (equipe interna) | Bloqueadas; leitura realtime via `uid in staffUids` |
| **3. Operador (`operator`)** | Custom Claim `role == 'operator'` + `tenantId` | Estrito ao próprio `tenantId` | PDV Multissegmento, KDS, Pagamentos, Estoque, Mesas, Reservas, Financeiro (`income`/`expense`) e Logística da loja | Bloqueadas; leitura realtime via `uid in staffUids` |
| **4. Garçom (`waiter`)** | Custom Claim `role == 'waiter'` + `tenantId` | Estrito ao próprio `tenantId` | `/api/tables`, `/api/reservations` (leitura/check-in), `/api/orders` e leitura de cardápio; **bloqueado em `/api/financials` (403)** | Bloqueadas; leitura realtime de `tables`, `reservations` e `orders` via `staffUids` |
| **5. Motorista (`driver`)** | Custom Claim `role == 'driver'` (+ `tenantId` opcional se frota própria) | Estrito a `driverId == uid` (pedidos) e rotas compatíveis com sua frota | `/api/logistics/routes/*`, `/api/logistics/drivers/:id/ping`, leitura/transição **apenas** de pedidos já atribuídos (`order.driverId === uid`) | Apenas telemetria GPS própria em `/drivers/{uid}` |
| **6. Cliente (`consumer`)** | Autenticação Firebase padrão (`role = 'consumer'`) | Próprio `customerId == uid` | `/api/tenants/public`, `/api/products/public`, `POST /api/orders`, `POST /api/reservations/public`, `/api/payments`, leitura dos próprios pedidos (`customerId == uid`) | Apenas perfil próprio `/consumers/{uid}` |

---

## 3. Remediações Críticas P0–P2 & Consolidação V7.0 Confirmadas em Testes

1. **P0 — Liquidação Autoritativa de Pagamentos (`payments.router.ts` + `commerce.engine.ts`):**
   - Enviar `status: 'completed'` no payload do cliente **não** marca pedido como pago nem grava `fin-sale-*`.
   - Exige `cashConfirmedByOperator: true` por operador autenticado no PDV (dinheiro físico) **ou** transação aprovada em `/payment_transactions/{txId}`.
   - PIX retorna `status: 'pending_pix'` e só liquida o pedido + livro-razão após confirmação explícita em `POST /api/payments/:id/confirm`.
2. **P1 — Isolamento Estrito de Entregadores e Rotas (`orders.router.ts` + `logistics.router.ts` + `driver-app.ts`):**
   - Entregadores não listam nem consultam pedidos sem `driverId` (`order.driverId === req.user.id` obrigatório) e têm identidade travada na interface `/driver`.
   - `POST /api/logistics/routes/:id/accept` valida `tenantId` do motorista contra a rota e `deliveryFleetType` da loja (`own` vs `platform`/`hybrid`), bloqueando cruzamento entre empresas com `403 TENANT_MISMATCH`.
3. **P1 — Vitrine Pública, Modalidades Exatas & Reservas ACID (`customer-storefront.ts` + `reservations.router.ts`):**
   - Pedidos de retirada no balcão (`takeout`) preservam `type: 'takeout'` com `tax === 0` (`total === subtotal - discount`), cobrando `deliveryFee` exclusivamente quando `type === 'delivery'`.
   - `executeCommercialOrder` bloqueia lojas inativas (`403 TENANT_INACTIVE`), lojas fechadas (`422 STORE_CLOSED`), modalidades desativadas (`422 MODALITY_NOT_SUPPORTED`) e produtos indisponíveis online (`422 PRODUCT_UNAVAILABLE_ONLINE`).
   - `POST /api/reservations` e `POST /api/reservations/public` sincronizam atomicamente o status `reserved`/`occupied`/`available` em `/tables/{tableId}` e respeitam `acceptsReservations === false` (`422 RESERVATIONS_DISABLED`).
4. **P2 — Salão / App do Garçom, Onboarding CNPJ 14 Dígitos e Fronteira de Camadas:**
   - `WaiterAppComponent` (`/waiter`) exibe os 4 estados de mesa (incluindo `Reservada`), propaga os 3 tempos gastronômicos nas `notes` do KDS e sincroniza produtos/pedidos/mesas sem chamar `/api/financials`.
   - `POST /api/auth/register-merchant` exige CNPJ de 14 dígitos e endereço completo, criando a loja em `status: 'trial'` e `isOpen: false`.
   - Zero importações `src/app/` em `src/server/` (`! grep -rn "app/" src/server/`).
5. **P0 — Resiliência Auth e Performance do Store OS:**
   - Implementação de `waitForAuth()` em todos os Guards, garantindo que a sessão do Firebase seja totalmente hidratada antes de qualquer redirecionamento, eliminando "false positives" de login pendente.
   - **Store OS Bootstrap Sequence**: Inicialização visual curta (Boot -> Core -> Auth -> Device -> Workspace -> Apps) que prioriza LCP e interatividade.
   - **Carga Diferida (@defer)**: Uso estrito de blocos `@defer` em todas as janelas operacionais (PDV, KDS, Estoque, Financeiro), garantindo que o bundle inicial do Store OS seja enxuto e escalável.

---

## 4. Suíte Automatizada Completa (`npm run test:ci` — 9 Suítes / 80 Testes Aprovados)

| Suíte | Escopo Validado | Status |
|---|---|:---:|
| `src/server/commerce_war_tests.spec.ts` | **Guerras 1 a 8:** disputa simultânea do último estoque, replay offline `409 STOCK_CONFLICT`, liquidação financeira única, idempotência tripla, duplo cancelamento, 5 canais simultâneos, cross-tenant `403` e proteção `driverId` por rota | 🟢 **PASS** |
| `src/server/security_phase1.spec.ts` | **RBAC + Seções 7 & 8:** bloqueio de auto-liquidação sem pagamento, fluxo PIX `pending_pix` -> `confirm`, bloqueio de motorista não atribuído, bloqueio de rota cross-tenant, idempotência por ator, bloqueio de `sale` manual, `STORE_CLOSED` / `PRODUCT_UNAVAILABLE_ONLINE` / `TENANT_INACTIVE`, `takeout` sem frete, onboarding CNPJ 14 dígitos em `trial` e ciclo ACID completo de Reservas (`/api/reservations` + `/public` + `422 RESERVATIONS_DISABLED`) | 🟢 **PASS** |
| `src/server/api.spec.ts` | Contratos Express SSR e healthcheck | 🟢 **PASS** |
| `src/app/core/offline/offline-resilience.spec.ts` | Fila offline determinística e captura de conflito no cliente | 🟢 **PASS** |
| `src/app/services/ecosystem.service.spec.ts` | Fluxos integrados multi-papel (Consumidor, Garçom, Operador, Motorista e HQ) + Perfis Operacionais por Segmento | 🟢 **PASS** |
| `src/app/services/hq-api.service.spec.ts` | Desacoplamento `/api/hq/*`, `/api/logistics/drivers*` e `/api/crm/consumers` | 🟢 **PASS** |
| `src/app/services/store-os-api.service.spec.ts` | Contratos do Store OS, reservas e frota em `/api/logistics/drivers*` | 🟢 **PASS** |
| `src/app/core/google-drive/google-drive.service.spec.ts` | Token OAuth Google Workspace estritamente em memória | 🟢 **PASS** |
| `src/app/app.spec.ts` | Inicialização Zoneless Angular 21 | 🟢 **PASS** |
