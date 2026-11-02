# 🤝 Integração — 02: Catálogo de Rotas de API, Eventos e Contratos

## 📌 1. Visão Geral dos Roteadores Express

O backend do 3EATCRU é estruturado como uma API RESTful unificada em Express 5 (`src/server/api.ts`), servida na mesma porta da aplicação Angular SSR (porta 3000). A API monta roteadores especializados para os domínios de negócio. A lista de prefixos e aliases deve ser conferida em src/server/api.ts.

Prefixos montados em src/server/api.ts:

- /api/health, /api/auth, /api/hq, /api/billing, /api/tenants, /api/products, /api/orders, /api/marketplace-delivery.
- /api/tables, /api/financials, /api/logistics, /api/payments, /api/crm, /api/notes.
- /api/hr, /api/service-orders, /api/suppliers, /api/stock-audits, /api/tasks.
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
- **Logística da loja:** `POST /api/logistics/routes` calcula a remuneração de rota somando os snapshots das parcelas pagas pelo cliente e pela loja nos pedidos vinculados. Uma rota manual sem pedidos vinculados ainda pode receber `storeDriverCompensation` como valor combinado. Distância e duração informadas pela loja são armazenadas sem cálculo ou verificação por GPS; se omitidas, ficam como não informadas. A janela omitida fica como `Sem janela definida`. O valor da rota não é pagamento processado nem comprovante de recebimento. O app do entregador atende motoristas vinculados à loja.
- **Limite HQ e logística:** gestores só consultam e operam rotas e motoristas do tenant da sessão. `hq_admin` não consulta nem opera a frota privada das lojas; os endpoints HQ ficam limitados à rede própria `marketplace` e respondem `409 PLATFORM_DELIVERY_NETWORK_UNAVAILABLE` enquanto ela não estiver pronta. O HQ não carrega rotas nem perfis privados no console.
- **Diretório CRM do HQ:** `GET /api/crm/consumers?pageToken={cursor}` exige `hq_admin`, retorna até 50 contatos em `{ items, nextPageToken, pageSize }` e ordena pelo ID do documento. Envie o `nextPageToken` seguinte para buscar a próxima página; atualize a listagem se o cursor tiver sido removido (`400 INVALID_PAGE_TOKEN`). A resposta inclui somente ID, nome, e-mail, telefone e `updatedAt`; não expõe endereço ou CPF.
- **Escala das consultas HQ:** overview e métricas por tenant selecionam os campos usados e processam os resultados em fluxo para limitar memória; ainda leem todo o histórico, sem paginação ou intervalo temporal. O custo de leitura e o tempo continuam crescendo com a coleção. Agregados materializados e backfill consistente dos dados legados ainda são necessários para eliminar a varredura sem alterar critérios históricos.
- **GPS de entrega:** `POST /api/logistics/drivers/:id/ping` só aceita o próprio motorista autenticado e motorista `private` de tenant. Para compartilhar, exige `sharing: true`, `routeId` atribuído ao motorista, rota `in_progress` da mesma loja, latitude e longitude numéricas dentro dos limites geográficos e precisão opcional entre 0 e 10.000 m. O cliente envia a cada 15 s enquanto a tela está visível. `sharing: false` apaga coordenadas, precisão, rota e horário do ping. A conclusão da rota também apaga a posição. Não há trilha histórica.
- **Vínculo de conta de motorista:** `POST /api/auth/assign-role` aceita `targetEmail`, `role: "driver"` e `driverId`. O e-mail deve pertencer a uma conta Firebase existente e verificada; o cadastro de motorista deve ser `private` e pertencer ao mesmo tenant do gestor. O servidor atribui os claims `driver`/`tenantId` e grava `userUid` no cadastro. A mesma conta não pode ser vinculada a outro motorista ou tenant. Para atribuir rotas pelo eApp, o cadastro precisa estar vinculado.
- **Assinatura SaaS:** `POST /api/billing/hq/subscriptions/:tenantId/checkout` cria checkout recorrente usando preço e e-mail lidos pelo servidor; `GET /api/billing/hq` lista provedores configurados, assinaturas e faturas; `POST /api/billing/hq/subscriptions/:tenantId/cancel` cancela no provedor. Somente `hq_admin` acessa o gerenciamento. Stripe usa `/api/billing/webhooks/stripe`; Mercado Pago usa `/api/billing/webhooks/mercadopago`. Ambos exigem segredos de webhook e os pagamentos só são atualizados após verificação. Para Mercado Pago, registre `subscription_preapproval` e `subscription_authorized_payment`; o último consulta `/authorized_payments/{id}` para conciliar a fatura da recorrência. A loja não recebe valores do checkout SaaS na conta de pedidos.
- **Planos SaaS:** todos os planos dão acesso completo ao Store OS; `maxDevices` define a cota inicial para novos tenants. O catálogo ignora campos legados de módulos incluídos e usa do Firestore somente preço e cota validados. O preço mensal atualizado passa a ser usado no próximo checkout, mas não sincroniza assinaturas existentes automaticamente.
- **Marketplace e vitrine pública:** `GET /api/hq/regional` retorna a configuração completa do marketplace e preenche os campos ausentes com os padrões da plataforma. `POST /api/hq/regional`, restrito a `hq_admin`, valida os campos e persiste banner, avisos, praça, raio inicial de busca (inteiro de 1 a 30 km) e IDs de destaque em `/public_regional/default`; erro de persistência é apresentado ao HQ e não atualiza o estado local como se tivesse sido publicado. O raio salvo inicializa o filtro do consumidor, que pode ajustá-lo localmente depois de autorizar o GPS. O lojista edita os campos da vitrine individual por `PATCH /api/tenants/:id`; proprietário/operador pode alterar nome, descrição pública, horário informativo, disponibilidade, modalidades, taxa, pedido mínimo e chave PIX. O HQ também pode alterar `status`, `plan`, `devicesLimit` e `deliveryRadiusKm`. Outros campos são rejeitados pelo allowlist. Valores opcionais podem ser removidos com `null` (descrição e PIX vazios também removem o campo). Os fluxos de cadastro real e provisionamento HQ não gravam horário, taxa ou pedido mínimo de exemplo. A ficha do HQ abre pré-visualização e controla parâmetros administrativos/operacionais. `GET /api/tenants/public` retorna somente lojas `active` usando `toPublicStorefront`. No cliente, marketplace, página inicial e vitrine usam `publicStorefronts`; a falha da API limpa a lista e não recupera `MOCK_TENANTS`. Os dados simulados só são fornecidos em modo de simulação e a landing os identifica. Campos ausentes como nota, horário, localização, prazo, taxa e status permanecem ausentes; não são preenchidos com valores fictícios.
- **Dados públicos de loja:** a projeção inclui `aboutText` como conteúdo público e omite nome legal, telefone privado, CNPJ, chave PIX, equipe, dispositivos e dados financeiros. Pode expor WhatsApp e IDs de produtos destacados quando configurados como informações públicas. A rota `/p/:id` confere a loja na lista pública e bloqueia pedido se ela não estiver publicada ou se faltarem status e configurações necessários.
- **Perfil do entregador:** O app mostra somente veículo/placa/status do cadastro, conferência registrada e agregados das rotas carregadas. Não há avaliações, quilometragem medida por telemetria ou pagamentos processados pelo app.
- **Mapas:** marketplace, HQ e app de motorista usam o estilo Liberty do OpenFreeMap via MapLibre com atribuição OpenMapTiles/OpenStreetMap e cores naturais levemente mais saturadas; a simulação é identificada por aviso visual, sem dessaturar ou inverter o mapa. A localização do consumidor fica no navegador; a frota da loja só recebe GPS após consentimento do motorista e enquanto uma rota atribuída estiver `in_progress`. O eApp mostra posições com ping nos últimos 2 minutos. Endereços textuais não são geocodificados, então não existe traçado/navegação calculada nem ETA por GPS.
- **Checkout de delivery:** O total do cliente soma os itens e `deliveryFee`. O pedido também guarda `storeDeliveryContribution` e `driverCompensation = deliveryFee + storeDeliveryContribution` como snapshots internos. A rota soma os snapshots dos pedidos vinculados; os valores não criam transferência nem comprovante de pagamento. O campo legado `serviceFeePercent` é ignorado; os 8% de comissão da rede própria da plataforma não entram neste checkout.
- **Marketplaces de delivery de terceiros:** o Store OS tem o eApp `delivery-marketplaces` com plugins para iFood, 99Food e Rappi. `GET /api/marketplace-delivery/orders` e `GET /api/marketplace-delivery/connections` exigem `tenant_owner` ou `operator` e derivam o tenant da sessão. O serviço interno de ingestão exige vínculo ativo do merchant e deduplica eventos, mas nenhum adapter externo chama o serviço ainda; não há webhook, polling, OAuth ou ações de pedidos. A fila fica vazia até as integrações homologadas serem conectadas. Veja [o contrato de plugins e as dependências](./05_PLUGINS_MARKETPLACES_DELIVERY.md).
- **Localização no marketplace:** a busca textual por bairro/cidade não geocodifica endereço. Distâncias e raio de busca só funcionam depois de obter a localização real do navegador. A vitrine envia endereço textual de entrega e omite latitude/longitude quando não há geocodificação do destino.
- **Destino dos pagamentos:** O checkout público chama o proxy de pagamentos para PIX/dinheiro. O PIX usa `tenants/{tenantId}.pixKey`, editável pelo lojista em Minha Loja, e destina o valor à chave da loja. A confirmação ainda é manual. Cartão live retorna `TENANT_CARD_ACCOUNT_NOT_CONFIGURED` se só houver credencial global; não cobra pedidos na conta do HQ.
- **Confirmação manual:** `POST /api/payments/:id/confirm` atualiza pagamento e pedido na mesma transação Firestore e rejeita pedido ausente/cancelado/já pago/estornado ou não pendente, tenant diferente, valor divergente ou tentativa não vinculada. A confirmação continua sem consultar PSP.
- **Repetição de pagamento:** a tentativa pendente do pedido é reutilizada quando o mesmo meio e valor são reenviados. Outra forma de pagamento retorna `409 PAYMENT_ATTEMPT_PENDING`; ainda não há expiração nem cancelamento de tentativas pendentes.
- **Motor de pagamentos do HQ:** assinaturas recorrentes são criadas nas contas da plataforma dos provedores. `platform_subscriptions`, `platform_billing_invoices` e `billing_webhook_events` guardam estados e idempotência; credenciais permanecem em ambiente de servidor. A confirmação de checkout não depende da página de retorno. A política de suspensão por inadimplência não está automatizada.
- **Comissão da plataforma:** o status padrão de `platformDeliveryCommissionStatus` é `coming_soon`. Enquanto a rede estiver indisponível, a API bloqueia cadastros/conversões para a frota `marketplace`, criação de rotas para essa frota, atribuições a motorista `platform` e transições operacionais de rotas legadas da plataforma. Os 8% ficam fora das vendas e dos motoristas da loja; sua ativação depende da futura rede própria e da inteligência operacional.
- **Configuração segura da comissão:** `POST /api/hq/system/platform-delivery-commission` permite ao `hq_admin` salvar `coming_soon`; a ativação antecipada é rejeitada e qualquer valor `active` legado é exposto como `coming_soon` na leitura pela trava de prontidão do servidor.
- **Vínculo de responsável do tenant:** `GET /api/tenants/:id/owner` retorna ao `hq_admin` o UID e e-mail atuais, sem claims. `POST /api/tenants/:id/owner` exige `{ "email": "..." }` de uma conta existente e verificada. Atualiza `ownerUid`, `staffUids`, `/users/{uid}` e claims; rejeita outra titularidade ativa e preserva claims adicionais. Se Firebase Auth falhar depois da reserva Firestore, tenta restaurar as claims anteriores e reverter a reserva; informa erro explícito caso alguma reversão também falhe. O ID Token do responsável precisa ser renovado.
- **Proteção de vínculos:** `POST /api/tenants` ignora `ownerUid`/`staffUids` enviados pelo cliente. `PATCH /api/tenants/:id` remove esses campos para todos os papéis. `POST /api/auth/assign-role` retorna `409 OWNER_LINK_REQUIRED` quando solicitado `tenant_owner`.
- **Cota de dispositivos:** `POST /api/hq/devices` valida tenant, serial duplicado e `devicesLimit` na transação que cria o registro. Registros internos de `tenantId: hq` ficam fora da cota de loja.
- **Resumo de tenant:** `GET /api/hq/tenants/:id/metrics` exige `hq_admin`, busca o histórico pelo `tenantId` exato e retorna contagem/volume dos pedidos elegíveis (`isSimulated === false`, fora de cancelados, pagamento aprovado ou status concluído, total finito não negativo). Não pagina nem concilia com adquirentes.
- **Cota inicial de planos:** o provisionamento HQ usa `maxDevices` salvo no plano selecionado; o cadastro público inicia em Starter e usa sua cota. Sem valor salvo, aplica os padrões do servidor. Se Firestore não carregar a configuração, o cadastro retorna `503 PLAN_CONFIGURATION_UNAVAILABLE` e não grava tenant.
- **Middleware de Rate Limiting (`src/server/middleware/rate-limiter.middleware.ts`):**
  - `authRegisterRateLimiter`: Limita tentativas repetidas de cadastro de estabelecimentos para mitigar ataques de força bruta ou criação em massa de lojas falsas.
