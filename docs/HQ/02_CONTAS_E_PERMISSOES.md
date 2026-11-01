# 🏛️ HQ Central — 02: Contas, Identidade, Permissões e Auditoria

## 📌 1. Visão Geral da Arquitetura de Identidade

A segurança de contas no ecossistema 3EATCRU é estruturada sobre o paradigma **Zero-Trust com Tokens Criptografados (Firebase Auth ID Tokens)** e **Custom Claims Oficiais gravadas exclusivamente no Servidor**. 

O HQ Central possui uma camada de autorização independente, impedindo que administradores locais ou atacantes injetem papéis executivos por meio de requisições de cliente.

```text
       ┌─────────────────────────────────────────────────────────┐
       │             CLIENTE ENVIA: Bearer <ID_TOKEN>            │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │         MIDDLEWARE EXPRESS (auth.middleware.ts)         │
       │  1. adminAuth.verifyIdToken(token)                      │
       │  2. Extrai: uid, email, email_verified, customClaims    │
       │  3. Sincroniza com /admins/{uid} ou /users/{uid}        │
       └────────────────────────────┬────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      role === 'hq_admin'                      role !== 'hq_admin'
   - email_verified === true                 - Acesso a /api/hq/*
   - Acesso Liberado a /api/hq/*               BLOQUEADO COM HTTP 403
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Assegurar que apenas membros autorizados da franqueadora ou desenvolvedores da plataforma tenham acesso ao ambiente do HQ Central (`/hq`).
- Permitir ao Super Admin criar, alterar e revogar atribuições de perfis (`role`) para outros colaboradores de lojas e da rede.
- Impedir que operadores de lojas promovam a si mesmos a Super Admin ou atribuam privilégios a colaboradores de outras empresas.
- Registrar de forma auditável e perene qualquer alteração em contas, níveis de permissão ou comandos críticos da plataforma.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Matriz Canônica de Permissões (`ROLE_PERMISSION_MATRIX`):**
  Definida no arquivo `src/server/middleware/auth.middleware.ts:25`:
  ```typescript
  export const ROLE_PERMISSION_MATRIX: Record<AppRole, PermissionAction[]> = {
    hq_admin: ['hq:governance', 'tenant:manage', 'orders:manage_all', 'orders:read_all', 'financials:manage_all', ...],
    tenant_owner: ['tenant:manage', 'orders:manage_tenant', 'products:manage_tenant', 'financials:manage_tenant', ...],
    operator: ['orders:manage_tenant', 'products:manage_tenant', 'tables:manage_tenant', 'financials:view_tenant', ...],
    waiter: ['orders:create_tenant', 'orders:read_tenant', 'tables:manage_tenant', ...],
    driver: ['logistics:deliver_assigned', 'orders:read_assigned'],
    consumer: ['orders:create_public', 'orders:read_own', 'reservations:create_public']
  };
  ```
- **Validação de Administrador de Bootstrap:**
  - O middleware `requireHqAdmin` verifica se o usuário possui `role === 'hq_admin'` **E** se possui e-mail verificado (`emailVerified === true`).
  - Além disso, a função `isHqAdminEmail` valida se o e-mail coincide com o e-mail administrador configurado no ambiente (`dev3eatcru@gmail.com`).
  - **Regra Anti-Spoofing:** Não são aceitos curingas de domínio (ex.: `@3eatcru.com`) para evitar a criação maliciosa de e-mails em domínios não autenticados.
- **Atribuição Autoritativa de Papéis:**
  - `POST /api/auth/assign-role` (`src/server/routes/auth.router.ts:306`).
  - Executa `adminAuth.setCustomUserClaims(targetUid, { role, tenantId })`.
  - Atualiza o registro em `/users/{targetUid}` e, no caso de gestores de loja, inclui o `targetUid` no array `staffUids` da empresa em `/tenants/{tenantId}`.
- **Auditoria Transacional:**
  - Função `logHqAudit` em `src/server/routes/hq.router.ts:78` grava logs diretamente em `/audit_logs` no Firestore.
  - A consulta de logs de auditoria está disponível via `GET /api/hq/audit` com filtro de severidade (`info`, `warning`, `critical`).

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Todas as requisições autenticadas carregam o token via interceptor Angular (`src/app/interceptors/auth.interceptor.ts`).
- **Prevenção de Escalação Cruzada:**
  - Se um Lojista autenticado tentar invocar `POST /api/auth/assign-role` especificando um `tenantId` que não seja o seu próprio, o endpoint responde com `403 TENANT_MISMATCH`.
  - Gestores de loja só têm permissão para atribuir os papéis operacionais: `'operator'`, `'waiter'` e `'driver'`. A tentativa de atribuir `'hq_admin'` ou `'tenant_owner'` resulta em HTTP 403.
- **Segurança no Firestore (`firestore.rules`):**
  - A coleção `/admins/{adminId}` possui escrita restrita a Super Admins verificados (`isBootstrappedAdmin()`).
  - A coleção `/users/{userId}` possui escrita desabilitada para o Client SDK (`allow create, update, delete: if false;`), sendo mutada unicamente pelo servidor Express via Admin SDK.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes de Segurança Automatizados (`src/server/security_phase1.spec.ts`):**
  - Cenário de tentativa de acesso a `/api/hq/overview` por operador ou consumidor: Rejeitado com HTTP 403.
  - Cenário de tentativa de alteração de papel em outra empresa: Rejeitado com HTTP 403 `TENANT_MISMATCH`.
  - Sincronização de Custom Claims no endpoint `GET /api/auth/me`.
- **Resultado:** Aprovado em 100% das asserções.

---

## 📊 3. Matriz de Classificação de Maturidade

| Mecanismo de Controle | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Autenticação via Firebase Auth Bearer Token | 🟢 **Implementado e comprovado** | `src/server/middleware/auth.middleware.ts:162` | Validação criptográfica de integridade de token em todas as rotas privadas. |
| Custom Claims de Papel (`role`) | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts:73` | Claims de role gravadas pelo backend e propagadas no token. |
| Bloqueio Anti-Spoofing de Super Admin | 🟢 **Implementado e comprovado** | `src/server/middleware/auth.middleware.ts:47` | Exige verificação explícita de e-mail e registro em `/admins/{uid}`. |
| Atribuição Segura de Funções da Equipe | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts:306` | Impede atribuição cross-tenant e bloqueia lojista de criar super admins. |
| Bloqueio de Escrita de Usuários pelo Cliente | 🟢 **Implementado e comprovado** | `firestore.rules:167` | `/users/{id}` não aceita escrita direta de clients, impedindo escalação. |
| Livro-Razão de Auditoria (`audit_logs`) | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:78` | Ações administrativas do HQ são persistidas com timestamp e severidade. |
| Gestão de Funcionários Internos do HQ | 🟡 **Implementado parcialmente** | `src/server/routes/hq.router.ts` | Super Admin pode registrar outros `hq_admin` via código/API; tela dedicada de gestão de operadores de suporte interno está planejada para expansão. |
