# Auditoria de mapeamento — HQ e Store OS

Atualizado em 2026-11-01 por leitura estática e validação local. `npm run lint` passou, `npm run test:ci` passou com 90/90 testes e o build de produção passou; os resultados usam mocks e não declaram homologação. O mapa detalhado está em MODULE_STATUS.md e docs/OS/03_APLICATIVOS_E_MODULOS.md.

## HQ Central

- Há componentes em src/app/components/hq/ e rota protegida /hq.
- Há serviços/rotas de governança em src/app/services/hq.service.ts e src/server/routes/hq.router.ts.
- Presença de componente, serviço ou rota não confirma por si só homologação do fluxo.

## Store OS Lojista

| Domínio | Código encontrado | Estado da interface |
|---|---|---|
| Desktop | src/app/components/client-os.ts | Shell com janelas; IDs sem renderizador mostram estado placeholder. |
| PDV | src/app/components/pos-terminal.ts e src/app/components/eapps/pos/ | Rota standalone /pos; encaminhada pelo atalho do desktop. |
| Produtos e pedidos | Serviços Angular e routers do servidor | eApps de Estoque e KDS conectados: consulta/cadastro de produtos e avanço de preparo até `ready`; ajuste de estoque auditável e histórico de pedidos ainda não integrados. |
| Financeiro | FinancialsService, financials.router.ts e eApp Financeiro | Consulta somente leitura da unidade ativa, restrita a proprietário/operador; sem DRE, conciliação ou criação de lançamentos pela janela. |
| Mesas | TablesService, tables.router.ts e `eapp-tables.ts` | API e protótipo presentes, mas sem janela integrada no desktop. |
| Garçom e entregador | src/app/components/waiter-app.ts e driver-app.ts | Rotas standalone /waiter e /driver. |

## Integração HQ–OS

Os clientes usam serviços HTTP e a autenticação é aplicada pelos guards/interceptors e pelo middleware do servidor. O escopo efetivo de cada endpoint deve ser verificado na respectiva rota; este resumo não declara sincronização/homologação além do que o código permite afirmar.
