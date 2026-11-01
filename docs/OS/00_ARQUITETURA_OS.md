# 🏬 Store OS — 00: Arquitetura e Sistema Operacional da Loja

## 📌 1. Visão Geral & Pergunta Central de Arquitetura

> **Pergunta Central:** Como uma empresa consegue operar de ponta a ponta dentro do OS, sem depender de intervenções manuais no HQ?

O **Store OS Lojista (`/os`, `/pos`)** é o sistema operacional comercial para a unidade física do estabelecimento. Desenhado como uma interface desktop multijanela sobre a web (Angular 21 Zoneless), ele integra toda a operação mercantil de uma loja: desde o registro de itens no balcão e comandas de salão até a baixa atômica de estoque, emissão de tíquetes na cozinha (KDS), conciliação financeira do caixa e despacho logístico.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      STORE OS DESKTOP SHELL (/os)                      │
│        Barra de Tarefas • Menu Iniciar • Multijanela Flutuante         │
├───────────────────┬───────────────────┬────────────────────────────────┤
│    PDV CAIXA      │    KDS COZINHA    │       MESAS & SALÃO            │
│  Venda no Balcão  │  Visualização por │     Mapa de Ocupação           │
│  Sangria/Reforço  │  Estações e Fila  │     Comandas Digitais          │
├───────────────────┼───────────────────┼────────────────────────────────┤
│   ESTOQUE NFE     │   FINANCEIRO DRE  │       HUB LOGÍSTICO            │
│  Curva ABC, Lotes │  Livro-Caixa e    │     Despacho de Pedidos        │
│  Baixa Automática │  Fechamento Cego  │     Atribuição de Entregador   │
└───────────────────┴───────────────────┴────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CAMADA DE RESILIÊNCIA LOCAL                        │
│   - Outbox Engine (IndexedDB): Armazena vendas offline se internet cair│
│   - Sync Determinístico: Reenvio com X-Idempotency-Key quando voltar   │
│   - Detecção Transacional de 409 STOCK_CONFLICT                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que a loja abra o caixa, lance produtos, altere cardápios, gerencie comandas e feche o expediente sem necessidade de solicitar suporte ou liberação manual ao HQ.
- Manter o isolamento rigoroso de seus próprios registros comerciais, impedindo vazamento de dados para estabelecimentos concorrentes.
- Garantir continuidade das operações mesmo diante de oscilações ou quedas totais da conexão com a internet.
- Oferecer experiência de computador desktop nativo (janelas arrastáveis, minimização, maximização, docks e teclado virtual para terminais touchscreen).

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Container Desktop Multijanela:** `src/app/components/client-os.ts`.
  - Gerenciamento de janelas via signals reativos do Angular 21:
    - `windows = signal<OSWindow[]>([])`
    - Controle de `zIndex`, coordenadas `x, y`, dimensões `width, height` e estados `isMinimized`, `isMaximized`.
  - Suporte a docks de janela (`dockPosition: 'left' | 'right' | 'full'`).
- **Sequência de Bootstrap Rápida (`src/app/components/os/bootstrap.ts`):**
  - Sequência de inicialização em 6 etapas curtas: `Boot -> Core -> Auth -> Device -> Workspace -> Apps Ready`.
  - Carregamento diferido de componentes através de `@defer (on idle)` no template `client-os.html`.
- **Registro Central de Aplicações (`src/app/models/os.model.ts` e `os-apps-registry.ts`):**
  - 33 módulos nativos mapeados no dicionário `OS_APPS_REGISTRY`, incluindo simuladores de apps móveis.
- **Simuladores de Apps Móveis (Android/iOS Viewports):**
  - `src/app/components/os-windows/waiter-sim-window.ts`: Emulação do App Garçom.
  - `src/app/components/os-windows/driver-sim-window.ts`: Emulação do App Motorista.
  - `src/app/components/os-windows/consumer-sim-window.ts`: Emulação do Marketplace/App Consumidor.
- **Camada de Serviços do Lojista:**
  - `src/app/services/store-os-api.service.ts`: Abstração de chamadas REST `/api/*` com escopo obrigatório de `tenantId`.
  - `src/app/services/orders.service.ts`: Estado reativo de pedidos.
  - `src/app/services/inventory.service.ts`: Catálogo de produtos e movimentação de estoque.
  - `src/app/services/financials.service.ts`: Registro de fluxo de caixa e livro-razão.
  - `src/app/services/tables.service.ts`: Ocupação de mesas e comandas de salão.
  - `src/app/core/offline/indexed-db.service.ts`: Banco local IndexedDB para contingência.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Autenticação:** O operador loga como `tenant_owner` ou `operator` no componente `src/app/components/auth/merchant-auth.ts`.
- **Roteamento e Proteção:** A rota `/os` é protegida pelo guarda `storeOperatorGuard` (`src/app/guards/auth.guard.ts:79`).
- **Escopo no Servidor:** O interceptor HTTP anexa o Bearer ID Token. Todas as consultas nas rotas de produtos, pedidos, mesas e finanças utilizam `req.user.tenantId` como cláusula `where('tenantId', '==', tenantId)`.
- **Comunicação com o HQ:** O Store OS consome status de plano e limites de dispositivos de `/api/tenants/:id`, reportando telemetria em segundo plano.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Unitários:**
  - `src/app/services/store-os-api.service.spec.ts`: Valida busca de produtos, pedidos, mesas, motoristas e finanças escopados ao tenant.
  - `src/app/core/offline/offline-resilience.spec.ts`: Valida enfileiramento offline e envio determinístico de transações.
  - `src/app/app.spec.ts`: Valida bootstrap do aplicativo Angular 21 em modo Zoneless.
- **Resultado:** 100% de testes aprovados.

---

## 📊 3. Matriz de Classificação de Maturidade do Store OS

| Capacidade Arquitetural | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Desktop Multijanela com Docks e Drag | 🟢 **Implementado e comprovado** | `src/app/components/client-os.ts` | Manipulação de janelas com controle de z-index e redimensionamento. |
| Carga Otimizada com @defer | 🟢 **Implementado e comprovado** | `src/app/components/client-os.ts` | Janelas pesadas (KDS, DRE, NFe) carregadas sob demanda. |
| Resiliência e Operação Offline (IndexedDB) | 🟢 **Implementado e comprovado** | `src/app/core/offline/indexed-db.service.ts` | Fila offline com `offline-outbox.engine.ts` e reconciliação. |
| Isolamento Estrito de Dados do Tenant | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:87` | `resolveAuthoritativeTenantId` impede invasão de dados de outras lojas. |
| Barramento Reativo Zoneless (Angular 21) | 🟢 **Implementado e comprovado** | `src/app/app.config.ts` | Uso pleno de Signals e zero importações de `zone.js`. |
| Troca Rápida de Usuário por PIN de 6 Dígitos | 🟢 **Implementado e comprovado** | `src/app/components/os/lock-screen.ts` | Teclado numérico touch com 6 slots visuais reativos, auto-submit no 6º dígito e retrocompatibilidade com 4 dígitos. |
| Perfis Operacionais Multissegmento (Food, Varejo, Farma, Auto) | 🟢 **Implementado e comprovado** | `src/server/multisegment_business_scenarios.spec.ts` | 11 cenários de negócio validados por testes automatizados (90 testes aprovados). |
