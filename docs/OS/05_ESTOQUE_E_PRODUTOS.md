# 🏬 Store OS — 05: Gestão de Produtos, Estoque, NFe e Movimentações

## 📌 1. Visão Geral do Módulo de Estoque e Catálogo

O **eApp Estoque ERP (`inventory-window.ts`)** é responsável pela gestão de catálogo, precificação com margem de lucro, controle de insumos e movimentações físico-financeiras. Ele combina o controle clássico de quantidade com ferramentas modernas de importação de NFe via XML, rastreamento de perdas e contagem cega de inventário.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        ESTRUTURA DE ESTOQUE ERP                        │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. CADASTRO BASE   │ 2. ENTRADAS & NFe  │ 3. SAÍDAS & AUDITORIA        │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ • Preço de Custo   │ • Importação XML   │ • Baixa Automática PDV/Online│
│ • Preço de Venda   │ • Cadastro Autom.  │ • Registro de Perdas/Quebras │
│ • Estoque Mínimo   │ • Atualização Custo│ • Contagem Cega de Estoque   │
│ • Categoria & NCM  │ • Pedido de Compra │ • Etiquetas de Gôndola (EAN) │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Manter o cadastro de itens da loja (Nome, Categoria, Preço de Custo, Preço de Venda, Unidade de Medida, Estoque Atual e Estoque Mínimo).
- Permitir a entrada automatizada de produtos a partir da importação de arquivos XML de Nota Fiscal Eletrônica (NF-e).
- Registrar perdas, quebras, validade vencida ou consumo interno com justificativa e impacto financeiro no DRE.
- Gerar etiquetas de gôndola com código de barras e precificação formatada.
- Alertar em tempo real quando o estoque de um item estiver abaixo da margem de segurança.
- Separar rigorosamente os dados confidenciais de custo do produto (que nunca devem vazar para o cliente ou para a vitrine pública).

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Modelo de Dados do Produto (`ProductItem`):**
  Definido em `src/shared/models/ecosystem.model.ts:40`:
  ```typescript
  export interface ProductItem {
    id: string;
    tenantId: string;
    name: string;
    category: string;
    price: number;
    costPrice?: number;
    wholesalePrice?: number;
    stock: number;
    minStock?: number;
    sku?: string;
    barcode?: string;
    ncm?: string;
    unit?: string;
    availableOnline?: boolean;
    imageUrl?: string;
  }
  ```
- **Componentes do Store OS:**
  - `src/app/components/os-windows/inventory-window.ts`: Janela mestre com abas de produtos, stats e ferramentas.
  - `src/app/components/os-windows/inventory/inventory-table.ts`: Listagem com filtros, ordenação e status de estoque (crítico, baixo, adequado).
  - `src/app/components/os-windows/inventory/inventory-product-modal.ts`: Modal para inclusão e edição rápida.
  - `src/app/components/os-windows/inventory/inventory-nfe-modal.ts`: Leitor de XML de NFe para importação de notas fiscais de entrada.
  - `src/app/components/os-windows/inventory/inventory-loss-modal.ts`: Lançamento de perdas operacionais.
  - `src/app/components/os-windows/inventory/inventory-promotions.ts`: Gestão de promoções temporárias.
  - `src/app/components/os-windows/inventory/inventory-labels.ts`: Gerador de etiquetas prontas para impressão térmica de gôndola.
  - `src/app/components/os-windows/stock-audit-window.ts`: eApp autônomo de conferência cega de estoque.
- **Roteamento Backend:**
  - `src/server/routes/products.router.ts`:
    - `GET /api/products`: Restrito a operadores do tenant. Retorna dados completos (incluindo `costPrice`, fornecedor e estoque exato).
    - `GET /api/products/public`: Aberto ao consumidor via Marketplace. Utiliza o helper `toPublicProduct` para expurgar `costPrice`, fornecedor e margem de lucro.
    - `POST /api/products`: Criação com validação de `tenantId`.
    - `PATCH /api/products/:id`: Atualização cadastral.
    - `DELETE /api/products/:id`: Remoção de itens obsoletos.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Operador logado como gestor ou operador de estoque da loja.
- **Baixa Transacional na Venda:**
  - Quando um pedido é processado via PDV ou Storefront, o motor transacional `executeCommercialOrder` lê o documento em `/products/{id}`, subtrai a quantidade e salva atomicamente. Se a quantidade for insuficiente, bloqueia a venda e retorna `409 STOCK_CONFLICT`.
- **Impacto no Financeiro:**
  - O lançamento de perda (`inventory-loss-modal.ts`) dispara uma despesa na rota `/api/financials` categorizada como `'loss'`, impactando o resultado do DRE no mesmo instante.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/commerce_war_tests.spec.ts` (Guerra 1 - Concorrência de Estoque): Validação de que dois pedidos disputando o último estoque são resolvidos atomicamente sem estoque negativo.
  - `src/server/security_phase1.spec.ts`: Confirmação de que produtos marcados com `availableOnline: false` geram erro `422 PRODUCT_UNAVAILABLE_ONLINE` se o cliente tentar comprar via marketplace.
- **Resultado:** 100% de testes aprovados.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso de Estoque / Produtos | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Cadastro Completo de Produtos (SKU, NCM, Preço) | 🟢 **Implementado e comprovado** | `src/server/routes/products.router.ts:88` | Persistido no Firestore `/products/{id}`. |
| Baixa Atômica em Transação ACID | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:250` | Evita vendas fantasmas com detecção de concorrência. |
| Sanitização de Preço de Custo na Vitrine Pública | 🟢 **Implementado e comprovado** | `src/server/middleware/auth.middleware.ts:133` | Função `toPublicProduct` protege a margem da loja. |
| Lançamento de Perdas e Quebras | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/inventory/inventory-loss-modal.ts` | Lança despesa no financeiro e subtrai do estoque. |
| Geração e Impressão de Etiquetas de Gôndola | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/inventory/inventory-labels.ts` | Layout para código de barras EAN-13 pronto para impressora térmica. |
| Leitor de XML de NF-e para Entrada de Mercadorias | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/inventory/inventory-nfe-modal.ts` | Parser local de XML com extração de itens e quantidades. |
| Ficha Técnica de Receitas (Baixa de Insumos/Matéria-prima) | 🟡 **Implementado parcialmente** | `src/app/models/ecosystem.model.ts` | Produtos compostos suportados no modelo; tela de montagem detalhada de receitas planejada. |
| Inventário Cego com Coletor de Dados | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/stock-audit-window.ts` | Operador conta itens sem ver saldo prévio e emite divergências. |
