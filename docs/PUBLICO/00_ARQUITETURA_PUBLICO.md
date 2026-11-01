# 🛍️ Público & Marketplace — 00: Arquitetura dos Espaços Públicos e Autoatendimento

## 📌 1. Visão Geral & Pergunta Central de Arquitetura

> **Pergunta Central:** Como conectar clientes, totens e cardápios digitais mantendo a proteção absoluta dos dados internos e a soberania operacional de cada lojista?

O ambiente de **Espaços Públicos e Marketplace (`/marketplace`, `/loja/:slug`, `/profile`)** constitui a superfície de contato direto com o consumidor final e com os clientes presenciais da loja (autoatendimento via Totem Kiosk ou QR Code na mesa).

Diferente do Store OS (voltado para a equipe) e do HQ Central (voltado para a governança SaaS), os Espaços Públicos operam sob uma política estrita de **sanitização de dados (Data Sanitization)**, garantindo que segredos industriais dos lojistas — como margens de lucro, fornecedores, estoques brutos e custos de matéria-prima — jamais sejam expostos ao tráfego de rede ou ao navegador do cliente.

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             SUPERFÍCIE PÚBLICA DO CONSUMIDOR                                   │
├──────────────────────────────┬───────────────────────────────┬─────────────────────────────────┤
│ 1. MARKETPLACE REGIONAL      │ 2. STOREFRONT DA LOJA         │ 3. AUTOATENDIMENTO / QR MESA    │
│    (/marketplace)            │    (/loja/:slug)              │    (/loja/:slug?mesa=04)        │
│ • Descoberta por Praça/GPS   │ • Cardápio Sanitizado         │ • Comanda Direta na Mesa        │
│ • Curadoria Hero do HQ       │ • Modalidades (Delivery/Take) │ • Totem Kiosk Presencial        │
│ • Mapa Interativo Leaflet    │ • Checkout Pix / Cartão       │ • Envio Direto para o KDS       │
└──────────────────────────────┴───────────────────────────────┴─────────────────────────────────┘
                                               │
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE SANITIZAÇÃO DO BACKEND (EXPRESS)                           │
│  - GET /api/tenants/public: Remove CNPJ, e-mails de contato do dono, limites e staffUids       │
│  - GET /api/products/public: Expurga costPrice, wholesalePrice, fornecedor e margem            │
│  - Transação ACID Comercial: Valida se a loja está aberta (isOpen) e se o item vende online    │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que qualquer pessoa descubra estabelecimentos gastronômicos e comerciais próximos através do Marketplace Regional.
- Permitir que cada loja tenha sua vitrine pública personalizada (`/loja/:slug` ou ficha comercial), com identidade visual, horários e cardápio.
- Suportar múltiplos canais de autoatendimento: Delivery em domicílio, Retirada no balcão (*Takeout*), Autoatendimento em Totem e Pedido na Mesa via QR Code.
- Garantir que o cliente não consiga forjar preços, fretes, descontos ou compras em lojas fechadas.
- Permitir ao consumidor autenticado acompanhar em tempo real o status do seu pedido (`pending -> preparing -> dispatched -> delivered`).

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componentes de Interface (Angular 21 Zoneless):**
  - `src/app/components/regional-marketplace.ts`: Desktop e tablet widescreen com banner curado pelo HQ, filtros de busca, ordenação e 3 modos de visualização (Fichário, Livro-Razão e Mesa Cartográfica Leaflet).
  - `src/app/components/marketplace/regional-marketplace-mobile.ts`: Projeção mobile responsiva nativa para smartphones.
  - `src/app/components/customer-storefront.ts`: Vitrine completa da loja individual com carrinho, seletor de modalidade, agendamento de reservas e checkout.
  - `src/app/components/consumer-profile.ts`: Painel do cliente com histórico de pedidos, endereços cadastrados e carteira de fidelidade.
  - `src/app/components/auth/consumer-auth.ts`: Autenticação leve por e-mail/senha ou telefone.
- **Roteamento e Sanitização no Servidor:**
  - `src/server/routes/tenants.router.ts:23` (`GET /api/tenants/public`): Utiliza `toPublicStorefront()` para filtrar apenas lojas ativas e remover dados privados.
  - `src/server/routes/products.router.ts:23` (`GET /api/products/public`): Utiliza `toPublicProduct()` e restringe exclusivamente a itens com `availableOnline === true`.
  - `src/server/core/commerce.engine.ts: executeCommercialOrder`: Bloqueia tentativas de compra se `tenant.isOpen === false` (`422 STORE_CLOSED`) ou se a modalidade não for suportada pela unidade.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Consumidor anônimo ou autenticado (`role === 'consumer'`).
- **Segurança no Firestore (`firestore.rules`):**
  - O cliente consome coleções públicas como `/public_catalog` e `/public_regional`.
  - Em `/orders`, a regra `allow list, get` exige estritamente `resource.data.customerId == request.auth.uid`, impedindo que um cliente veja pedidos de outros clientes.
  - Escrita direta via Client SDK é bloqueada (`allow create, update, delete: if false;`).

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Suíte de Guerra e Concorrência (`src/server/commerce_war_tests.spec.ts`):**
  - **Guerra 6:** Comprovação de pedidos concorrentes vindos do Marketplace e QR Mesa sem colisão com o PDV do balcão.
- **Suíte de Segurança (`src/server/security_phase1.spec.ts`):**
  - Validação de bloqueio `422 STORE_CLOSED` para lojas fechadas.
  - Validação de bloqueio `422 PRODUCT_UNAVAILABLE_ONLINE` para produtos de venda exclusiva no balcão.
  - Validação de que `takeout` não cobra taxa de entrega (`deliveryFee === 0`).
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade dos Espaços Públicos

| Recurso / Espaço Público | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Marketplace Regional da Praça | 🟢 **Implementado e comprovado** | `src/app/components/regional-marketplace.ts` | Descoberta de lojas com 3 modos de visualização. |
| Interface Mobile Nativa PWA | 🟢 **Implementado e comprovado** | `src/app/components/marketplace/regional-marketplace-mobile.ts` | Experiência de app móvel fluido para celulares. |
| Storefront da Loja (`/loja/:slug`) | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts` | Vitrine da unidade com carrinho e horários. |
| Sanitização de Catálogo Anti-Vazamento | 🟢 **Implementado e comprovado** | `src/server/routes/products.router.ts:23` | Expurga `costPrice` e fornecedores da resposta pública. |
| Bloqueio Automático para Lojas Fechadas | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:221` | Responde com HTTP 422 `STORE_CLOSED`. |
| Autoatendimento via QR Code na Mesa | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts:310` | Identifica parâmetro `mesa` e lança comanda direta. |
| Painel do Consumidor e Rastreamento | 🟢 **Implementado e comprovado** | `src/app/components/consumer-profile.ts` | Consulta histórico de pedidos vinculados ao `customerId`. |
| Integração com Totem Físico Kiosk (Touch) | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:63` | Canal `Kiosk Totem` suportado com trava de cancelamento. |
| Programa de Fidelidade com Resgate de Pontos | 🟡 **Implementado parcialmente** | `src/app/components/consumer-profile.ts` | Saldo de pontos exibido no perfil; cupom de resgate em desenvolvimento. |
