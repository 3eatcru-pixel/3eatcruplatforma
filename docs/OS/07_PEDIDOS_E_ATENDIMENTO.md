# Store OS — 07: Pedidos, mesas e atendimento

## Domínios e interfaces encontrados

| Domínio | Implementação | Estado de interface |
|---|---|---|
| Pedidos | OrdersService e src/server/routes/orders.router.ts | API e serviço presentes; janela de histórico/KDS no desktop ausente. |
| Mesas | TablesService e src/server/routes/tables.router.ts | API e serviço presentes; mapa de salão no desktop ausente. |
| Reservas | AppointmentsService e src/server/routes/reservations.router.ts | API e serviço presentes; janela de reservas no desktop ausente. |
| App Garçom | src/app/components/waiter-app.ts, rota /waiter | Aplicação standalone, não uma janela de gestão do Store OS. |
| KDS | Pedidos e transições no domínio comercial | O registro contém o ID kds, mas não foi encontrada tela KDS integrada. |

O pedido passa pelo servidor e pelo CommerceEngine para validar as regras comerciais e o estoque. A disponibilidade de endpoint não comprova que exista monitor visual para a cozinha ou mapa de salão.

## Limites documentados

- Os IDs tables, agenda, history e kds exibem placeholder dentro do desktop.
- A tela do garçom é uma aplicação separada em /waiter.
- Não declarar sincronização visual em tempo real no desktop enquanto não houver componente de janela conectado e homologado.

## Validação

Estado alinhado por leitura estática das rotas, serviços e catálogo do desktop. Testes automatizados e homologação em restaurante não foram executados nesta revisão.
