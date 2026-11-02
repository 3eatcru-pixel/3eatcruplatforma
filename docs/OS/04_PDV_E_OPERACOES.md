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
| PIX e cartão processados pelo sistema | PaymentEngine → /api/payments/process; PIX usa /api/payments/:id/confirm | PIX real usa a chave cadastrada no tenant e depende de confirmação manual; cartão real por adquirente fica bloqueado até integrar uma conta de pagamento por loja. O modo de simulação da plataforma mantém o pedido local. Teste sandbox interno pode criar transação somente para operador e pedido `pos-counter`, marcando o pedido como simulado e fora do financeiro real; vitrine pública e outros pedidos não aceitam sandbox. |
| PIX/cartão em terminal externo | Configurações da Loja → `externalPaymentTerminals` → PosTerminalComponent → CommerceEngine | Proprietário/operador cadastra perfis e métodos aceitos; o PDV seleciona um perfil ativo compatível. Depois de conferir aprovação no equipamento/aplicativo da loja, confirma o recebimento. O servidor valida tenant, perfil, método e papel e cria pedido, transação manual e financeiro atomicamente. Não há pareamento nem validação bancária/adquirente. |
| Sangria e suprimento | FinancialsService.addRecord → POST /api/financials | O PDV aguarda a resposta e apresenta erro se o lançamento falhar. |
| Leitor USB | Entrada de teclado no campo de busca e ação de bip | Não há integração direta com dispositivo além da entrada de teclado. |
| Pesagem | PosScaleModal recebe produto e peso informado pelo operador | É entrada manual; não há conexão serial com balança física. |
| Comprovante | PosReceiptModal → PosPrintService → janela de impressão do navegador | Não é NFC-e nem documento fiscal. O diálogo permite escolher a impressora instalada; o formato 58/80 mm e um teste são configurados localmente. Lançamentos externos identificam o terminal/método e avisam que a aprovação foi declarada manualmente pelo operador. |
| Identificação do terminal | EcosystemService.getOperationalContext fornece um ID lógico por loja | Não identifica nem valida um equipamento físico. |
| Busca de cliente | PosTerminalComponent consulta CrmService.customers | A busca depende de registros locais do eApp CRM; o PDV não carrega uma lista vinculada à loja e não grava a seleção no pedido. |

## Limites funcionais documentados

- O imposto exibido é calculado localmente como 10% e não substitui cálculo fiscal.
- O desconto é um percentual local; esta tela não aplica validação de margem ou aprovação gerencial.
- Preço de atacado e perfis especiais não são aplicados pelo servidor nesta tela; a opção foi removida para não exibir um preço diferente do preço autoritativo da venda.
- Vendas em espera permanecem na memória da página e não são persistidas.
- Ao trocar de loja ou modo de execução, o PDV limpa carrinho, cliente selecionado e vendas em espera para impedir mistura de contexto.
- O número mostrado no carrinho é uma sequência local da tela e pode reiniciar ao reabrir o PDV; use o ID do pedido para identificação persistente.
- Fechamento de turno/fechamento cego não está implementado nesta tela.
- Cartão e PIX são bloqueados sem conexão. Venda em dinheiro é registrada como pendente na fila e só é liquidada pelo servidor após a sincronização.
- A entrada de maquininha externa exige conexão, sessão real, proprietário/operador autorizado, perfil ativo da loja e confirmação explícita; uma chave idempotente evita duplicar pedido e venda em uma repetição de rede. A referência do comprovante é opcional e não deve conter dados do cartão.
- Sangria e suprimento exigem conexão; se a rede cair, o PDV não tenta registrar e informa ao operador.
- Sangria e suprimento exigem valor positivo e motivo preenchido. A identificação apresentada para o terminal é lógica, sem confirmação de hardware conectado.
- O selo “Navegador online” reflete `navigator.onLine`; não confirma que a API ou o adquirente estejam acessíveis.
- Recibos distinguem pedidos pendentes e registros de demonstração de vendas confirmadas. Aprovação em sandbox do PDV não representa cobrança real e o pedido permanece excluído de valores financeiros reais. Recebimentos de terminal externo são classificados como reais após confirmação manual do operador; o sistema não consegue verificar a aprovação no terminal.
- Fechar a janela de PIX só oculta o QR Code; não cancela o pedido ou a transação.

## Estado de homologação

`npm run lint`, `npm run build` e `git diff --check` passaram nesta alteração; os testes não foram executados. O fluxo de terminal externo grava a confirmação no servidor sem comunicação com o equipamento ou adquirente. A impressão usa uma janela do navegador e o sistema operacional para selecionar a impressora instalada. Esta validação de código não representa homologação com terminal, banco, impressora, balança fiscal ou adquirente real.
