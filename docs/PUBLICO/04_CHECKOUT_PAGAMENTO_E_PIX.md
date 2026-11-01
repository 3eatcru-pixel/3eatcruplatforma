# 🛍️ Público & Marketplace — 04: Checkout, Meios de Pagamento, Pix Dinâmico e Segurança

## 📌 1. Visão Geral da Camada de Pagamentos Públicos

O checkout do ecossistema 3EATCRU foi projetado para oferecer a menor fricção possível para o cliente final, garantindo ao mesmo tempo proteção total contra fraudes de auto-liquidação. O sistema oferece suporte nativo a **Pix Dinâmico com QR Code em tela e chave Copia-e-Cola**, **Cartão de Crédito/Débito via Gateway Stripe** e **Dinheiro físico com cálculo de troco**.

```text
                                CLIENTE NO CHECKOUT ONLINE
                               (Seleciona PIX ou CARTÃO)
                                           │
                                           ▼
                             POST /api/payments/intent
                             - Registra intenção de pagamento
                             - Gera payment_transactions/{txId}
                             - Status inicial: 'pending_pix' ou 'requires_payment'
                                           │
                                           ▼
                             🌐 CLIENTE EFETUA O PAGAMENTO
                                           │
                                           ▼
                        WEBHOOK ADQUIRENTE / POST /confirm
                        - Validação autoritativa do servidor
                        - Marca transação como 'approved'
                                           │
                                           ▼
                        COMMERCE ENGINE: LIQUIDAÇÃO ACID
                        - Status do Pedido: 'completed' ou 'preparing'
                        - Geração de Entrada: /financials/fin-sale-{orderId}
                        - O caixa e os pagamentos do lojista permanecem no fluxo financeiro do Store OS; a comissão da plataforma está em breve
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que o cliente pague instantaneamente via Pix em qualquer banco (Nubank, Itaú, Bradesco, Inter, etc.) com cópia facilitada do código BR Code.
- Suportar pagamento online com cartão de crédito com tokenização segura sem expor os dados do cartão ao servidor do lojista (padrão PCI-DSS).
- Impedir que um cliente forje a resposta do gateway e marque seu próprio pedido como "Pago" sem ter transferido o dinheiro.
- Manter o caixa do lojista independente. A futura comissão da rede da plataforma não está ativa nem é calculada ou deduzida pela liquidação de venda do Store OS.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Roteador de Pagamentos (`src/server/routes/payments.router.ts`):**
  - `POST /api/payments/intent`: Cria a transação em `/payment_transactions/{txId}`.
    - Se o método for `'pix'`, gera o payload EMV com CRC16 válido e chave Pix configurada da loja ou plataforma, retornando `qrCodeDataUrl` e `pixCopiaECola`.
    - O status é registrado estritamente como `'pending_pix'`.
  - `POST /api/payments/:id/confirm`: Confirmação segura de liquidação.
  - **Barreira Anti-Fraude P0 (`payments.router.ts:184`):**
    - Se o cliente tentar enviar um payload contendo `status: 'completed'` diretamente, o servidor rejeita a liquidação imediata:
      ```typescript
      // PROD-SEC: Um cliente comum NÃO pode marcar seu pedido como pago enviando status: 'completed'
      if (!isOperator && body.status === 'completed' && !hasVerifiedTx) {
        res.status(403).json({
          error: 'Liquidação de pagamento não autorizada sem confirmação do adquirente ou operador.',
          code: 'UNAUTHORIZED_PAYMENT_SETTLEMENT'
        });
        return;
      }
      ```
- **Interface do Consumidor (`src/app/components/customer-storefront.ts`):**
  - Modal dinâmico de Pix com cronômetro de expiração (15 minutos), imagem do QR Code e botão "Copiar Chave Pix".
  - Polling reativo verificando a confirmação do pagamento no backend a cada 3 segundos.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** `submitOrder()` dispara `POST /api/orders` e subsequentemente `POST /api/payments/intent`.
- **Comunicação com o Lojista:**
  - Assim que o pagamento é aprovado, o Store OS recebe o evento via Firestore snapshot, tocando o aviso sonoro de "Novo Pedido Pago" no caixa e imprimindo a comanda na cozinha.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/security_phase1.spec.ts`:
    - Validação de que tentativa de auto-liquidação com payload forjado retorna `403 UNAUTHORIZED_PAYMENT_SETTLEMENT`.
    - Validação do fluxo completo de Pix: Geração em `pending_pix` -> Confirmação autoritativa -> Liquidação de pedido e criação de `fin-sale-*`.
  - `src/server/commerce_war_tests.spec.ts` (Guerra 3):
    - Validação de liquidação contábil única sem duplicidade de entradas financeiras.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso de Pagamento Público | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Geração de Pix Dinâmico (QR Code & Copia-e-Cola) | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts:24` | Gera código BR Code em conformidade com o Banco Central. |
| Barreira Anti-Fraude de Auto-Liquidação | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts:184` | Impede cliente de forjar status `completed` no pedido. |
| Liquidação Atômica no Livro-Caixa (`fin-sale-*`) | 🟢 **Implementado** | `src/server/core/commerce.engine.ts` | Cria o registro da venda do tenant. Não aplica comissão da plataforma nem cria split. |
| Checkout Cartão com Gateway Stripe | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts:110` | Utiliza Stripe Payment Intent em modo seguro. |
| Modo Sandbox / Simulação para Testes | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts:140` | Opera em simulação automática na ausência de chaves de produção. |
| Webhooks Oficiais de Adquirentes (Mercado Pago / Asaas / EFI) | 🟡 **Implementado parcialmente** | `src/server/routes/payments.router.ts` | Endpoint de recepção ativo; conectores nativos específicos de cada banco em homologação. |