- **Dicionário Canônico de Códigos de Erro da Plataforma:**
  - `400 INVALID_CNPJ`: CNPJ com menos de 14 dígitos ou dígito verificador inválido.
  - `400 INVALID_TENANT_UPDATE_FIELDS`: PATCH de tenant contém campo fora da allowlist do perfil autenticado.
  - `400 EMPTY_TENANT_UPDATE`: PATCH de tenant não contém campo editável.
  - `400 INVALID_TENANT_NAME`, `INVALID_TENANT_ABOUT_TEXT`, `INVALID_DELIVERY_FEE`, `INVALID_STORE_DELIVERY_CONTRIBUTION`, `INVALID_MIN_ORDER_VALUE`, `INVALID_TENANT_PIX_KEY`, `INVALID_DELIVERY_SUPPORT`, `INVALID_TAKEOUT_SUPPORT`, `INVALID_OPENING_HOURS`: dados de perfil fora do formato ou limites aceitos.
  - `400 EMPTY_CART`: Tentativa de enviar pedido sem itens.
  - `400 INVALID_MARKETPLACE_ORDER_IDENTITY`, `INVALID_MARKETPLACE_ORDER_SOURCE`, `INVALID_MARKETPLACE_ORDER_ITEMS`, `INVALID_MARKETPLACE_ORDER_ITEM`, `INVALID_MARKETPLACE_ORDER`: adapter enviou pedido externo fora do contrato de entrada.
  - `403 TENANT_MISMATCH`: Operador tentando acessar recurso de outro estabelecimento.
  - `403 MARKETPLACE_ORDER_ACCESS_DENIED`: papel sem permissão para consultar a fila externa da loja.
  - `403 MARKETPLACE_CONNECTION_ACCESS_DENIED`: papel sem permissão para consultar conexões externas da loja.
  - `403 MARKETPLACE_CONNECTION_NOT_ACTIVE`: evento externo não corresponde a merchant vinculado a conexão ativa do tenant.
  - `403 TENANT_INACTIVE`: Estabelecimento bloqueado ou suspenso pelo HQ Central.
  - `403 HQ_ADMIN_REQUIRED`: Usuário comum tentando invocar comandos executivos.
  - `409 OWNER_LINK_REQUIRED`: atribuição direta de `tenant_owner` recusada; usar o fluxo de vínculo do responsável.
  - `409 MARKETPLACE_EVENT_ORDER_MISSING`: recibo de evento já existe, mas o pedido apontado não foi encontrado.
  - `409 TENANT_OWNER_ALREADY_LINKED`: loja já possui outro responsável.
  - `409 OWNER_LINKED_TO_ANOTHER_TENANT`: conta já vinculada a outra loja.
  - `409 OWNER_EMAIL_NOT_VERIFIED`: conta precisa confirmar o e-mail antes do vínculo.
  - `409 DEVICE_QUOTA_REACHED`: cota de registros do tenant alcançada; a mensagem inclui total atual e limite.
  - `409 PAYMENT_ATTEMPT_PENDING`: existe uma tentativa de pagamento pendente para o pedido; não gere outra cobrança/QR por meio diferente.
  - `503 PLAN_CONFIGURATION_UNAVAILABLE`: o servidor não conseguiu carregar a configuração de cota antes de criar o tenant.
  - `500 MARKETPLACE_ORDER_LIST_FAILED`: falha ao consultar a fila persistida do tenant.
  - `500 MARKETPLACE_CONNECTION_LIST_FAILED`: falha ao consultar estado resumido das integrações do tenant.
  - `409 STOCK_CONFLICT`: Estoque insuficiente durante a execução transacional da venda.
  - `409 IDEMPOTENCY_TENANT_COLLISION`: Reutilização indevida de chave de idempotência.
  - `422 STORE_CLOSED`: Loja fechada para pedidos online.
  - `422 MODALITY_NOT_SUPPORTED`: Tentativa de pedir delivery em loja que não opera entrega.
  - `422 DELIVERY_FEE_NOT_CONFIGURED`: checkout de entrega bloqueado até a loja definir a parcela cobrada do cliente.
  - `422 PRODUCT_UNAVAILABLE_ONLINE`: Tentativa de compra online de item de balcão exclusivo.
  - `422 RESERVATIONS_DISABLED`: Loja com agendamento de mesas desabilitado.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Cabeçalhos Exigidos:**
  - `Authorization: Bearer <FIREBASE_ID_TOKEN>` (em todas as rotas privadas).
  - `X-Idempotency-Key: <CHAVE_UNICA>` (recomendado em operações mutáveis, obrigatório em pagamentos e vendas).
