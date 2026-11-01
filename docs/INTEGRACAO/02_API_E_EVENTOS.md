# 🤝 Integração — 02: Catálogo de Rotas de API, Eventos e Contratos

## 📌 1. Visão Geral dos 12 Roteadores Express

O backend do 3EATCRU é estruturado como uma API RESTful unificada em Express 5 (`src/server/api.ts`), servida na mesma porta da aplicação Angular SSR (porta 3000). A arquitetura é decomposta em **12 roteadores especializados**, cada um responsável por um domínio de negócio:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MAPA DE ROTEADORES (/api/*)                     │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. /api/auth       │ 2. /api/tenants    │ 3. /api/products             │
│    Sessão & RBAC   │    Lojas & Perfil  │    Catálogo ERP & Público    │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 4. /api/orders     │ 5. /api/payments   │ 6. /api/tables               │
│    Pedidos & KDS   │    Pix & Cartão    │    Salão & Comandas          │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 7. /api/financials │ 8. /api/logistics  │ 9. /api/reservations         │
│    DRE & Livro-Caixa│   Frotas & Rotas   │    Reservas de Mesas         │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 10./api/crm        │ 11./api/notes      │ 12./api/hq                   │
│    Clientes & Base │    Memos Internos  │    Governança & Split        │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Expor contratos claros com validação estrita de payload para todas as operações do ecossistema.
- Proteger endpoints contra requisições abusivas através de middleware de Rate Limiting.
- Retornar códigos de erro padronizados e semânticos para facilitar a depuração no cliente.
- Disparar eventos operacionais em cascata (ex: criação de pedido -> notificação na cozinha -> reserva de estoque).

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Centralização da API:** `src/server/api.ts` importa e monta os 12 roteadores.
- **Middleware de Rate Limiting (`src/server/middleware/rate-limiter.middleware.ts`):**
  - `authRegisterRateLimiter`: Limita tentativas repetidas de cadastro de estabelecimentos para mitigar ataques de força bruta ou criação em massa de lojas falsas.
- **Dicionário Canônico de Códigos de Erro da Plataforma:**
  - `400 INVALID_CNPJ`: CNPJ com menos de 14 dígitos ou dígito verificador inválido.
  - `400 EMPTY_CART`: Tentativa de enviar pedido sem itens.
  - `403 TENANT_MISMATCH`: Operador tentando acessar recurso de outro estabelecimento.
  - `403 TENANT_INACTIVE`: Estabelecimento bloqueado ou suspenso pelo HQ Central.
  - `403 HQ_ADMIN_REQUIRED`: Usuário comum tentando invocar comandos executivos.
  - `409 STOCK_CONFLICT`: Estoque insuficiente durante a execução transacional da venda.
  - `409 IDEMPOTENCY_TENANT_COLLISION`: Reutilização indevida de chave de idempotência.
  - `422 STORE_CLOSED`: Loja fechada para pedidos online.
  - `422 MODALITY_NOT_SUPPORTED`: Tentativa de pedir delivery em loja que não opera entrega.
  - `422 PRODUCT_UNAVAILABLE_ONLINE`: Tentativa de compra online de item de balcão exclusivo.
  - `422 RESERVATIONS_DISABLED`: Loja com agendamento de mesas desabilitado.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Cabeçalhos Exigidos:**
  - `Authorization: Bearer <FIREBASE_ID_TOKEN>` (em todas as rotas privadas).
  - `X-Idempotency-Key: <CHAVE_UNICA>` (recomendado em operações mutáveis, obrigatório em pagamentos e vendas).
- **Consumo no Frontend:**
  - Serviços Angular em `src/app/services/` usam `HttpClient` para disparar as requisições, interceptadas automaticamente por `auth.interceptor.ts`.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/api.spec.ts`: Teste de contrato de todas as rotas e healthcheck (`GET /api/health`).
  - `src/server/security_phase1.spec.ts`: Validação de 12 cenários de borda cobrindo os códigos 400, 403, 409 e 422.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade dos Roteadores

| Roteador | Rota Base | Classificação | Arquivo de Código |
|---|---|---|---|
| Autenticação & Onboarding | `/api/auth` | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts` |
| Estabelecimentos & Perfil | `/api/tenants` | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts` |
| Produtos & Cardápio | `/api/products` | 🟢 **Implementado e comprovado** | `src/server/routes/products.router.ts` |
| Pedidos & Fluxo Comercial | `/api/orders` | 🟢 **Implementado e comprovado** | `src/server/routes/orders.router.ts` |
| Pagamentos & Gateways | `/api/payments` | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts` |
| Mesas do Salão | `/api/tables` | 🟢 **Implementado e comprovado** | `src/server/routes/tables.router.ts` |
| Reservas & Fila de Espera | `/api/reservations` | 🟢 **Implementado e comprovado** | `src/server/routes/reservations.router.ts` |
| Finanças & DRE | `/api/financials` | 🟢 **Implementado e comprovado** | `src/server/routes/financials.router.ts` |
| Logística & Despacho | `/api/logistics` | 🟢 **Implementado e comprovado** | `src/server/routes/logistics.router.ts` |
| Clientes & CRM | `/api/crm` | 🟢 **Implementado e comprovado** | `src/server/routes/crm.router.ts` |
| Notas & Anotações | `/api/notes` | 🟢 **Implementado e comprovado** | `src/server/routes/notes.router.ts` |
| Gabinete Executivo HQ | `/api/hq` | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts` |
