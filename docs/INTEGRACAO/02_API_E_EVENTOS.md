# 🤝 Integração — 02: Catálogo de Rotas de API, Eventos e Contratos

## 📌 1. Visão Geral dos Roteadores Express

O backend do 3EATCRU é estruturado como uma API RESTful unificada em Express 5 (`src/server/api.ts`), servida na mesma porta da aplicação Angular SSR (porta 3000). A API monta roteadores especializados para os domínios de negócio. A lista de prefixos e aliases deve ser conferida em src/server/api.ts.

Prefixos montados em src/server/api.ts:

- /api/health, /api/auth, /api/hq, /api/tenants, /api/products, /api/orders.
- /api/tables, /api/financials, /api/logistics, /api/payments, /api/crm, /api/notes.
- /api/reservations; /api/appointments é um alias para o mesmo roteador.

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Expor contratos claros com validação estrita de payload para todas as operações do ecossistema.
- Proteger endpoints contra requisições abusivas através de middleware de Rate Limiting.
- Retornar códigos de erro padronizados e semânticos para facilitar a depuração no cliente.
- Disparar eventos operacionais em cascata (ex: criação de pedido -> notificação na cozinha -> reserva de estoque).

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Centralização da API:** `src/server/api.ts` importa e monta os prefixos listados acima; o alias appointments reutiliza o roteador de reservations.
- **Logística da loja:** `POST /api/logistics/routes` aceita `storeDriverCompensation` como valor definido pelo lojista; se omitido, grava `0` e a interface mostra “A combinar com a loja”. O valor da rota não é pagamento processado nem comprovante de recebimento. O app do entregador atende motoristas vinculados à loja.
- **Checkout de delivery:** O preço do pedido soma os itens e o valor fixo `deliveryFee` da loja. O campo legado `serviceFeePercent` é ignorado; os 8% de comissão da plataforma não entram no checkout.
- **Destino dos pagamentos:** O checkout público chama o proxy de pagamentos para PIX/dinheiro. O PIX usa `tenants/{tenantId}.pixKey`, editável pelo lojista em Minha Loja, e destina o valor à chave da loja. A confirmação ainda é manual. Cartão live retorna `TENANT_CARD_ACCOUNT_NOT_CONFIGURED` se só houver credencial global; não cobra pedidos na conta do HQ.
- **Repetição de pagamento:** a tentativa pendente do pedido é reutilizada quando o mesmo meio e valor são reenviados. Outra forma de pagamento retorna `409 PAYMENT_ATTEMPT_PENDING`; ainda não há expiração nem cancelamento de tentativas pendentes.
- **Comissão da plataforma:** o status padrão de `platformDeliveryCommissionStatus` é `coming_soon`. Os 8% ficam fora das vendas e dos motoristas da loja; sua ativação depende da futura rede própria e da inteligência operacional.
- **Configuração segura da comissão:** `POST /api/hq/system/platform-delivery-commission` permite ao `hq_admin` salvar `coming_soon`; a ativação antecipada é rejeitada pelo servidor.
- **Vínculo de responsável do tenant:** `GET /api/tenants/:id/owner` retorna ao `hq_admin` o UID e e-mail atuais, sem claims. `POST /api/tenants/:id/owner` exige `{ "email": "..." }` de uma conta existente e verificada. Atualiza `ownerUid`, `staffUids`, `/users/{uid}` e claims; rejeita outra titularidade ativa e preserva claims adicionais. Se Firebase Auth falhar depois da reserva Firestore, tenta restaurar as claims anteriores e reverter a reserva; informa erro explícito caso alguma reversão também falhe. O ID Token do responsável precisa ser renovado.
- **Proteção de vínculos:** `POST /api/tenants` ignora `ownerUid`/`staffUids` enviados pelo cliente. `PATCH /api/tenants/:id` remove esses campos para todos os papéis. `POST /api/auth/assign-role` retorna `409 OWNER_LINK_REQUIRED` quando solicitado `tenant_owner`.
- **Cota de dispositivos:** `POST /api/hq/devices` valida tenant, serial duplicado e `devicesLimit` na transação que cria o registro. Registros internos de `tenantId: hq` ficam fora da cota de loja.
- **Resumo de tenant:** `GET /api/hq/tenants/:id/metrics` exige `hq_admin`, busca o histórico pelo `tenantId` exato e retorna contagem/volume dos pedidos elegíveis (`isSimulated === false`, fora de cancelados, pagamento aprovado ou status concluído, total finito não negativo). Não pagina nem concilia com adquirentes.
- **Cota inicial de planos:** o provisionamento HQ usa `maxDevices` salvo no plano selecionado; o cadastro público inicia em Starter e usa sua cota. Sem valor salvo, aplica os padrões do servidor. Se Firestore não carregar a configuração, o cadastro retorna `503 PLAN_CONFIGURATION_UNAVAILABLE` e não grava tenant.
- **Middleware de Rate Limiting (`src/server/middleware/rate-limiter.middleware.ts`):**
  - `authRegisterRateLimiter`: Limita tentativas repetidas de cadastro de estabelecimentos para mitigar ataques de força bruta ou criação em massa de lojas falsas.
