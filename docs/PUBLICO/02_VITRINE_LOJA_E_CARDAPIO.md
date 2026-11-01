# 🛍️ Público & Marketplace — 02: Vitrine Pública da Loja, Cardápio e Sanitização de Dados

## 📌 1. Visão Geral da Vitrine Digital (`/loja/:slug`)

A **Vitrine Pública do Estabelecimento (`customer-storefront.ts`)** é a página oficial de autoatendimento da loja na internet. Ela permite ao consumidor navegar pelos produtos e pratos, consultar horários, selecionar modalidades de pedido e fechar a compra com transparência total de preços e taxas.

```text
               CATÁLOGO MASTER NO FIRESTORE (Coleção Privada /products)
               - ID, Nome, Categoria, Preço de Venda (R$ 45,00)
               - 🔒 Preço de Custo (R$ 18,20)       <-- DADO CONFIDENCIAL DO LOJISTA
               - 🔒 Fornecedor (ID fornecedor X)    <-- DADO CONFIDENCIAL DO LOJISTA
               - 🔒 Estoque Real (342 unidades)     <-- DADO CONFIDENCIAL DO LOJISTA
                                       │
                                       ▼
                   MIDDLEWARE SANITIZADOR (toPublicProduct)
                   - Remove campos sigilosos
                   - Filtra apenas availableOnline == true
                                       │
                                       ▼
               CATÁLOGO HIGIENIZADO NA VITRINE PÚBLICA (/api/products/public)
               - Nome, Imagem, Descrição, Preço de Venda (R$ 45,00)
               - Disponibilidade em estoque (Disponível / Esgotado)
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Exibir os produtos organizados por categorias gastronômicas ou comerciais (Pratos Principais, Bebidas, Sobremesas, Combos).
- Suportar três modalidades operacionais de compra:
  1. **Delivery:** Entrega no endereço informado, aplicando taxa de frete (`deliveryFee`) e validando pedido mínimo (`minOrderValue`).
  2. **Retirada no Balcão (Takeout):** Cliente busca na loja. **Não pode cobrar frete (`deliveryFee === 0`)**.
  3. **Comer no Local / Mesa:** Cliente faz pedido presencial com número de mesa associado.
- Exibir aviso destacado caso a loja esteja fechada (`isOpen === false`), bloqueando adições ao carrinho com aviso sonoro e visual.
- Garantir que nenhum cliente consiga visualizar preços de atacado ou margens de lucro dos pratos.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componente Angular:** `src/app/components/customer-storefront.ts`.
  - Formulário reativo para coleta de dados de entrega e modalidade de pedido:
    ```typescript
    checkoutForm = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(3)]],
      customerPhone: ['', [Validators.required]],
      orderType: ['delivery', [Validators.required]],
      deliveryAddress: [''],
      paymentMethod: ['pix', [Validators.required]],
      observations: ['']
    });
    ```
  - Banner dinâmico de loja fechada: Linhas 76-91 em `customer-storefront.ts`, informando que o estabelecimento está operando em modo presencial local.
- **Higienização de Dados no Backend (`src/server/middleware/auth.middleware.ts:133`):**
  - Função `toPublicProduct(p: ProductItem)`:
    ```typescript
    export function toPublicProduct(p: ProductItem): PublicCatalogProduct {
      return {
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        category: p.category,
        price: p.price,
        unit: p.unit || 'un',
        inStock: p.stock > 0,
        imageUrl: p.imageUrl,
        barcode: p.barcode
      };
    }
    ```
    Os campos `costPrice`, `wholesalePrice`, `supplierId` e a contagem exata de estoque são rigorosamente expurgados do objeto antes do envio ao navegador.
- **Roteamento Backend:**
  - `GET /api/products/public?tenantId=:id`: Retorna exclusivamente o catálogo sanitizado.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Requisição pública ao carregar `/loja/:slug`.
- **Cálculo da Taxa de Entrega:**
  - Se o usuário seleciona `'takeout'`, o frontend zera a taxa de frete:
    ```typescript
    finalDeliveryFee = computed(() => this.selectedOrderType() === 'delivery' ? this.activeStore().deliveryFee : 0);
    ```
  - No backend, a transação `executeCommercialOrder` valida se `orderType === 'takeout'` possui `deliveryFee === 0`. Tentativa de cobrança forjada de frete é corrigida pelo motor de vendas.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Suíte de Segurança (`src/server/security_phase1.spec.ts`):**
  - **Cenário de Sanitização:** Verificação de que requisições públicas a `/api/products/public` não contêm os campos `costPrice` ou `wholesalePrice`.
  - **Cenário de Loja Fechada:** Tentativa de envio de pedido para loja com `isOpen: false` é rejeitada pelo backend com HTTP 422 `STORE_CLOSED`.
  - **Cenário de Retirada sem Frete:** Validação de que pedidos de retirada (`takeout`) preservam `tax === 0` e `deliveryFee === 0`.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso da Vitrine Pública | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Sanitização de Custo e Margem (`toPublicProduct`) | 🟢 **Implementado e comprovado** | `src/server/middleware/auth.middleware.ts:133` | Impede vazamento de dados de custo e fornecedores. |
| Modalidade Retirada no Balcão Sem Frete | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:208` | Zera taxa de frete no cálculo oficial do pedido. |
| Modalidade Delivery com Taxa e Raio | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts:153` | Aplica taxa parametrizada da loja. |
| Bloqueio Automático em Lojas Fechadas | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:221` | Responde com HTTP 422 `STORE_CLOSED`. |
| Carrinho Reativo com Observações por Item | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts:380` | Permite adicionar notas (ex: "Sem cebola, bem passado"). |
| Banner de Comunicados da Loja | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts:94` | Lojista edita no Store OS e reflete na vitrine pública. |
| Botão de Contato Direto via WhatsApp | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts:187` | Gera link `api.whatsapp.com/send` com telefone da loja. |
| Variações Complexas de Prato (Combos e Adicionais) | 🟡 **Implementado parcialmente** | `src/app/components/customer-storefront.ts` | Observações e notas suportadas; configurador de adicionais múltiplos em desenvolvimento. |
