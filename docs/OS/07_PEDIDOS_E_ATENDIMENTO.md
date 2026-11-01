# Store OS — 07: Pedidos, mesas e atendimento

## Domínios e interfaces encontrados

| Domínio | Implementação | Estado de interface |
|---|---|---|
| Pedidos | OrdersService e src/server/routes/orders.router.ts | KDS e Histórico integrados; a janela consulta até 200 pedidos recentes da unidade. No modo simulado, as mudanças ficam em memória local. |
| Mesas | TablesService, `eapp-tables.ts` e src/server/routes/tables.router.ts | Mapa integrado ao desktop; consulta, cadastro de mesa e abertura/liberação respeitam tenant, papel, capacidade e saldo. O modo simulado fornece quatro mesas locais. |
| Reservas | AppointmentsService, `eapp-reservations.ts` e src/server/routes/reservations.router.ts | eApp Agenda integrado; lista por data, registra, confirma, acomoda e atualiza reservas com sincronização transacional da mesa. No modo simulado, as transições atualizam localmente a mesa associada. |
| App Garçom | src/app/components/waiter-app.ts, rota /waiter | Aplicação standalone, não uma janela de gestão do Store OS. No modo simulado usa mesas e pedidos locais. |
| KDS | `eapp-kds.ts`, OrdersService e CommerceEngine | Janela integrada; consulta pedidos da unidade. Proprietário/operador avança preparo até `ready`; garçom consulta em modo somente leitura. |

O pedido passa pelo servidor e pelo CommerceEngine para validar as regras comerciais e o estoque. A disponibilidade de endpoint não comprova que exista monitor visual para a cozinha ou mapa de salão.

No modo simulado, pedidos, mesas e reservas não são enviados à API nem à fila offline. A troca para o modo real limpa o estado simulado desses serviços; não há migração dos dados de demonstração.

## Limites documentados

- Os IDs tables, agenda e history estão integrados; histórico limita a consulta aos 200 registros mais recentes e não possui paginação/exportação.
- O KDS integrado permite avançar `pending` → `preparing` → `ready`. O backend mantém a autorização por papel/tenant e não permite que essa tela conclua pedido ou liquide pagamento. Mesas não conclui comandas; a Agenda não liquida pagamentos e não libera mesas com saldo aberto.
- O Histórico está integrado e consulta até 200 pedidos recentes da unidade via API; ainda não possui paginação ou exportação.
- A tela do garçom é uma aplicação separada em /waiter.
- Não declarar sincronização visual em tempo real no desktop enquanto não houver componente de janela conectado e homologado.

## Validação

O build de produção e a suíte geral passaram nesta revisão (94/94 testes). Não houve homologação operacional em restaurante; KDS, Mesas, Agenda, Calendário e Histórico estão integrados nos escopos descritos.
