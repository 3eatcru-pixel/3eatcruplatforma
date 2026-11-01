# Store OS — 03: Aplicativos e módulos

## Escopo e nomenclatura

**Módulo** é a capacidade de negócio (ex.: estoque, pedidos, financeiro). **eApp** é uma interface integrada como janela ao desktop /os. Uma rota ou API disponível não comprova que o módulo tenha eApp.

Fontes de referência no código:

- Registro de atalhos: src/app/components/os/os-apps-registry.ts.
- Renderização das janelas: src/app/components/client-os.ts.
- Rotas: src/app/app.routes.ts.
- Serviços e APIs: src/app/services/ e src/server/routes/.

## Estado verificado em 2026-11-01

O registro contém 33 IDs. No desktop, apenas o PDV possui uma rota operacional e três simuladores possuem janela embutida. Os demais IDs mostram um estado explícito de interface ainda não integrada; eles não devem ser descritos como telas implementadas.

| IDs | Estado no Store OS | Implementação encontrada |
|---|---|---|
| pos | 🟡 Rota standalone | /pos carrega src/app/components/pos-terminal.ts; a janela do desktop encaminha para essa rota. Subcomponentes em src/app/components/eapps/pos/. |
| waiter-sim, driver-sim, consumer-sim | 🔵 Simuladores | Molduras de demonstração em src/app/components/eapps/eapp-*-sim.ts, reutilizando as telas de garçom, entregador e marketplace. |
| tables, kds, inventory, finance, suppliers, reconciliation, stock-audit, store-manager, whatsapp, ifood, instagram, tasks, calendar, agenda, services, rh, drivers, history, reports, crm, docs, google-drive, calculator, notes, admin-hub, appstore, browser, settings, system | ⚪ Janela placeholder | IDs estão no registro, mas não têm eApp conectado. client-os.ts mostra o estado de interface ausente. A disponibilidade de API/serviço é avaliada separadamente. |

As telas /waiter, /driver, /hq e as vitrines públicas são rotas próprias, não janelas do Store OS. A existência dessas rotas não altera o estado dos IDs homônimos no desktop.

## Módulos de negócio existentes fora das janelas

| Domínio | Serviços/rotas encontrados | Situação da interface desktop |
|---|---|---|
| Pedidos | OrdersService, orders.router.ts | Sem janela de histórico/KDS integrada. |
| Produtos e estoque | InventoryService, products.router.ts | Sem janela de estoque. CRUD real; promoções e fornecedores ainda sem persistência. |
| Catálogo público | InventoryService.publicCatalog e /api/products/public | Signal separado do catálogo interno e filtrado pelo tenant da vitrine. |
| Financeiro | FinancialsService, financials.router.ts | Sem janela financeira. Operações de caixa iniciadas no PDV usam o serviço financeiro. |
| Mesas e reservas | TablesService, AppointmentsService, tables.router.ts, reservations.router.ts | Sem janela de mesas/reservas; o App Garçom é uma rota separada. |
| Logística e CRM | LogisticsService, CrmService e routers correspondentes | Sem eApp desktop conectado. |

## Critérios para atualizar este mapa

Marcar um módulo como eApp implementado somente após confirmar arquivo de componente existente, registro/import no client-os.ts e caso de renderização correspondente. Marcar como produção somente depois de confirmar integração, autorização e homologação; a documentação não deve declarar testes executados sem evidência da execução atual.
