# Store OS — 06: Financeiro

## Estado encontrado

O Store OS tem um eApp financeiro integrado para consulta somente leitura dos lançamentos da unidade ativa. A tela é restrita a `tenant_owner` e `operator`, carrega os registros pelo `FinancialsService` e não substitui uma DRE ou conciliação.

| Fluxo | Implementação | Limite conhecido |
|---|---|---|
| Consultar lançamentos | eApp `finance`; FinancialsService.fetchRecords → GET /api/financials | Somente leitura, restrito a proprietário/operador e ao tenant ativo; o servidor valida papel e tenant. |
| Totais do eApp | Entradas, saídas e saldo liquidados | `sale` e `income` contam como entrada; `expense` como saída; registros `pending` aparecem na lista, mas não entram no saldo. |
| Criar lançamento operacional | FinancialsService.addRecord → POST /api/financials | O eApp não cria lançamentos. Lançamento de venda deve vir do fluxo comercial; não criar venda manual no livro. |
| Receita de pedidos pagos | CommerceEngine | A liquidação comercial no servidor é fonte da receita de vendas. |
| Sangria e suprimento pelo PDV | Modal de caixa em src/app/components/eapps/pos/ e FinancialsService | O PDV aguarda a persistência e informa falha ao operador. |
| DRE e conciliação bancária | `eapp-reconciliation.ts` | Não integradas; o protótipo não importa extratos nem calcula taxas, liquidações ou divergências. |
| Resumo de relatórios | `eapp-reports.ts` | Protótipo fora do desktop; considera pedidos pagos carregados do tenant atual, mas não calcula participação por canal nem substitui relatório financeiro. |
| KPI “Vendas de Hoje” no Menu Iniciar | start-menu.ts | Soma apenas pedidos concluídos do tenant atual, pela data local; no modo real exige pagamento aprovado e na simulação aceita pedido marcado como simulado. Não substitui o livro financeiro. |
| Remuneração de motoristas da loja | Operação direta do lojista | A loja define e paga seus motoristas fora do Store OS. O valor informado em uma rota é apenas referência operacional; o app do entregador não registra pagamento. A futura comissão da rede própria da plataforma permanece “Em breve” e separada. |

No modo de simulação, FinancialsService mantém os lançamentos localmente e os descarta ao alternar o modo de execução. Uma operação real iniciada antes da troca de modo não é copiada para o estado simulado. Isso não constitui dado financeiro persistido.

## Validação

O build de produção e a suíte geral passaram nesta revisão (94/94 testes). Isso não homologa o eApp com dados reais; não houve conciliação com adquirentes nem homologação contábil.
