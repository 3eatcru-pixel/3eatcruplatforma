# 🏬 Store OS — 09: Persistência, Sincronização e Tolerância a Falhas Offline

## 📌 1. Visão Geral da Arquitetura de Resiliência Offline

Em operações reais de varejo e restaurantes, oscilações na rede de internet são inevitáveis. O **Store OS** adota uma estratégia de contingência local baseada no padrão **Offline Outbox Pattern**, utilizando o banco de dados nativo do navegador (**IndexedDB**) e cabeçalhos de idempotência estritos (**`X-Idempotency-Key`**).

```text
                                OPERAÇÃO DE VENDA NO CAIXA
                                            │
                                            ▼
                             🌐 A INTERNET ESTÁ ATIVA?
                             ┌──────────────┴──────────────┐
                           SIM                            NÃO
                             │                             │
                             ▼                             ▼
              [POST /api/orders DIRETO]       [SALVA NA FILA OUTBOX]
              Transação ACID no Firestore      IndexedDB: 'offline_orders'
                             │                 Gera X-Idempotency-Key
                             │                             │
                             │                             ▼
                             │                 🌐 QUANDO A REDE RETORNA
                             │                 Serviço de Sincronização
                             │                 despacha a fila em ordem
                             ▼                             ▼
              ┌─────────────────────────────────────────────────────────┐
              │           RESPOSTA DETERMINÍSTICA DO SERVIDOR           │
              ├─────────────────────────────┬───────────────────────────┤
              │ 🟢 HTTP 200 / 201           │ 🔴 HTTP 409 STOCK_CONFLICT│
              │ Venda liquidada com sucesso │ Estoque esgotado durante  │
              │ e baixada no banco mestre   │ o período offline. Notifi-│
              │                             │ cação ao operador do PDV  │
              └─────────────────────────────┴───────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que o operador do caixa continue lançando pedidos e recebendo em dinheiro ou cartão físico mesmo se o link de internet cair completamente.
- Armazenar localmente as operações com garantia de não perda caso o navegador seja fechado ou a máquina reiniciada.
- Sincronizar em lote e em segundo plano assim que a conexão for restabelecida, sem congelar a tela do usuário.
- Garantir que nenhum pedido seja processado duas vezes no servidor (idempotência obrigatória).
- Detectar e tratar de forma amigável cenários de conflito de estoque ocorridos enquanto a loja esteve desconectada.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Motor de Outbox na Camada Neutra (`src/shared/offline/offline-outbox.engine.ts`):**
  - Implementa a fila serializada com métodos `enqueue()`, `peek()`, `dequeue()` e tratamento de retentativas exponenciais com limite máximo.
  - Gera chaves determinísticas de idempotência no formato: `idempotencyKey = 'ord-off-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)`.
- **Serviço de IndexedDB do Cliente (`src/app/core/offline/indexed-db.service.ts`):**
  - Abre banco local `3eatcru_offline_db` (ObjectStore: `pending_transactions`, `cached_products`).
  - Cache de leitura dos produtos para consulta offline imediata de preços e códigos de barras.
- **Serviço de Sincronização Reativa (`src/app/core/offline/offline-sync.service.ts`):**
  - Escuta eventos `window.addEventListener('online')` e `window.addEventListener('offline')`.
  - Dispara esvaziamento da fila de forma sequencial com cabeçalho `X-Idempotency-Key`.
- **Backend Idempotente (`src/server/core/commerce.engine.ts:149`):**
  - Primeira etapa da transação no Firestore: Se o `idempotencyKey` já existir no banco, retorna o pedido existente com `alreadyExisted: true`, garantindo que retentativas de rede jamais dupliquem cobranças ou saídas de estoque.
  - Se outro canal vendeu o estoque durante a queda, o servidor rejeita com `409 STOCK_CONFLICT`, capturado pelo cliente para aviso em tela.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** `submitSale()` no PDV disparado com `navigator.onLine === false`.
- **Armazenamento:** Gravação síncrona no IndexedDB local antes de limpar a tela do PDV para a próxima venda.
- **Saída:** Requisição HTTP POST `/api/orders` enviada automaticamente na volta do sinal.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/core/offline/offline-resilience.spec.ts`:
    - Simulação de desconexão e gravação na fila Outbox.
    - Validação de envio com sucesso e tratamento determinístico de `409 STOCK_CONFLICT`.
  - `src/server/commerce_war_tests.spec.ts`:
    - **Guerra 2:** Replay offline concorrente com disputa de estoque e resolução determinística com código 409.
    - **Guerra 4:** Idempotência tripla em reenvios de pacotes de rede idênticos.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Capacidade de Resiliência Offline | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Armazenamento em IndexedDB Local | 🟢 **Implementado e comprovado** | `src/app/core/offline/indexed-db.service.ts` | Salva pedidos na fila local de contingência. |
| Fila Outbox com Retry Exponencial | 🟢 **Implementado e comprovado** | `src/shared/offline/offline-outbox.engine.ts` | Processa transações em ordem com controle de falhas. |
| Chave de Idempotência Obrigatória (`X-Idempotency-Key`) | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:149` | Evita duplicidade de pedidos em conexões instáveis. |
| Detecção Determinística de Conflito de Estoque (`409`) | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:250` | Alerta operador se mercadoria foi vendida por outro canal. |
| Detecção Automática de Status Online/Offline | 🟢 **Implementado e comprovado** | `src/app/core/offline/offline-sync.service.ts` | Monitora eventos de rede do navegador em tempo real. |
| Sincronização Bidirecional de Cadastros Offline para Desktop | 🟡 **Implementado parcialmente** | `src/app/core/offline/indexed-db.service.ts` | Vendas offline operam integralmente; alteração de preços e cadastro de novos produtos em modo offline exigem conexão. |
