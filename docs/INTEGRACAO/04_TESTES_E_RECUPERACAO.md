# 🤝 Integração — 04: Testes Automatizados, Guerras Comerciais e Recuperação

## 📌 1. Visão Geral da Estratégia de Homologação Contínua

A estabilidade e confiabilidade do ecossistema 3EATCRU são comprovadas através de uma esteira rigorosa de testes automatizados executada sob o framework **Vitest**. A suíte combina testes unitários de componentes reativos, contratos de API e uma bateria extrema de **Guerras Comerciais Concorrentes (Stress Tests)**, simulando situações reais de estresse operacional, falhas de conectividade e tentativas de ataque.

```text
┌────────────────────────────────────────────────────────────────────────┐
│               SUÍTE DE TESTES AUTOMATIZADOS (vitest run)               │
├────────────────────────────────────────────────────────────────────────┤
│  10 ARQUIVOS DE TESTE • 90 CENÁRIOS HOMOLOGADOS • 100% DE APROVAÇÃO    │
├────────────────────┬───────────────────────────────────────────────────┤
│ 1. multisegment    │ 11 Cenários (Food, Varejo, Farma, Auto, Beauty, Gym, Hotel) │
│ 2. commerce_war    │ 8 Cenários de Guerra Concorrente (Race Conditions)│
│ 3. security_phase1 │ RBAC, Validação de CNPJ, Bloqueios e Reservas ACID│
│ 4. api.spec        │ Contratos REST Express e Healthcheck de Servidor  │
│ 5. offline-resil   │ Enfileiramento IndexedDB e Recuperação Offline    │
│ 6. ecosystem.serv  │ Fluxos multi-papel integrados (Garçom/PDV/HQ)     │
│ 7. hq-api.serv     │ Contratos de Governança, Split e MDM              │
│ 8. store-os-api    │ Operações do Lojista e Terminal Físico            │
│ 9. google-drive    │ Segurança de Tokens OAuth Workspace em Memória    │
│ 10. app.spec       │ Inicialização Zoneless Angular 21                 │
└────────────────────┴───────────────────────────────────────────────────┘
```

---

## 🔬 2. Detalhamento das 8 Guerras Comerciais de Concorrência

No arquivo `src/server/commerce_war_tests.spec.ts`, foram modeladas as 8 condições de corrida mais críticas do comércio eletrônico e físico:

1. **Guerra 1 — Disputa Simultânea do Último Estoque:**
   Dois canais distintos (ex: PDV local e Marketplace online) tentam comprar a última unidade de um produto no mesmo milissegundo. A transação atômica assegura que apenas um pedido é aprovado; o segundo é abortado com `409 STOCK_CONFLICT`, impedindo estoque negativo.
2. **Guerra 2 — Replay Offline Concorrente:**
   Uma venda realizada durante queda de rede é retransmitida no momento em que outra venda presencial acabou de esgotar o estoque. O motor detecta o conflito determinístico e emite `409 STOCK_CONFLICT`.
3. **Guerra 3 — Liquidação Financeira Única:**
   Múltiplas chamadas simultâneas de webhook ou cliques do operador no botão de confirmação de pagamento geram apenas uma entrada contábil no livro-razão (`fin-sale-*`), sem duplicação de caixa.
4. **Guerra 4 — Idempotência Tripla:**
   Um cliente envia 3 requisições idênticas com o mesmo cabeçalho `X-Idempotency-Key`. O servidor processa a primeira e responde às duas seguintes com o mesmo pedido já gravado (`alreadyExisted: true`), sem reprocessar débito de estoque ou comissão.
5. **Guerra 5 — Duplo Cancelamento Simultâneo:**
   Dois operadores tentam cancelar o mesmo pedido ao mesmo tempo. O sistema efetua o estorno do estoque exatamente uma vez, impedindo duplicação de saldo em prateleira.
6. **Guerra 6 — Cinco Canais de Venda Simultâneos:**
   Vendas concorrentes originadas simultaneamente por Balcão PDV, Comanda do Garçom, Totem Kiosk, App do Consumidor e iFood mantêm integridade referencial total.