- **Consumo no Frontend:**
  - Serviços Angular em `src/app/services/` usam `HttpClient` para disparar as requisições, interceptadas automaticamente por `auth.interceptor.ts`.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- Nesta continuação, `npm run check` passou: lint, 100/100 testes e build de produção. A suíte inclui mocks e cenários de API/segurança, mas não valida todos os endpoints individualmente nem substitui integração ao vivo com Firebase ou provedores de pagamento. Consulte [testes e recuperação](./04_TESTES_E_RECUPERACAO.md) para os comandos, medições e limites da validação.

---

## 📊 3. Matriz de Classificação de Maturidade dos Roteadores

| Roteador | Rota Base | Classificação | Arquivo de Código |
|---|---|---|---|
| Autenticação & Onboarding | `/api/auth` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/auth.router.ts` |
| Estabelecimentos & Perfil | `/api/tenants` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/tenants.router.ts` |
| Produtos & Cardápio | `/api/products` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/products.router.ts` |
| Pedidos & Fluxo Comercial | `/api/orders` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/orders.router.ts` |
| Pagamentos & Gateways | `/api/payments` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/payments.router.ts` |
| Mesas do Salão | `/api/tables` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/tables.router.ts` |
| Reservas & Fila de Espera | `/api/reservations` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/reservations.router.ts` |
| Finanças & Livro-Caixa | `/api/financials` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/financials.router.ts` |
| Logística & Despacho | `/api/logistics` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/logistics.router.ts` |
| Clientes & CRM | `/api/crm` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/crm.router.ts` |
| Notas & Anotações | `/api/notes` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/notes.router.ts` |
| RH & Ponto | `/api/hr` | Implementado com cadastro operacional e registro manual; sem folha/CPF/salário | `src/server/routes/hr.router.ts` |
| Ordens de Serviço | `/api/service-orders` | Implementado para abertura e transições; sem cobrança ou liquidação | `src/server/routes/service-orders.router.ts` |
| Fornecedores | `/api/suppliers` | Diretório persistente por unidade; sem compras/recebimento | `src/server/routes/suppliers.router.ts` |
| Contagem de estoque | `/api/stock-audits` | Registro de divergências sem ajuste automático do saldo | `src/server/routes/stock-audits.router.ts` |
| Tarefas | `/api/tasks` | Checklist persistido por unidade | `src/server/routes/tasks.router.ts` |
| Gabinete Executivo HQ | `/api/hq` | Implementado; suíte CI geral aprovada, cobertura por rota varia | `src/server/routes/hq.router.ts` |
