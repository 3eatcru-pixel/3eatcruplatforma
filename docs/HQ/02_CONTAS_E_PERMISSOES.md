# HQ Central — Contas, Identidade e Permissões

## Resolução de identidade

O roteador `/api` aplica rate limit e `authContext`. Quando há um Bearer token, o middleware valida o Firebase ID Token e resolve o papel considerando o header `X-3eatcru-Pillar`, as claims verificadas e os documentos de identidade no Firestore. Sem token válido, `req.user` permanece ausente; cada rota decide se exige autenticação.

No pilar HQ, o middleware aceita uma claim `hq_admin` com email verificado. Também pode resolver administradores por uma allowlist explícita de emails verificados ou por documento em `/admins/{uid}`. `requireHqAdmin` responde 401 sem usuário resolvido e 403 para qualquer papel diferente de `hq_admin`.

## Controles de rota observados

- As rotas privadas de `/api/hq/*` usam `requireHqAdmin`. Há endpoints públicos delimitados para status público, catálogo de planos e configuração regional.
- `GET /api/crm/consumers` exige `hq_admin` e retorna no máximo 100 perfis, sem paginação. O diretório não calcula GMV nem frequência de pedidos.
- `requireAuth` exige um usuário autenticado e rejeita o papel `guest`.
- `requireTenantAccess` permite `hq_admin` ou aplica papéis de gestor e comparação com o `tenantId` da sessão. Rotas podem habilitar `waiter` explicitamente.
- `ROLE_PERMISSION_MATRIX` lista permissões por papel e `hasPermission` consulta essa matriz. As rotas também usam middlewares específicos; a matriz não substitui essas verificações.

## Atribuição de papéis

`POST /api/auth/assign-role` requer autenticação. O HQ pode atribuir `hq_admin`, `operator`, `waiter`, `driver` e `consumer`; `guest` não é atribuível. A atribuição de `tenant_owner` por esse endpoint retorna `OWNER_LINK_REQUIRED`, pois não mantém o responsável e a equipe do tenant sincronizados. Use `POST /api/tenants/:id/owner`, exclusivo do HQ, para vincular uma conta existente com e-mail confirmado. Gestores de loja só podem atribuir `operator`, `waiter` ou `driver` dentro do próprio tenant.

A rota atualiza custom claims e documentos de usuário; ao atribuir `hq_admin`, também grava `/admins/{uid}`. Ao atribuir outro papel, remove esse documento de administrador. O vínculo de proprietário verifica a conta por e-mail no Firebase Auth, exige e-mail confirmado, recusa administradores do HQ e contas vinculadas a outro tenant, e atualiza `ownerUid`, `staffUids`, `/users/{uid}` e as claims. `GET /api/tenants/:id/owner` permite ao HQ consultar o e-mail atual da conta vinculada. Um cliente precisa obter um ID Token novo para refletir as claims atualizadas; o middleware chama `verifyIdToken` sem checagem de revogação. O evento de vínculo é gravado em `audit_logs` como best effort.

Na ficha de governança do tenant há um formulário para vincular o responsável existente. Não há tela dedicada para administrar usuários e papéis internos do HQ nem fluxo de transferência de proprietário.

## Firestore e trilha de auditoria

As regras de `firestore.rules` restringem leituras e escritas diretas de coleções protegidas. As rotas Express usam Firebase Admin SDK, portanto as autorizações da API também precisam ser verificadas nos middlewares do servidor.

As alterações administrativas não têm garantia uniforme de registro: algumas rotas escrevem em `audit_logs` como best effort e a atribuição de papéis não registra evento nessa coleção. Os registros não são descritos como imutáveis ou perenes.

## Validação desta documentação

O texto foi conferido com `src/server/api.ts`, `src/server/middleware/auth.middleware.ts`, `src/server/routes/auth.router.ts`, `src/server/routes/hq.router.ts`, `src/server/routes/crm.router.ts` e `firestore.rules`. Os testes automatizados e o build não foram executados nesta auditoria.
