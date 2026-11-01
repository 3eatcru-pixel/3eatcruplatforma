# Público — 02: Vitrine da loja e cardápio

Atualizado em 2026-11-01 por leitura estática. A rota de vitrine implementada é /p/:id, conforme src/app/app.routes.ts. A rota antiga /loja/:slug não está declarada no roteador atual.

## Catálogo público

A vitrine Angular usa o identificador da rota para selecionar a loja. O catálogo público é consultado por tenant e deve permanecer separado dos dados internos de custo, fornecedor e estoque do ERP.

- Interface: src/app/components/customer-storefront.ts.
- Catálogo público: GET /api/products/public.
- Pedido: rotas de /api/orders e regras do Commerce Engine.
- Pagamento: POST /api/payments/process; consulte Checkout e pagamentos para os limites de confirmação.

## Modalidades e valores

A interface possui seleção de modalidade e mesa. No checkout, deliveryFee é o valor fixo de entrega definido pela loja. Retirada não deve cobrar frete. O campo legado serviceFeePercent não é aplicado; a futura comissão de entregas da plataforma permanece em coming_soon.

O motor do servidor valida pedido, loja, disponibilidade dos produtos e valores conforme as regras atuais. A existência de componentes em eApps não comprova que KDS ou estoque estejam integrados como janelas do Store OS.

## Limites da vitrine

- A rota pública confirmada é /p/:id; não documentar /loja/:slug como rota atual.
- A proteção do catálogo precisa ser avaliada no endpoint público; o navegador não deve receber dados internos do ERP.
- A janela do KDS continua placeholder no desktop, conforme [Aplicativos e módulos](../OS/03_APLICATIVOS_E_MODULOS.md).
- Testes, build e homologação não foram executados nesta revisão.