7. **Guerra 7 — Bloqueio Cross-Tenant:**
   Operador autenticado na Loja A tenta injetar ou consultar dados na Loja B. O servidor intercepta com `403 TENANT_MISMATCH`.
8. **Guerra 8 — Proteção de Rota por Entregador:**
   Tentativa de um entregador assumir ou transicionar entregas de outro entregador é barrada com erro de autorização.

---

## 🔬 3. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Assegurar que nenhuma alteração de código introduza regressões em funcionalidades essenciais.
- Comprovar que o banco de dados e as rotas suportam concorrência massiva sem corrupção de saldos.
- Fornecer métricas claras e rastreabilidade para auditorias externas e manutenção contínua.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Configuração de Execução:** `package.json` define `"test:ci": "ng test --watch=false"`.
- **Suíte de Testes Reais:**
  - `src/server/multisegment_business_scenarios.spec.ts` (6 cenários reais de Food Service, Varejo EAN-13, Farmácia com Lotes, Serviços Automotivos O.S., Blindagem Anti-Fraude e Outbox Offline).
  - `src/server/commerce_war_tests.spec.ts` (8 testes de alta concorrência).
  - `src/server/security_phase1.spec.ts` (12 testes de segurança, validação de CNPJ por Módulo 11, reservas e bloqueios).
  - `src/app/services/ecosystem.service.spec.ts` (28 testes de comportamento reativo).
  - `src/app/services/hq-api.service.spec.ts` (11 testes do HQ Central).
  - `src/app/services/store-os-api.service.spec.ts` (8 testes do Store OS).
  - `src/app/core/google-drive/google-drive.service.spec.ts` (6 testes de segurança OAuth).
  - `src/app/core/offline/offline-resilience.spec.ts` (2 testes de contingência).
  - `src/server/api.spec.ts` (3 testes de rotas base).
  - `src/app/app.spec.ts` (1 teste de montagem).

### Perspectiva 3: Como se conecta (Topologia de Integração)
- A suíte de testes conecta-se diretamente ao runtime do Express e às coleções do Firestore (utilizando instância de emulação/mock para testes automatizados rápidos), testando o fluxo de dados exatamente como ocorre em produção.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Execução do Comando:** `npm run test:ci` (ou `npm test -- --watch=false`).
- **Relatório Oficial de Execução:**
  - `Test Files: 10 passed (10)`
  - `Tests: 85 passed (85)`
  - `Duration: 3.87s`
- **Taxa de Sucesso:** 100%. Zero falhas.

---

## 📊 4. Matriz de Classificação de Maturidade dos Testes

| Domínio de Teste | Classificação | Arquivo de Especificação | Cobertura / Status |
|---|---|---|---|
| Cenários Multissegmento (Food, Varejo, Farma, Auto) | 🟢 **Implementado e comprovado** | `src/server/multisegment_business_scenarios.spec.ts` | 6/6 cenários aprovados. |
| Guerras Comerciais de Concorrência (1 a 8) | 🟢 **Implementado e comprovado** | `src/server/commerce_war_tests.spec.ts` | 8/8 cenários aprovados. |
| RBAC e Validação Algorítmica de CNPJ | 🟢 **Implementado e comprovado** | `src/server/security_phase1.spec.ts` | 12/12 cenários aprovados. |
| Resiliência Offline e Outbox IndexedDB | 🟢 **Implementado e comprovado** | `src/app/core/offline/offline-resilience.spec.ts` | 2/2 cenários aprovados. |
| Integração Reativa de Serviços do Store OS | 🟢 **Implementado e comprovado** | `src/app/services/store-os-api.service.spec.ts` | 8/8 cenários aprovados. |
| Integração Reativa de Serviços do HQ | 🟢 **Implementado e comprovado** | `src/app/services/hq-api.service.spec.ts` | 11/11 cenários aprovados. |
| Segurança de Tokens OAuth Workspace | 🟢 **Implementado e comprovado** | `src/app/core/google-drive/google-drive.service.spec.ts` | 6/6 cenários aprovados. |
| Testes de Carga com Milhares de Conexões Simultâneas (K6 / Locust) | 🔵 **Planejado, ainda não implementado** | `docs/00_ARQUITETURA_GERAL.md` | Previsto para validação pré-lançamento nacional. |
