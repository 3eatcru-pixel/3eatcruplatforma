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

## Preferências de caixa e dispositivos externos

`OsPreferencesService` escopa tema e preferências locais pelo identificador de usuário e tenant em `localStorage`. O nome da impressora e a largura de papel (58/80 mm) pertencem ao computador/caixa atual; não comprovam disponibilidade do dispositivo. Perfis de maquininhas externas ficam em `tenants/{tenantId}.externalPaymentTerminals`, persistidos pelo servidor e compartilhados pela loja. O cadastro não guarda token, senha ou credencial do adquirente. Nenhuma dessas preferências é sincronizada pela outbox offline.

## Comportamento de pagamento offline

- Cartão e PIX são desabilitados e bloqueados no handler enquanto o navegador está offline, pois precisam de autorização conectada.
- Venda em dinheiro pode ser registrada localmente pelo operador e enfileirada com chave idempotente. A tela marca o pedido como pendente e informa que aguarda sincronização.
- No modo de simulação, pedidos não entram na fila offline; o serviço mantém o registro apenas na memória local.
- A conclusão comercial e a baixa de estoque dependem da resposta do servidor após o replay. Se o estoque não permitir a venda, o servidor retorna conflito e o pedido local é marcado como cancelado.
- Nenhum estado local pendente comprova liquidação ou lançamento financeiro persistido.
- O indicador “Navegador online” usa `navigator.onLine`; ele não verifica a disponibilidade da API nem do adquirente.
- Fechar a janela de pagamento PIX no PDV apenas esconde o QR Code; o pedido e a transação permanecem no estado registrado no servidor.

## Replay e conflitos

OfflineSyncService só executa replay com Firebase Auth real, papel de equipe permitido e tenant ativo compatível com cada item. Pedidos simulados não são enfileirados; itens de outra unidade ou usuário permanecem pendentes até uma sessão autorizada, e conflito/contagem ficam escopados e ocultos fora do contexto. O replay é tentado ao restaurar a conexão e pode ser acionado por **Sincronizar fila** no PDV. Falhas transitórias após o limite automático ficam na dead letter; o operador autenticado da mesma unidade e UID pode recolocá-las na fila, preservando a chave idempotente original. Conflitos determinísticos não entram nessa recuperação: “Marcar ciência” só altera seu estado local e não reenvia, corrige ou reativa a operação rejeitada. O movimento entre dead letter e fila usa transação IndexedDB quando disponível; o fallback localStorage grava os dois estados sequencialmente. O CommerceEngine revalida tenant, produtos, estoque e pagamento no servidor.

## Validação

Em validação anterior, as specs `src/app/core/offline/offline-resilience.spec.ts` e `src/server/commerce_war_tests.spec.ts` passaram em `npm run test:ci` (100/100 testes). Nesta continuação, lint e build passaram; os testes não foram reexecutados. As specs usam mocks; rede, recuperação física e Firestore real ainda não foram homologados.
