# 🏬 Store OS — 04: PDV, Frente de Caixa, Vendas e Fechamento

## 📌 1. Visão Geral da Frente de Caixa (PDV)

O **eApp PDV Balcão (`pos-window.ts` e `/pos`)** é o núcleo operacional de alta rotatividade do Store OS. Projetado para suportar operações ágeis com teclado, leitor de código de barras ou telas touchscreen, o módulo gerencia o ciclo financeiro do caixa físico (abertura com fundo de troco, suprimentos, sangrias de segurança e fechamento cego de turno).

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CICLO DO CAIXA FÍSICO (PDV)                     │
├────────────────────────────────────────────────────────────────────────┤
│  1. ABERTURA DE CAIXA: Informa Fundo de Troco inicial (ex: R$ 150,00)  │
│  2. VENDAS CONTÍNUAS: Leitura de código de barras, peso em balança,    │
│     adicionais de itens, cupons de desconto e seleção de pagamento     │
│  3. SUPRIMENTO & SANGRIA: Retiradas de segurança para o cofre          │
│  4. FECHAMENTO CEGO: Operador conta o dinheiro físico sem ver o saldo  │
│     do sistema -> Sistema aponta sobras ou quebras de caixa            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir a montagem ultrarrápida do carrinho de compras com busca por texto, clique em grade de categorias ou bipe de leitor de código de barras.
- Suportar itens com pesagem dinâmica integrando balanças de checkout (kg e gramas).
- Aplicar descontos monetários ou percentuais com validação de margem mínima.
- Permitir múltiplos meios de pagamento na mesma venda (dinheiro físico com cálculo de troco, cartão de crédito/débito via maquininha e Pix dinâmico com QR Code na tela).
- Executar fechamento cego de caixa (onde o operador digita os valores contados fisicamente e o sistema calcula divergências).

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componente Principal:** `src/app/components/os-windows/pos-window.ts` (ou `/pos` standalone).
- **Submódulos Especializados do PDV:**
  - `src/app/components/os-windows/pos/pos-cart.ts`: Gestão do carrinho com controle de quantidade e notas por item.
  - `src/app/components/os-windows/pos/pos-grid.ts`: Grade visual de produtos categorizados.
  - `src/app/components/os-windows/pos/pos-cash-op-modal.ts`: Modal para Sangria, Suprimento e Fechamento Cego de Caixa.
  - `src/app/components/os-windows/pos/pos-discount-modal.ts`: Aplicação de descontos.
  - `src/app/components/os-windows/pos/pos-scale-modal.ts`: Simulação e integração com balança de pesagem.
  - `src/app/components/os-windows/pos/pos-scanner.ts`: Interface com leitor de código de barras.
  - `src/app/components/os-windows/pos/pos-receipt-modal.ts`: Visualização e impressão de cupom não fiscal (tamanho 80mm/58mm).
- **Backend Transacional:** `src/server/core/commerce.engine.ts: executeCommercialOrder` montado sob `POST /api/orders` com canal forçado `'POS'`.
- **Validação de Dinheiro Físico no Servidor:**
  - Se a venda for paga em dinheiro no PDV, o backend exige `cashConfirmedByOperator: true` vindo de operador autenticado, gerando imediatamente a baixa no estoque e o registro de entrada contábil em `/financials`.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Operador no terminal autenticado como `tenant_owner` ou `operator`.
- **Baixa Imediata de Estoque:** Ao liquidar a venda no PDV, a transação atômica do Firestore debita a quantidade vendida de `/products/{productId}` e verifica se o estoque não ficou negativo (`stockQty < 0` => aborta com `409 STOCK_CONFLICT`).
- **Comunicação com KDS:** Se o item for configurado para preparo na cozinha, o pedido é instantaneamente publicado em `/orders/{orderId}` com `status: 'preparing'`, aparecendo no monitor da cozinha sem qualquer atraso.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/commerce_war_tests.spec.ts`:
    - **Guerra 1:** Disputa simultânea do último item de estoque entre duas vendas de PDV simultâneas (uma tem sucesso e a outra recebe `409 STOCK_CONFLICT`).
    - **Guerra 4:** Idempotência tripla da venda garantindo que o duplo clique do operador no botão "Finalizar Venda" não cobre duas vezes nem gere dois lançamentos de caixa.
  - `src/server/security_phase1.spec.ts`: Confirmação de que usuário sem perfil de operador é bloqueado no PDV.
- **Resultado:** 100% de testes aprovados.

---

## 📊 3. Matriz de Classificação de Maturidade

| Operação de Caixa / PDV | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Venda Direta de Balcão (Canal POS) | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:217` | Baixa atômica de estoque e geração de cupom. |
| Pagamento em Dinheiro com Cálculo de Troco | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-cart.ts` | Exige confirmação de operador autenticado no backend. |
| Pagamento com Pix Instantâneo no Caixa | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts:24` | QR Code gerado na hora com conciliação via API. |
| Sangria e Suprimento de Caixa | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-cash-op-modal.ts` | Lança despesa/receita com categoria `operational` no DRE. |
| Fechamento Cego de Turno | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-cash-op-modal.ts` | Operador informa valor apurado; relatório acusa sobra/falta. |
| Integração com Balança de Checkout (Protocolo Toledo/Filizola) | 🟡 **Implementado parcialmente** | `src/app/components/os-windows/pos/pos-scale-modal.ts` | Modal interativo de tara e pesagem implementado; leitura de porta serial via Web Serial API mapeada. |
| Leitura de Código de Barras (EAN-13) | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-scanner.ts` | Captura eventos de leitor USB e busca produto instantaneamente. |
| Impressão Térmica ESC/POS de Cupom Não Fiscal | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-receipt-modal.ts` | Formatação nativa CSS para bobina de 80mm e 58mm. |
