# Store OS — 06: Financeiro

## Estado encontrado

O livro financeiro tem serviço e API, mas não tem janela de DRE/financeiro integrada ao desktop do lojista.

| Fluxo | Implementação | Limite conhecido |
|---|---|---|
| Consultar lançamentos | FinancialsService.fetchRecords → GET /api/financials | O servidor restringe acesso por papel e tenant. |
| Criar lançamento operacional | FinancialsService.addRecord → POST /api/financials | Lançamento de venda deve vir do fluxo comercial; não criar venda manual no livro. |
| Receita de pedidos pagos | CommerceEngine | A liquidação comercial no servidor é fonte da receita de vendas. |
| Sangria e suprimento pelo PDV | Modal de caixa em src/app/components/eapps/pos/ e FinancialsService | O PDV aguarda a persistência e informa falha ao operador. |
| DRE, conciliação bancária e janela de financeiro | ID finance no registro do desktop | Placeholder; não existe interface integrada nem fluxo de conciliação bancária encontrado. |

No modo de simulação, FinancialsService mantém os lançamentos localmente. Isso não constitui dado financeiro persistido.

## Validação

Esta página descreve os caminhos encontrados no código. Testes, conciliação com adquirentes e homologação contábil não foram executados nesta revisão.
