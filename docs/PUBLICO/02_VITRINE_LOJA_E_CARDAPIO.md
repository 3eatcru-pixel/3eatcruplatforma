# Público — 02: Vitrine da loja e cardápio

Atualizado em 2026-11-01 após auditoria do fluxo público. A rota publicada é `/p/:id`, conforme `src/app/app.routes.ts`. A rota antiga `/loja/:slug` não está declarada.

## Contratos públicos

- Interface: `src/app/components/customer-storefront.ts`.
- Loja: `GET /api/tenants/public`; a tela só seleciona a loja ativa cujo identificador corresponde à rota. Falha ou ausência da loja exibe indisponibilidade e impede checkout.
- Catálogo: `GET /api/products/public?tenantId=:id`, separado dos dados internos de custo, fornecedor e estoque.
- Pedido: `POST /api/orders/channels/:channel` e validações do Commerce Engine.
- Pagamento: `POST /api/payments/process`; veja [Checkout e pagamentos](./04_CHECKOUT_PAGAMENTO_E_PIX.md).

O servidor projeta apenas campos permitidos para a vitrine. Não publica CNPJ, nome legal, telefone privado, chave PIX, equipe, limite de dispositivos nem valores internos do ERP. A descrição `aboutText` é escrita pelo lojista em Minha Loja e publicada como conteúdo público. WhatsApp e produtos em destaque são opcionais e só são expostos quando cadastrados como informações públicas.

## Disponibilidade e valores

Horário, localização, taxa, pedido mínimo e estado de abertura não recebem valores fictícios quando faltam no cadastro. Lojas novas começam sem horário, taxa ou pedido mínimo configurados; a entrega fica desativada até a loja habilitá-la e definir uma taxa. A vitrine informa quando esses dados são desconhecidos. A descrição opcional aparece abaixo do nome e da categoria. Para pedidos, o status precisa estar explicitamente aberto. O endereço do cliente é textual; o aplicativo não geocodifica esse endereço nem atribui ao pedido coordenadas do GPS do consumidor.

O cliente paga somente a parcela de entrega definida pela loja. O complemento que a loja combina pagar ao próprio entregador não entra no total do cliente nem é exposto na vitrine. Retirada não cobra frete. O campo legado `serviceFeePercent` é ignorado. Os 8% da rede de entregadores da plataforma não se aplicam aos pedidos nem aos motoristas da loja; a rede e sua comissão estão em `coming_soon`.

PIX é direcionado à chave da loja e a confirmação é manual. Dinheiro pode ser selecionado para pagamento no recebimento. Modalidades desativadas pela loja não permitem concluir pedidos. Cartão não está disponível até cada loja conectar sua própria conta de pagamento. O HQ recebe a assinatura do lojista, não o valor da venda.

## Limites verificados

- KDS e estoque têm telas integradas no Store OS, mas isso não comprova homologação operacional ou hardware físico. Consulte [Aplicativos e módulos](../OS/03_APLICATIVOS_E_MODULOS.md).
- A suíte e o build local não equivalem a teste ponta a ponta nem homologação do catálogo e checkout com dados reais.
