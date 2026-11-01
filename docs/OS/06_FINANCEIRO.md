# Store OS — 06: Financeiro

## Estado encontrado

O livro financeiro tem serviço e API, mas não tem janela de DRE/financeiro integrada ao desktop do lojista.

| Fluxo | Implementação | Limite conhecido |
|---|---|---|
| Consultar lançamentos | FinancialsService.fetchRecords → GET /api/financials | O servidor restringe acesso por papel e tenant. |
| Criar lançamento operacional | FinancialsService.addRecord → POST /api/financials | Lançamento de venda deve vir do fluxo comercial; não criar venda manual no livro. |
| Receita de pedidos pagos | CommerceEngine | A liquidação comercial no servidor é fonte da receita de vendas. |
| Sangria e suprimento pelo PDV | Modal de caixa em src/app/components/eapps/pos/ e FinancialsService | O PDV aguarda a persistência e informa falha ao operador. |
| DRE, conciliação bancária e janela de financeiro | ID finance no registro do desktop | Placeholder; `eapp-reconciliation.ts` contém apenas um protótipo sem extratos nem cálculo, e não existe fluxo integrado de conciliação bancária. |
| Resumo de relatórios | `eapp-reports.ts` | Protótipo fora do desktop; considera pedidos pagos carregados do tenant atual, mas não calcula participação por canal nem substitui relatório financeiro. |
| Resumo de lançamentos | `eapp-finance.ts` | Componente fora do desktop, filtrado pelo tenant ativo; não realiza DRE nem conciliação. |
| KPI “Vendas de Hoje” no Menu Iniciar | start-menu.ts | Soma apenas pedidos concluídos do tenant atual, pela data local; no modo real exige pagamento aprovado e na simulação aceita pedido marcado como simulado. Não substitui o livro financeiro. |
| Remuneração de motoristas da loja | Operação direta do lojista | A loja define e paga seus motoristas fora do Store OS. O valor informado em uma rota é apenas referência operacional; o app do entregador não registra pagamento. A futura comissão da rede própria da plataforma permanece “Em breve” e separada. |

No modo de simulação, FinancialsService mantém os lançamentos localmente e os descarta ao alternar o modo de execução. Uma operação real iniciada antes da troca de modo não é copiada para o estado simulado. Isso não constitui dado financeiro persistido.

## Validação

Esta página descreve os caminhos encontrados no código. Testes, conciliação com adquirentes e homologação contábil não foram executados nesta revisão.
