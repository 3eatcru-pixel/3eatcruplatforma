# 🏬 Store OS — 06: Módulo Financeiro, DRE e Fluxo de Caixa da Loja

## 📌 1. Visão Geral da Tesouraria e DRE

O **eApp Financeiro & Caixa (`finance-window.ts`)** do Store OS fornece controle contábil e gerencial em tempo real para a gestão do estabelecimento. Ele engloba o fluxo de caixa diário (recebimentos de vendas e sangrias), controle de contas a pagar (fornecedores, aluguel, luz e pessoal) e a geração automática do **DRE Gerencial (Demonstrativo do Resultado do Exercício)**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FLUXO FINANCEIRO DA LOJA                        │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. ENTRADAS        │ 2. SAÍDAS          │ 3. DRE GERENCIAL             │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ • Vendas no PDV    │ • Sangrias de Caixa│ • Receita Operacional Bruta  │
│ • Vendas Delivery  │ • Pagto Fornecedor │ • (-) Deduções & Comissões   │
│ • Comandas de Mesa │ • Custos de Insumo │ • (=) Receita Líquida        │
│ • Suprimentos Caixa│ • Despesas Fixas   │ • (-) CMV & Despesas Operac. │
│                    │ • Perdas/Avarias   │ • (=) LUCRO LÍQUIDO DO MÊS   │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Consolidar automaticamente cada venda aprovada (em dinheiro, cartão ou Pix) como uma receita operacional do tenant.
- Permitir o lançamento de despesas avulsas (compra de insumos, manutenção de equipamentos, contas públicas).
- Exibir indicadores de liquidez, ticket médio, margem de contribuição e faturamento mensal.
- Bloquear sumariamente colaboradores operacionais sem permissão de gestão (ex: garçons) de visualizarem receitas e lucros da loja.
- Integrar com a conciliação de taxas de maquininhas de cartão.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Modelo de Registro Financeiro (`FinancialRecord`):**
  Definido em `src/shared/models/ecosystem.model.ts:65`:
  ```typescript
  export interface FinancialRecord {
    id: string;
    tenantId: string;
    type: 'income' | 'expense';
    amount: number;
    category: 'sale' | 'supplier' | 'payroll' | 'rent' | 'tax' | 'operational' | 'loss';
    description: string;
    date: string;
    paymentMethod: 'cash' | 'credit' | 'debit' | 'pix' | 'transfer';
    orderId?: string;
  }
  ```
- **Componentes do Store OS:**
  - `src/app/components/os-windows/finance-window.ts`: Janela mestre com abas de DRE, livro-razão e métricas.
  - `src/app/components/os-windows/finance/finance-dre.ts`: Demonstração analítica estruturada com cálculo de margens.
  - `src/app/components/os-windows/finance/finance-ledger.ts`: Tabela cronológica de lançamentos com status de conciliação.
  - `src/app/components/os-windows/finance/finance-metrics.ts`: Gráficos e indicadores de saúde financeira.
  - `src/app/components/os-windows/finance/add-financial-entry-modal.ts`: Modal para inserção rápida de receitas ou despesas.
  - `src/app/components/os-windows/reconciliation-window.ts`: Conciliação de recebíveis de cartão e bandeiras.
- **Roteamento Backend:**
  - `src/server/routes/financials.router.ts`:
    - `GET /api/financials`: Restrito a `tenant_owner`, `operator` ou `hq_admin`. **Garçons recebem 403 Forbidden**.
    - `POST /api/financials`: Criação de lançamento avulso. Se o payload tentar criar `category: 'sale'` sem passar pela transação comercial autoritativa, o servidor **bloqueia com HTTP 400** para impedir vendas fictícias.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Lançamentos automáticos gerados pelo fechamento de pedidos no `CommerceEngine` ou lançamentos manuais de despesas pelo gestor.
- **Relação com o HQ Central:**
  - Em cada venda de delivery online, o backend separa a comissão do SaaS (8%) e credita no livro do lojista o montante líquido de 92%.
  - O HQ Central enxerga os totais consolidados no ledger global, mas não altera os lançamentos individuais de contas a pagar da loja.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/security_phase1.spec.ts`:
    - Validação de que usuário com papel `waiter` recebe `403 Forbidden` ao tentar chamar `GET /api/financials`.
    - Validação de que tentativa de injetar `category: 'sale'` manualmente via `POST /api/financials` é rejeitada com HTTP 400.
  - `src/server/commerce_war_tests.spec.ts` (Guerra 3): Validação de que vendas aprovadas geram um único registro `fin-sale-*` sem duplicidade.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso Financeiro | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Geração Automática de Receita por Venda | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:600` | Cria registro `fin-sale-${orderId}` na liquidação. |
| Bloqueio de Vendas Fictícias no Financeiro | 🟢 **Implementado e comprovado** | `src/server/routes/financials.router.ts:85` | Impede operador de burlar o PDV inserindo vendas avulsas. |
| Bloqueio de Acesso para Garçons (`403`) | 🟢 **Implementado e comprovado** | `src/server/routes/financials.router.ts:25` | Protege a confidencialidade do faturamento da empresa. |
| Demonstração do Resultado (DRE Gerencial) | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/finance/finance-dre.ts` | Consolida Receita Bruta, Deduções, CMV e Lucro Líquido. |
| Lançamento de Despesas Operacionais | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/finance/add-financial-entry-modal.ts` | Categorização por plano de contas (fornecedores, aluguel, etc). |
| Conciliação de Vendas em Cartão / Maquininhas | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/reconciliation-window.ts` | Compara valor esperado com recebíveis de adquirentes. |
| Integração Bancária Direta via Open Finance / OFX | 🔵 **Planejado, ainda não implementado** | `docs/00_ARQUITETURA_GERAL.md` | Importação automática de extratos bancários em planejamento. |
