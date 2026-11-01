# 🏛️ HQ Central — 04: Pagamentos, Split Contábil, Cobrança e Recebimentos

## 📌 1. Visão Geral do Split Contábil da Plataforma

A plataforma 3EATCRU opera como intermediadora comercial no marketplace regional e provedora de infraestrutura nos canais digitais. Por padrão, a plataforma retém uma comissão de **8%** sobre as vendas aprovadas (configurável pelo HQ entre **0% e 50%**), repassando o valor líquido de **92%** para a conta contábil do estabelecimento lojista.

```text
                                PEDIDO ONLINE APROVADO
                                    (Exemplo: R$ 100,00)
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │   COMMERCE ENGINE TRANSACTION (ACID)    │
                       └────────────────────┬────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
       🟢 LÍQUIDO DO LOJISTA (92%)                     🟣 COMISSÃO HQ SAAS (8%)
           R$ 92,00 creditado                             R$ 8,00 auditado
       em /financials/{fin-sale-*}                    em /audit_logs e /hq/ledger
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Registrar em tempo real todas as vendas liquidadas na rede, deduzindo a alíquota de comissão devida ao SaaS.
- Fornecer ao Gabinete Executivo do HQ um livro-razão consolidado (`Revenue Ledger`) discriminando cada transação, percentual aplicado, valor bruto, comissão da plataforma e valor líquido do lojista.
- Permitir que o Super Admin ajuste a alíquota padrão da rede (ex: em campanhas promocionais ou reajustes de tabela).
- Impedir qualquer desvio de fundos ou liquidação manual desprovida de comprovação por adquirente ou confirmação física pelo operador de caixa.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Configuração da Alíquota de Split:**
  - Armazenada em `/hq_settings/global` com valor padrão `platformCommissionRate: 0.08` (`src/server/routes/hq.router.ts:30`).
  - Endpoint de atualização: `POST /api/hq/system/commission` (`hq.router.ts:188`), validando rigorosamente limites entre 0% e 50%.
- **Livro-Razão Analítico:**
  - Endpoint: `GET /api/hq/ledger` (`hq.router.ts:407`), restrito a `requireHqAdmin`.
  - Filtra exclusivamente pedidos reais (`isSimulated === false`), não cancelados e com pagamento aprovado (`paymentStatus === 'approved' || status === 'completed'`).
  - Para cada pedido, calcula:
    ```typescript
    const feeRate = settings.platformCommissionRate;
    const hqFee = Number((o.total * feeRate).toFixed(2));
    const storeNet = Number((o.total - hqFee).toFixed(2));
    ```
- **Gravação Atômica da Venda e do Split:**
  - Realizada em `src/server/core/commerce.engine.ts:600` dentro da transação `executeCommercialOrder` ou na confirmação de pagamento em `src/server/routes/payments.router.ts:250`.
  - Cria o registro financeiro `/financials/fin-sale-${orderId}` com `type: 'income'` e detalhes de split.
- **Interface Visual do HQ:**
  - `src/app/components/hq/hq-ledger.ts`: Tabela com filtros de canal, loja e valor total retido pela plataforma.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Pagamento confirmado via gateway (Stripe ou Pix em `payments.router.ts`) ou confirmação explícita de dinheiro no PDV com operador autenticado (`cashConfirmedByOperator === true`).
- **Comunicação com o Lojista:**
  - O Store OS do lojista consulta seus recebíveis através de `GET /api/financials`. O lojista enxerga exclusivamente as entradas e saídas vinculadas ao seu `tenantId`.
  - O Lojista **não tem acesso** aos relatórios consolidados dos demais parceiros da rede nem à rota `/api/hq/ledger`.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes de Guerra Comercial (`src/server/commerce_war_tests.spec.ts`):**
  - **Guerra 3 (Liquidação Única):** Validação de que tentativas simultâneas de liquidação do mesmo pedido geram apenas um registro financeiro `fin-sale-*` e uma única entrada contábil.
  - **Guerra 4 (Idempotência Tripla):** Validação de que reenvios de pagamento não duplicam a comissão do HQ.
- **Suíte de Segurança (`src/server/security_phase1.spec.ts`):**
  - Validação de que operadores e clientes não conseguem consultar `/api/hq/ledger` (HTTP 403).
  - Validação de que chamadas manuais de inserção financeira sem pedido correspondente são bloqueadas.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Funcionalidade de Pagamento / Split | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Split Automático de Comissão da Plataforma | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:417` | Cálculo exato de comissão SaaS e valor líquido do lojista. |
| Parametrização da Taxa pelo HQ (0% a 50%) | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:188` | Atualização auditada e persistida em `/hq_settings/global`. |
| Livro-Razão Executivo Consolidado | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:407` | Listagem auditável com paginação e totais de comissões retidas. |
| Bloqueio de Auto-Liquidação sem Gateway/Operador | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts:184` | Rejeita payloads com `status: 'completed'` forjados pelo cliente. |
| Conciliação Bancária com Adquirentes Externos | 🟡 **Implementado parcialmente** | `src/app/components/os-windows/reconciliation-window.ts` | Interface de conciliação construída; integração de extrato OFX/EDI bancário em homologação. |
| Split Nativo Direto na Conta do Adquirente (Stripe Connect) | 🟡 **Implementado parcialmente** | `src/server/routes/payments.router.ts` | Arquitetura contábil segregada no Firestore; automação de payout de split bancário via transferências Stripe Connect planejada. |
