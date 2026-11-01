# Store OS — 05: Estoque e produtos

## Estado encontrado

O domínio de produtos tem serviço Angular e API. O eApp Estoque está conectado para consulta e cadastro; a contagem de estoque salva uma auditoria de divergências separada e não altera automaticamente o saldo do produto.

| Responsabilidade | Implementação | Estado |
|---|---|---|
| Consulta/cadastro/edição de produtos | src/app/services/inventory.service.ts e src/server/routes/products.router.ts | CRUD real no modo real, escopado pelo servidor. |
| Baixa em vendas | src/server/core/commerce.engine.ts | O servidor é responsável pela validação e alteração transacional do estoque. |
| Catálogo público | GET /api/products/public e signal publicCatalog | Projeção sanitizada em estado separado do estoque interno; a vitrine filtra pelo tenant ativo sem fallback para produtos de outras lojas. |
| Produtos de demonstração | src/app/models/mock-data.ts e InventoryService | Fixtures e alterações simuladas são marcadas como locais; a troca para modo real ou outro tenant limpa o estado. O serviço inicia vazio no modo real; falha de API não deve expor fixtures como estoque da loja. |
| Fornecedores | SuppliersService e `src/server/routes/suppliers.router.ts` | Diretório persistente por unidade; produtos só aceitam fornecedor do mesmo tenant. Pedidos de compra e recebimento não estão implementados. |
| Conferência de estoque | StockAuditsService e `src/server/routes/stock-audits.router.ts` | Até 200 produtos por registro; o servidor captura saldo atual, quantidade contada e divergência em transação. O registro é auditável e não aplica ajuste de estoque. |
| Promoções | InventoryService.fetchPromotions | Ainda retorna lista vazia; não documentar como fluxo operacional. |
| Tela de gestão de estoque | `client-os.ts` renderiza `eapp-inventory.ts` para o ID inventory | Consulta o tenant ativo e permite cadastrar produtos. Não oferece ajuste direto de saldo ou trilha de movimentos. |
| Modo simulado da conferência | `src/app/components/eapps/eapp-stock-audit.ts` | Usa produtos simulados e mantém a confirmação somente na sessão; não grava no servidor. |

## Fora do estado atual

Importação de NF-e, perdas/avarias, ajuste de saldo a partir da conferência, pedido de compra, recebimento de mercadoria e impressão de etiquetas permanecem pendentes. Não há integração com leitor fiscal ou documento de entrada descrita nesta revisão.

## Validação

Nesta revisão, lint passou, a suíte geral passou com 94/94 testes e o build de produção passou. Os testes cobrem isolamento de tenant e registro da divergência sem alteração do estoque. Não houve homologação com Firestore real nem validação operacional de inventário físico.
