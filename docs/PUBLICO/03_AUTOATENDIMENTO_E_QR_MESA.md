# Público — 03: Pedido no salão e QR de mesa

Atualizado em 2026-11-01 por leitura estática. Esta página separa a modalidade de pedido no local de uma integração de QR físico ou totem.

## O que existe

A vitrine pública em /p/:id permite selecionar modalidades de pedido e, na modalidade no local, escolher uma mesa na interface. O componente envia os dados do pedido ao backend. O motor comercial possui lógica para pedidos de mesa e para atualizar dados de operação conforme o contrato.

## O que ainda não está comprovado

- A rota não lê um número de mesa diretamente de um parâmetro QR confirmado nesta auditoria. Não anunciar links /loja/slug?mesa=4 nem associação automática de QR.
- Não foi localizada uma interface operacional de totem físico.
- O KDS possui eApp integrado para consultar pedidos e avançar o preparo até `ready`, e Mesas/Agenda oferecem operação de salão e reservas; não há validação de estação física, hardware de cozinha nem QR físico.
- A rota /waiter é uma interface web separada; ela não transforma o atalho KDS em eApp integrado.
- A geração de pedido e a liquidação do pagamento são etapas distintas. Ver [Checkout e pagamentos](./04_CHECKOUT_PAGAMENTO_E_PIX.md).

## Validação

O build de produção passou e a suíte geral passou com 94/94 testes. Não houve homologação de QR físico ou totem nem teste ponta a ponta do pedido de mesa nesta revisão.