- **Dicionário Canônico de Códigos de Erro da Plataforma:**
  - `400 INVALID_CNPJ`: CNPJ com menos de 14 dígitos ou dígito verificador inválido.
  - `400 EMPTY_CART`: Tentativa de enviar pedido sem itens.
  - `403 TENANT_MISMATCH`: Operador tentando acessar recurso de outro estabelecimento.
  - `403 TENANT_INACTIVE`: Estabelecimento bloqueado ou suspenso pelo HQ Central.
  - `403 HQ_ADMIN_REQUIRED`: Usuário comum tentando invocar comandos executivos.
  - `409 OWNER_LINK_REQUIRED`: atribuição direta de `tenant_owner` recusada; usar o fluxo de vínculo do responsável.
  - `409 TENANT_OWNER_ALREADY_LINKED`: loja já possui outro responsável.
  - `409 OWNER_LINKED_TO_ANOTHER_TENANT`: conta já vinculada a outra loja.
  - `409 OWNER_EMAIL_NOT_VERIFIED`: conta precisa confirmar o e-mail antes do vínculo.
  - `409 DEVICE_QUOTA_REACHED`: cota de registros do tenant alcançada; a mensagem inclui total atual e limite.
  - `409 PAYMENT_ATTEMPT_PENDING`: existe uma tentativa de pagamento pendente para o pedido; não gere outra cobrança/QR por meio diferente.
  - `503 PLAN_CONFIGURATION_UNAVAILABLE`: o servidor não conseguiu carregar a configuração de cota antes de criar o tenant.
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
- Existem suítes em `src/server/api.spec.ts` e `src/server/security_phase1.spec.ts`. Elas não foram executadas nesta revisão; o build também não foi executado. Portanto, esta revisão não registra resultado de aprovação automatizada.

---

## 📊 3. Matriz de Classificação de Maturidade dos Roteadores

| Roteador | Rota Base | Classificação | Arquivo de Código |
|---|---|---|---|
| Autenticação & Onboarding | `/api/auth` | Implementado (não retestado nesta revisão) | `src/server/routes/auth.router.ts` |
| Estabelecimentos & Perfil | `/api/tenants` | Implementado (não retestado nesta revisão) | `src/server/routes/tenants.router.ts` |
| Produtos & Cardápio | `/api/products` | Implementado (não retestado nesta revisão) | `src/server/routes/products.router.ts` |
| Pedidos & Fluxo Comercial | `/api/orders` | Implementado (não retestado nesta revisão) | `src/server/routes/orders.router.ts` |
| Pagamentos & Gateways | `/api/payments` | Implementado (não retestado nesta revisão) | `src/server/routes/payments.router.ts` |
| Mesas do Salão | `/api/tables` | Implementado (não retestado nesta revisão) | `src/server/routes/tables.router.ts` |
| Reservas & Fila de Espera | `/api/reservations` | Implementado (não retestado nesta revisão) | `src/server/routes/reservations.router.ts` |
| Finanças & DRE | `/api/financials` | Implementado (não retestado nesta revisão) | `src/server/routes/financials.router.ts` |
| Logística & Despacho | `/api/logistics` | Implementado (não retestado nesta revisão) | `src/server/routes/logistics.router.ts` |
| Clientes & CRM | `/api/crm` | Implementado (não retestado nesta revisão) | `src/server/routes/crm.router.ts` |
| Notas & Anotações | `/api/notes` | Implementado (não retestado nesta revisão) | `src/server/routes/notes.router.ts` |
| Gabinete Executivo HQ | `/api/hq` | Implementado (não retestado nesta revisão) | `src/server/routes/hq.router.ts` |
