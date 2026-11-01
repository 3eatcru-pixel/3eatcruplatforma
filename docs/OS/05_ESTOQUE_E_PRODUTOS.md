# Store OS — 05: Estoque e produtos

## Estado encontrado

O domínio de produtos tem serviço Angular e API. Não existe janela de estoque integrada ao desktop do Store OS nesta revisão.

| Responsabilidade | Implementação | Estado |
|---|---|---|
| Consulta/cadastro/edição de produtos | src/app/services/inventory.service.ts e src/server/routes/products.router.ts | CRUD real no modo real, escopado pelo servidor. |
| Baixa em vendas | src/server/core/commerce.engine.ts | O servidor é responsável pela validação e alteração transacional do estoque. |
| Catálogo público | GET /api/products/public e signal publicCatalog | Projeção sanitizada em estado separado do estoque interno; a vitrine filtra pelo tenant ativo sem fallback para produtos de outras lojas. |
| Produtos de demonstração | src/app/models/mock-data.ts e InventoryService | Fixtures e alterações simuladas são marcadas como locais; a troca para modo real ou outro tenant limpa o estado. O serviço inicia vazio no modo real; falha de API não deve expor fixtures como estoque da loja. |
| Promoções e fornecedores | InventoryService.fetchPromotions/fetchSuppliers | Ainda retornam listas vazias; não documentar como fluxo operacional. |
| Tela de gestão de estoque | ID inventory no registro do desktop | Placeholder; interface não integrada. `eapp-inventory.ts` não é importado nem renderizado por `client-os.ts`; seu formulário de cadastro chama o serviço de produtos, mas não oferece ajuste de saldo sem movimento auditável. |
| Inventário cego | `src/app/components/eapps/eapp-stock-audit.ts` | Protótipo com contagens fixas e estado local; concluir a demonstração não salva contagem nem altera o estoque. Não está integrado ao desktop. |

## Fora do estado atual

Importação de NF-e, perdas/avarias, inventário cego persistente, impressão de etiquetas e gestão persistente de fornecedores não foram encontrados como telas integradas do Store OS. Não há integração com leitor fiscal ou documento de entrada descrita nesta revisão.

## Validação

Este documento foi alinhado por leitura estática do serviço, rota e shell. Testes e homologação não foram executados nesta revisão.
