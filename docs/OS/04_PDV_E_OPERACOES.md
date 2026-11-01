# Store OS — 04: PDV e operações de venda

## Entrada e componentes

A rota protegida /pos carrega src/app/components/pos-terminal.ts. O desktop /os abre essa rota pelo atalho PDV. Os componentes da tela ficam em src/app/components/eapps/pos/:

- pos-scanner.ts: entrada de código, busca, perfil e atalhos.
- pos-grid.ts: catálogo e seleção de categoria.
- pos-cart.ts: carrinho, identificação do consumidor e meios de pagamento.
- pos-cash-op-modal.ts: formulário de sangria e suprimento.
- pos-scale-modal.ts: entrada manual de produto e peso.
- pos-discount-modal.ts: percentual de desconto.
- pos-recall-modal.ts: vendas em espera mantidas na memória da tela.
- pos-receipt-modal.ts: comprovante não fiscal e impressão pelo navegador.

## Fluxos conectados

| Operação | Caminho encontrado | Limite conhecido |
|---|---|---|
| Carregar produtos | InventoryService.fetchProducts → GET /api/products | Exige tenant ativo e resposta do servidor no modo real. A lista não começa com fixtures de demonstração. |
| Venda em dinheiro | PosTerminalComponent.checkout → EcosystemService.addOrder → CommerceEngine | Envia cashConfirmedByOperator para confirmação do operador; liquidação e estoque são responsabilidade do servidor. |
| Cartão e PIX | PaymentEngine → /api/payments/process; PIX usa /api/payments/:id/confirm | A autorização real depende de credenciais do adquirente. Em sandbox, aprovação não equivale a liquidação em produção. |
| Sangria e suprimento | FinancialsService.addRecord → POST /api/financials | O PDV aguarda a resposta e apresenta erro se o lançamento falhar. |
| Leitor USB | Entrada de teclado no campo de busca e ação de bip | Não há integração direta com dispositivo além da entrada de teclado. |
| Pesagem | PosScaleModal recebe produto e peso informado pelo operador | É entrada manual; não há conexão serial com balança física. |
| Comprovante | PosReceiptModal chama window.print | Não é NFC-e nem documento fiscal. |

## Limites funcionais documentados

- O imposto exibido é calculado localmente como 10% e não substitui cálculo fiscal.
- O desconto é um percentual local; esta tela não aplica validação de margem ou aprovação gerencial.
- Preço de atacado e perfis especiais não são aplicados pelo servidor nesta tela; a opção foi removida para não exibir um preço diferente do preço autoritativo da venda.
- Vendas em espera permanecem na memória da página e não são persistidas.
- Fechamento de turno/fechamento cego não está implementado nesta tela.
- Cartão e PIX são bloqueados sem conexão. Venda em dinheiro é registrada como pendente na fila e só é liquidada pelo servidor após a sincronização.
- Sangria e suprimento exigem conexão; se a rede cair, o PDV não tenta registrar e informa ao operador.

## Estado de homologação

O código do PDV e suas dependências locais foram corrigidos nesta revisão. Build, testes automatizados e homologação com hardware/adquirentes não foram executados nesta etapa; este documento não os declara aprovados.
