# Store OS — 05: Estoque e produtos

## Estado encontrado

O domínio de produtos tem serviço Angular e API. O eApp Estoque agora está conectado ao desktop para consulta e cadastro de produtos da unidade; ajuste de saldo e movimentos auditáveis continuam indisponíveis.

| Responsabilidade | Implementação | Estado |
|---|---|---|
| Consulta/cadastro/edição de produtos | src/app/services/inventory.service.ts e src/server/routes/products.router.ts | CRUD real no modo real, escopado pelo servidor. |
| Baixa em vendas | src/server/core/commerce.engine.ts | O servidor é responsável pela validação e alteração transacional do estoque. |
| Catálogo público | GET /api/products/public e signal publicCatalog | Projeção sanitizada em estado separado do estoque interno; a vitrine filtra pelo tenant ativo sem fallback para produtos de outras lojas. |
| Produtos de demonstração | src/app/models/mock-data.ts e InventoryService | Fixtures e alterações simuladas são marcadas como locais; a troca para modo real ou outro tenant limpa o estado. O serviço inicia vazio no modo real; falha de API não deve expor fixtures como estoque da loja. |
| Promoções e fornecedores | InventoryService.fetchPromotions/fetchSuppliers | Ainda retornam listas vazias; não documentar como fluxo operacional. |
| Tela de gestão de estoque | `client-os.ts` renderiza `eapp-inventory.ts` para o ID inventory | Consulta o tenant ativo e permite cadastrar produtos. Não oferece ajuste de saldo, trilha de movimentação ou fornecedores. |
| Inventário cego | `src/app/components/eapps/eapp-stock-audit.ts` | Protótipo com contagens fixas e estado local; concluir a demonstração não salva contagem nem altera o estoque. Não está integrado ao desktop. |

## Fora do estado atual

Importação de NF-e, perdas/avarias, inventário cego persistente, impressão de etiquetas e gestão persistente de fornecedores não foram encontrados como telas integradas do Store OS. Não há integração com leitor fiscal ou documento de entrada descrita nesta revisão.

## Validação

Nesta revisão, lint passou, a suíte geral passou com 90/90 testes e o build de produção passou. Não houve teste de movimentação de estoque — esse fluxo ainda não existe — nem homologação com Firestore real.
