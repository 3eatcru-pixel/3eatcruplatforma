# 🤝 Integração — 03: Segurança Multitenant, RBAC e Regras Zero-Trust

## 📌 1. Visão Geral da Arquitetura Zero-Trust

O ecossistema 3EATCRU adota uma postura de segurança **Zero-Trust (Confiança Zero)** em todas as camadas da aplicação. Sob este princípio, nenhuma requisição proveniente da interface do usuário é considerada confiável por padrão. A autoridade de acesso e o escopo de dados são determinados estritamente no servidor através de **Tokens Criptografados com Custom Claims** e regras de segurança rígidas no **Cloud Firestore (`firestore.rules`)**.

```text
                                        REQUISIÇÃO HTTP CLIENTE
                                                   │
                                                   ▼
                               ┌───────────────────────────────────────┐
                               │     1. VALIDAÇÃO DE CRIPTOGRAFIA      │
                               │  Firebase Admin SDK verifyIdToken()   │
                               └───────────────────┬───────────────────┘
                                                   │
                                                   ▼
                               ┌───────────────────────────────────────┐
                               │       2. RESOLUÇÃO DE AUTORIDADE      │
                               │   Extração de req.user.tenantId e     │
                               │   req.user.role do token autenticado  │
                               └───────────────────┬───────────────────┘
                                                   │
                                                   ▼
                               ┌───────────────────────────────────────┐
                               │     3. ISOLAMENTO MULTIEMPRESA        │
                               │  Rejeita se payload declarar outro    │
                               │  tenantId (403 TENANT_MISMATCH)       │
                               └───────────────────┬───────────────────┘
                                                   │
                                                   ▼
                               ┌───────────────────────────────────────┐
                               │      4. FIRESTORE SECURITY RULES      │
                               │  Default Deny em 100% das coleções.   │
                               │  Escritas no banco bloqueadas para o  │
                               │  Client SDK (somente via Express)     │
                               └───────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Impedir que qualquer usuário autenticado (seja lojista, garçom, motorista ou cliente) acerte queries em documentos pertencentes a outro estabelecimento.
- Bloquear a escalação de privilégios onde um lojista comum tenta se autoproclamar Super Admin (`hq_admin`).
- Garantir que motoristas só visualizem e transicionem pedidos que foram expressamente atribuídos a eles (`order.driverId === req.user.id`).
- Eliminar o risco de ataques por injeção direta via Firebase Client SDK.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Default-Deny Global em `firestore.rules:8`:**
  ```javascript
  match /{document=**} {
    allow read, write: if false;
  }
  ```
- **Bloqueio de Escrita Direta pelo Cliente:**
  - Coleções críticas (`/tenants`, `/products`, `/orders`, `/financials`, `/payment_transactions`, `/tables`, `/delivery_routes`) possuem:
    ```javascript
    allow create, update, delete: if false;
    ```
    Isso força que **100% das mutações** sejam mediadas pelo backend Express, onde transações ACID e validações de regras de negócio são obrigatoriamente aplicadas.
- **Isolamento de Entregadores em `firestore.rules:59`:**
  - Função `isAssignedDriver(data)`:
    ```javascript
    function isAssignedDriver(data) {
      return isSignedIn() &&
        'driverId' in data &&
        data.driverId == request.auth.uid;
    }
    ```
- **Resolução Autoritativa de Tenant (`src/server/core/commerce.engine.ts:87`):**
  - O backend ignora qualquer `tenantId` fraudulento enviado no JSON da requisição caso o usuário pertença ao staff de uma loja:
    ```typescript
    if (clientTenant && clientTenant !== user.tenantId) {
      throw {
        status: 403,
        code: 'TENANT_MISMATCH',
        message: 'Acesso negado: operador vinculado a outro estabelecimento.'
      };
    }
    return user.tenantId;
    ```

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Bearer ID Token injetado pelo interceptor Angular.
- **Prevenção de Evasão:** Tentativas de consultar `/api/financials`, `/api/orders` ou `/api/products` sem token ou com token de outro tenant resultam em interrupção imediata da requisição.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/security_phase1.spec.ts`:
    - Validação de que entregador não consegue consultar pedidos de outros entregadores.
    - Validação de bloqueio em rota com `TENANT_MISMATCH`.
    - Validação de que usuários comuns não conseguem ler coleções administrativas.
  - `src/server/commerce_war_tests.spec.ts` (Guerra 7 e Guerra 8):
    - Comprovação de isolamento multiempresa e proteção contra sequestro de rotas.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade da Segurança

| Mecanismo de Segurança | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Default-Deny Global em Firestore Rules | 🟢 **Implementado e comprovado** | `firestore.rules:8` | Bloqueia qualquer rota de documento não explicitamente permitida. |
| Bloqueio de Escritas pelo Client SDK | 🟢 **Implementado e comprovado** | `firestore.rules:215` | Mutações mediadas unicamente pelo Express Admin SDK. |
| Validação Criptográfica de Custom Claims | 🟢 **Implementado e comprovado** | `src/server/middleware/auth.middleware.ts:162` | Validação de assinatura digital dos tokens Firebase. |
| Isolamento Estrito de Entregadores (`driverId`) | 🟢 **Implementado e comprovado** | `firestore.rules:59` e `logistics.router.ts:180` | Motoristas só acessam suas próprias corridas. |
| Detecção e Bloqueio de `TENANT_MISMATCH` | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:105` | Rejeição imediata de cruzamento de dados entre empresas. |
| Auditoria Imutável de Eventos Administrativos | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:78` | Logs de auditoria gravados de forma indelével em `/audit_logs`. |
| Rotação Periódica de Chaves de Serviço | 🟡 **Implementado parcialmente** | `src/server/firebase-admin.ts` | Credenciais gerenciadas via variáveis de ambiente seguras do Google Cloud Run. |
