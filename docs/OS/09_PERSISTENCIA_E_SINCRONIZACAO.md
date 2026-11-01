# Store OS — 09: Persistência e sincronização offline

## Implementação encontrada

| Responsabilidade | Código |
|---|---|
| Detectar conectividade e repetir ações | src/app/core/offline/offline-sync.service.ts |
| Persistir fila, conflitos e itens rejeitados | src/app/core/offline/indexed-db.service.ts |
| Definir replay serializado e idempotência | src/shared/offline/offline-outbox.engine.ts |
| Enfileirar pedido do PDV | EcosystemService.addOrder |
| Validar pedido e estoque no retorno da conexão | src/server/core/commerce.engine.ts |

O IndexedDB usa o banco 3eatcru_commercial_os_db e os stores outbox_queue, conflicts, dead_letter e entity_cache. Se IndexedDB não estiver disponível, IndexedDbPersistenceService usa localStorage como fallback. Esse fluxo não mantém um cache offline de produtos usado pelo InventoryService.

## Comportamento de pagamento offline

- Cartão e PIX são desabilitados e bloqueados no handler enquanto o navegador está offline, pois precisam de autorização conectada.
- Venda em dinheiro pode ser registrada localmente pelo operador e enfileirada com chave idempotente. A tela marca o pedido como pendente e informa que aguarda sincronização.
- No modo de simulação, pedidos não entram na fila offline; o serviço mantém o registro apenas na memória local.
- A conclusão comercial e a baixa de estoque dependem da resposta do servidor após o replay. Se o estoque não permitir a venda, o servidor retorna conflito e o pedido local é marcado como cancelado.
- Nenhum estado local pendente comprova liquidação ou lançamento financeiro persistido.

## Replay e conflitos

OfflineSyncService executa a fila em sequência ao voltar a conexão, persiste conflitos e dead letters e notifica o aplicativo via handlers. O CommerceEngine revalida tenant, produtos, estoque e pagamento no servidor. Reenvios usam chave de idempotência para evitar repetição comercial.

## Validação

Specs de resiliência existem em src/app/core/offline/offline-resilience.spec.ts e src/server/commerce_war_tests.spec.ts. Não foram executados nesta revisão; build e homologação de rede/dispositivos também não foram concluídos.
