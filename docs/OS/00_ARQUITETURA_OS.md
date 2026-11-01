# Store OS — 00: Arquitetura do ambiente do lojista

## Fronteiras do produto

O Store OS é o ambiente autenticado da unidade lojista. A rota /os carrega o desktop do lojista; /pos carrega o PDV como rota standalone. Aplicativos móveis e vitrines públicas têm rotas próprias.

O sistema diferencia três coisas:

1. **Módulo de negócio:** serviço/API de pedidos, produtos, financeiro, mesas ou logística.
2. **Janela eApp:** componente registrado e renderizado dentro do desktop /os.
3. **Rota standalone:** tela própria, como /pos, /waiter ou /driver.

Uma API ou serviço disponível não significa que exista uma janela eApp correspondente.

## Implementação encontrada

| Responsabilidade | Fonte no repositório |
|---|---|
| Rotas de lojista | src/app/app.routes.ts |
| Desktop, janelas e estado placeholder | src/app/components/client-os.ts |
| Registro de atalhos | src/app/components/os/os-apps-registry.ts |
| Preferências de área de trabalho | src/app/services/os-preferences.service.ts |
| Sessão e modo simulado | src/app/services/security.service.ts |
| PDV standalone e subcomponentes | src/app/components/pos-terminal.ts e src/app/components/eapps/pos/ |
| Fonte transacional de pedidos e estoque | src/server/core/commerce.engine.ts |
| Fila offline | src/app/core/offline/offline-sync.service.ts e src/shared/offline/offline-outbox.engine.ts |

## Estado das interfaces

Auditoria de 2026-11-01: o registro de atalhos possui 33 IDs; 21 eApps operacionais e três simuladores têm janela integrada. O ID pos encaminha para a rota protegida /pos. Oito módulos externos/administrativos exibem o estado “Em breve” até a definição e homologação das integrações correspondentes. Ver a matriz em 03_APLICATIVOS_E_MODULOS.md.

## Segurança e persistência

- As rotas /os e /pos usam storeOperatorGuard.
- A autorização, a validação de tenant e as transações comerciais são aplicadas pelo servidor; o cliente não é fonte de verdade para preço, pagamento ou estoque.
- APIs de pedidos, produtos, mesas, reservas e financeiro estão em src/server/routes/.
- A existência de funcionalidade no servidor não confirma que tenha tela de gerenciamento integrada ao desktop.

## Validação

Nesta revisão, lint passou, a suíte passou com 94/94 testes e o build de produção passou. Os testes usam mocks e não substituem homologação operacional nem validação com Firebase real.
