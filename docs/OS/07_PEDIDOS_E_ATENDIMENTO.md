# Store OS — 07: Pedidos, mesas e atendimento

## Domínios e interfaces encontrados

| Domínio | Implementação | Estado de interface |
|---|---|---|
| Pedidos | OrdersService e src/server/routes/orders.router.ts | API e serviço presentes; janela de histórico/KDS no desktop ausente. No modo simulado, as mudanças ficam em memória local. |
| Mesas | TablesService e src/server/routes/tables.router.ts | API e serviço presentes; mapa de salão no desktop ausente. O modo simulado fornece quatro mesas locais para demonstração. |
| Reservas | AppointmentsService e src/server/routes/reservations.router.ts | API e serviço presentes; janela de reservas no desktop ausente. Transições simuladas atualizam localmente a mesa associada. |
| App Garçom | src/app/components/waiter-app.ts, rota /waiter | Aplicação standalone, não uma janela de gestão do Store OS. No modo simulado usa mesas e pedidos locais. |
| KDS | Pedidos e transições no domínio comercial | O registro contém o ID kds, mas não foi encontrada tela KDS integrada. |

O pedido passa pelo servidor e pelo CommerceEngine para validar as regras comerciais e o estoque. A disponibilidade de endpoint não comprova que exista monitor visual para a cozinha ou mapa de salão.

No modo simulado, pedidos, mesas e reservas não são enviados à API nem à fila offline. A troca para o modo real limpa o estado simulado desses serviços; não há migração dos dados de demonstração.

## Limites documentados

- Os IDs tables, agenda, history e kds exibem placeholder dentro do desktop.
- Existem protótipos de KDS, Mesas e Reservas em `src/app/components/eapps/`, mas eles não estão registrados no `client-os.ts` e não alteram esse estado. O protótipo de KDS só avança até `ready`; concluir pedido continua sendo responsabilidade do fluxo de pagamento. O protótipo de Mesas não libera reservas, contas solicitadas ou mesas com valor em aberto. O protótipo de Reservas mantém dados locais e não chama AppointmentsService.
- `eapp-order-history.ts` também não está integrado: apresenta apenas pedidos já carregados e os filtra pela unidade ativa; não representa um histórico completo.
- A tela do garçom é uma aplicação separada em /waiter.
- Não declarar sincronização visual em tempo real no desktop enquanto não houver componente de janela conectado e homologado.

## Validação

Estado alinhado por leitura estática das rotas, serviços e catálogo do desktop. Testes automatizados e homologação em restaurante não foram executados nesta revisão.
