# Segurança, testes e maturidade — estado verificado

Atualizado em 2026-11-01 por leitura estática e validação local. Nesta revisão, lint passou, a suíte passou com 90/90 testes e o build de produção passou. Os testes usam mocks; implantação e homologação real continuam pendentes.

## Controles encontrados

- A API monta o middleware de contexto de autenticação em src/server/api.ts.
- O middleware valida Firebase ID Tokens e resolve papel e tenant a partir das claims verificadas e dos registros de identidade.
- firestore.rules aplica regras explícitas e nega operações não autorizadas.
- O servidor usa Firebase Admin SDK, que não é limitado por firestore.rules. Cada rota que usa Admin SDK precisa validar papel, tenant, identidade e dados de entrada no backend.
- As gravações diretas do cliente em coleções transacionais protegidas são restringidas pelas regras. Isso não certifica automaticamente o comportamento das rotas administrativas.

Consulte [Segurança multi-tenant](./INTEGRACAO/03_SEGURANCA_MULTITENANT.md) para os limites por coleção e por rota.

## Trilha de auditoria

As regras Firestore impedem gravação direta do cliente em audit_logs. O backend usa Admin SDK; por isso, a coleção não deve ser descrita como imutável sem verificar todas as rotas e seus privilégios de escrita.

## Inventário de testes

Existem arquivos de teste em src/app e src/server. Nesta revisão, `npm run test:ci` passou com 90/90 testes; essa contagem não comprova cobertura de todas as rotas nem integração real com Firebase, PSP ou hardware.

Comandos disponíveis no package.json:

- npm run test:ci
- npm run lint
- npm run check

Use [Testes e recuperação](./INTEGRACAO/04_TESTES_E_RECUPERACAO.md) para o inventário e os critérios de validação.

## Critérios antes de declarar produção

1. Automatizar lint, testes e build de produção como gate de CI; a execução local desta revisão passou, mas não substitui um pipeline contínuo.
2. Validar regras Firestore no emulador e verificar autorização nas rotas que usam Admin SDK.
3. Homologar fluxos de pagamento, tenant, operador, consumidor e entregador com dados de teste.
4. Registrar configuração de implantação, segredos, backup e procedimento de recuperação.
5. Manter as classificações dos módulos alinhadas a [MODULE_STATUS.md](../MODULE_STATUS.md).
