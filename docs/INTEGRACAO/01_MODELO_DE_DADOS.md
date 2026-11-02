# 🤝 Integração — 01: Modelo de Dados, Esquemas e Relacionamentos no Firestore

## 📌 1. Visão Geral do Modelo de Persistência

Os fluxos de negócio atualmente conectados neste checkout utilizam o **Cloud Firestore** como persistência ativa. O código PostgreSQL/Drizzle em `src/db/` é um scaffold isolado, não importado pelas rotas ou serviços da aplicação, portanto não constitui uma segunda fonte operacional da verdade. Este repositório não comprova conexão com Cloud SQL ou aplicação de migrações. Para os fluxos ativos, a arquitetura emprega desnormalização e escopo por `tenantId` conforme descrito abaixo.

```text
                                  MODELO DE COLEÇÕES FIRESTORE
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  /tenants/{tenantId}              ──► Unidades empresariais, planos e configurações    │
│  /products/{productId}            ──► Catálogo ERP da loja (com custo e fornecedor)    │
│  /public_catalog/{productId}      ──► Catálogo sanitizado para o marketplace público   │
│  /orders/{orderId}                ──► Pedidos omnichannel (PDV, Mesa, Balcão, Delivery)│
│  /payment_transactions/{txId}     ──► Registros autoritativos de gateways (Pix/Cartão) │
│  /tables/{tableId}                ──► Mesas do salão e ocupação em tempo real           │
│  /reservations/{resId}            ──► Reservas de mesas e fila de espera               │
│  /financials/{finId}              ──► Livro-caixa e lançamentos da operação do tenant  │
│  /delivery_routes/{routeId}       ──► Rotas de entrega e despacho para motoristas      │
│  /drivers/{driverId}              ──► Cadastro e posição reportada do entregador        │
│  /consumers/{consumerId}          ──► Perfis de clientes consumidores                  │
│  /devices/{deviceId}              ──► Hardware e terminais de automação (MDM)           │
│  /hq_settings/{global}            ──► Configurações mestras privadas do SaaS            │
│  /plans/{planId}                  ──► Tabela pública de planos e preços de assinatura  │
│  /public_regional/{default}       ──► Configurações da vitrine do marketplace regional  │
│  /audit_logs/{logId}              ──► Livro-razão de auditoria de segurança e comandos  │
│  /admins/{adminId}                ──► Registro de Super Administradores da plataforma   │
│  /social_messages/{msgId}         ──► Mensageria social e notificações WhatsApp         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

O endpoint `/api/hq/ledger` fica em estado `coming_soon` por padrão e não calcula comissão. Motoristas da loja são registros `private` em `/drivers`; a loja organiza rotas e define a remuneração fora de um fluxo de pagamento do app. A futura comissão da plataforma deverá usar uma rede separada e não será gravada em `/financials` do tenant.

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Estruturar o banco de dados de modo a permitir buscas rápidas filtradas por loja (`where('tenantId', '==', tenantId)`).
- Separar rigorosamente dados privados da empresa (preço de custo, fornecedor, CNPJ, dados contábeis) de dados públicos para o marketplace.
- Assegurar integridade referencial em cascata nas operações comerciais (um pedido deve referenciar produtos válidos, um lançamento financeiro deve referenciar um pedido liquidado).
- Armazenar telemetria de entregadores com coordenadas geográficas para roteamento em tempo real.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Definição Canônica de Tipos (`src/shared/models/ecosystem.model.ts`):**
  - Mapeamento completo de interfaces TypeScript compartilhadas entre o backend Express e o frontend Angular:
    - `CompanyTenant`: Dados cadastrais e operacionais.
    - `ProductItem`: Atributos mercantis e fiscais.
    - `PublicStorefront` e `PublicCatalogProduct`: Projeções públicas e higienizadas.
    - `OrderTransaction`: Cabeçalho do pedido, itens (`CartItem`), descontos, taxas e canal.
    - `PaymentTransactionRecord`: Registro do adquirente (Stripe, Pix, Dinheiro).
    - `TableInfo`: Identificador físico da mesa, capacidade, status e comanda ativa.
    - `FinancialRecord`: Movimentação contábil categorizada.
    - `DeliveryRoute` e `DeliveryWaypoint`: Geometria da rota e paradas de entrega.
    - `StoreDriver`: Status e vínculo da conta (`userUid`), tipo de veículo e posição GPS atual opcional (`lat`, `lng`, precisão, rota e horário do ping). O GPS só é atualizado por consentimento durante rota ativa, sem histórico; gestores consultam apenas seu tenant e HQ recebe o perfil sem os campos de localização.
    - `POSDevice`: Informações de hardware, MAC, IP e status MDM.
- **Isolamento de Catálogo Público:**
  - O catálogo público reside em `/public_catalog`, mantido sincronizado pelo servidor apenas com produtos que tenham `availableOnline: true`.
- **Regras de Validação no Firestore (`firestore.rules`):**
  - Funções de esquema: `isValidAdminDoc`, `isValidHqSetting`, `isValidConsumer`, `isValidDriverTelemetry`.
  - Limites máximos de caracteres em todos os campos para prevenir ataques de estouro de carga útil.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Camada Neutra (`src/shared/`):** Usada tanto pelo servidor Express (`src/server/`) quanto pelo cliente Angular (`src/app/`), eliminando divergências de tipagem.
- **Consultas Otimizadas:**
  - O Store OS consulta produtos por `tenantId` e mesas por `tenantId`.
  - O App do Entregador consulta rotas por `driverId` e `status`.
  - O Marketplace consulta lojas públicas onde `status === 'active'`.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- Nesta revisão, `npm run test:ci` passou com 100/100 testes, incluindo `src/server/api.spec.ts` e `src/server/security_phase1.spec.ts`. Os mocks não substituem validação das regras no emulador ou no Firestore real.

---

## 📊 3. Matriz de Classificação de Maturidade dos Esquemas

| Entidade / Coleção | Classificação | Arquivo de Tipagem | Validação em Banco |
|---|---|---|---|
| `/tenants` (Empresas) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:4` | `firestore.rules:208` |
| `/products` (Catálogo ERP) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:40` | `firestore.rules:219` |
| `/public_catalog` (Marketplace) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:50` | `firestore.rules:231` |
| `/orders` (Pedidos Omnichannel) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:18` | `firestore.rules:238` |
| `/payment_transactions` (Pagamentos) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:160` | `firestore.rules:256` |
| `/tables` (Mesas do Salão) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:55` | `firestore.rules:266` |
| `/financials` (Livro-Caixa) | Implementado no modelo e nas regras; sem homologação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:65` | `firestore.rules:273` |
| `/delivery_routes` (Logística) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:120` | `firestore.rules:280` |
| `/devices` (Inventário de dispositivos) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:80` | `firestore.rules:338` |
| `/audit_logs` (Livro de Auditoria) | Modelo e regra presentes; sem validação no emulador nesta revisão | `src/shared/models/ecosystem.model.ts:100` | `firestore.rules:332` |
