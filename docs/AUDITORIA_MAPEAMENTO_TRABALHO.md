# Auditoria de mapeamento — HQ e Store OS

Atualizado em 2026-11-01 por leitura estática e validação local. `npm run lint` passou, `npm run test:ci` passou com 96/96 testes e o build de produção passou; os resultados usam mocks e não declaram homologação. O mapa detalhado está em MODULE_STATUS.md e docs/OS/03_APLICATIVOS_E_MODULOS.md.

## HQ Central

- Há componentes em src/app/components/hq/ e rota protegida /hq.
- Há serviços/rotas de governança em src/app/services/hq.service.ts e src/server/routes/hq.router.ts.
- Presença de componente, serviço ou rota não confirma por si só homologação do fluxo.

## Store OS Lojista

| Domínio | Código encontrado | Estado da interface |
|---|---|---|
| Desktop | src/app/components/client-os.ts | 21 eApps operacionais e 3 simuladores integrados, além do PDV standalone. Oito integrações externas/administrativas estão marcadas como próximas etapas no mapa de módulos. |
| PDV | src/app/components/pos-terminal.ts e src/app/components/eapps/pos/ | Rota standalone /pos; encaminhada pelo atalho do desktop. |
| Produtos e pedidos | Serviços Angular e routers do servidor | eApps Estoque, KDS e Histórico conectados: consulta/cadastro, avanço até `ready` e consulta dos 200 pedidos recentes. Há diretório de fornecedores e registro de contagens com divergência; não há ajuste automático de saldo nem paginação do histórico. |
| Financeiro | FinancialsService, financials.router.ts e eApp Financeiro | Consulta somente leitura da unidade ativa, restrita a proprietário/operador; sem DRE, conciliação ou criação de lançamentos pela janela. |
| Mesas | TablesService, tables.router.ts e `eapp-tables.ts` | Janela integrada; consulta, cadastro e estado de mesa validado pelo servidor. |
| Agenda e CRM | AppointmentsService, OrdersService e eApps correspondentes | Reservas transacionais integradas; CRM resume clientes identificados em pedidos pagos recentes, sem fidelidade ou campanhas externas. |
| Logística | LogisticsService, logistics.router.ts e eApp Hub Logística | Frota própria, criação manual de rota e atribuição por unidade integradas; sem automação de roteirização ou pagamento de motorista. |
| Fornecedores e contagem | SuppliersService, StockAuditsService e routers dedicados | Contatos e contagens persistidos por tenant; não gera compras, recebimento nem ajuste automático de estoque. |
| RH, tarefas, O.S. e notas | Serviços e routers dedicados | Cadastro operacional/ponto manual, checklist, andamento de ordens e notas privadas integrados; sem folha, cobrança de O.S. ou atribuição individual de tarefas. |
| Garçom e entregador | src/app/components/waiter-app.ts e driver-app.ts | Rotas standalone /waiter e /driver. |

## Integração HQ–OS

Os clientes usam serviços HTTP e a autenticação é aplicada pelos guards/interceptors e pelo middleware do servidor. O escopo efetivo de cada endpoint deve ser verificado na respectiva rota; este resumo não declara sincronização/homologação além do que o código permite afirmar.
