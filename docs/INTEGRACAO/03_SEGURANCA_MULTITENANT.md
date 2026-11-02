# 🤝 Integração — 03: Segurança Multitenant, RBAC e Regras Zero-Trust

## 📌 1. Visão Geral da Arquitetura Zero-Trust

O ecossistema combina validação de Firebase ID Tokens, middlewares de autorização no servidor e regras do Cloud Firestore (`firestore.rules`). As garantias são específicas de cada rota e coleção; o uso desses controles não certifica, por si só, o isolamento de todos os fluxos.

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
                               │  Rotas com escopo de tenant comparam │
                               │  tenantId conforme seu middleware    │
                               └───────────────────┬───────────────────┘
                                                   │
                                                   ▼
                               ┌───────────────────────────────────────┐
                               │      4. FIRESTORE SECURITY RULES      │
                               │  Regra-curinga nega acesso sem regra │
                               │  explícita; exceções são por coleção │
                               └───────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Impedir que qualquer usuário autenticado (seja lojista, garçom, motorista ou cliente) acerte queries em documentos pertencentes a outro estabelecimento.
- Bloquear a escalação de privilégios onde um lojista comum tenta se autoproclamar Super Admin (`hq_admin`).
- Garantir que motoristas só visualizem e transicionem pedidos que foram expressamente atribuídos a eles (`order.driverId === req.user.id`).
- Manter rotas disponíveis restritas ao tenant do motorista `private`; o pool aberto da rede `marketplace` fica indisponível enquanto a operação da plataforma estiver em breve.
- Restringir acessos diretos pelo Firebase Client SDK conforme as regras de cada coleção.

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
    Nessas coleções, as mutações do Client SDK são bloqueadas. Rotas que usam Admin SDK precisam validar autorização e dados no backend; as regras Firestore não substituem essas verificações.
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
- **Projeção de vitrine pública (`toPublicStorefront`):** `GET /api/tenants/public` libera apenas campos de exibição das lojas ativas. Nome legal, telefone privado, CNPJ, chave PIX, equipe, dispositivos, rating não verificado e dados financeiros não fazem parte do contrato. O campo WhatsApp só é publicado quando cadastrado para contato público. O front usa essa projeção no marketplace, na landing e em `/p/:id`; dados `MOCK_TENANTS` são restritos ao modo de simulação. Falha de rede limpa o cache público em vez de exibir dados de exemplo.
- **GPS de motorista:** o endpoint aceita ping somente do próprio usuário com papel `driver`; valida o documento `private`, tenant e rota exata atribuída em `in_progress`. Latitude/longitude são validadas em conjunto. `sharing: false` e a conclusão de rota apagam a posição. Gestores consultam apenas motoristas do próprio tenant, e o cliente oculta a posição se o último ping tiver mais de 2 minutos. A posição do consumidor no marketplace não é enviada à API.
- **Cobrança SaaS do HQ:** endpoints de gestão exigem `hq_admin`; o tenant, plano, mensalidade e e-mail são lidos no servidor. Webhooks de Stripe exigem assinatura sobre o corpo HTTP bruto; webhooks Mercado Pago exigem HMAC de `x-signature` e consulta autenticada ao recurso no provedor. IDs de eventos e faturas são registrados de forma idempotente. As chaves privadas nunca são retornadas à interface.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Bearer ID Token injetado pelo interceptor Angular.
- **Prevenção de Evasão:** Tentativas de consultar `/api/financials`, `/api/orders` ou `/api/products` sem token ou com token de outro tenant resultam em interrupção imediata da requisição.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- Nesta revisão, `npm run test:ci` passou com 100/100 testes e executou `src/server/security_phase1.spec.ts` e `src/server/commerce_war_tests.spec.ts`. Os testes usam mocks; as regras do Firestore não foram exercitadas no emulador.

---

## 📊 3. Matriz de Classificação de Maturidade da Segurança

| Mecanismo de Segurança | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Default-Deny Global em Firestore Rules | Regra presente; sem execução no emulador nesta revisão | `firestore.rules:8` | Bloqueia documentos não explicitamente permitidos pelas regras. |
| Bloqueio de Escritas pelo Client SDK | Regra presente; sem execução no emulador nesta revisão | `firestore.rules:215` | As rotas administrativas usam Express Admin SDK; as regras limitam o acesso do cliente. |
| Validação Criptográfica de Custom Claims | Implementado; suíte CI aprovada com mocks | `src/server/middleware/auth.middleware.ts:162` | O middleware verifica o token Firebase; não houve homologação com Auth real. |
| Isolamento Estrito de Entregadores (`driverId`) | Implementado; suíte CI aprovada com mocks | `firestore.rules:59` e `logistics.router.ts` | Escopo verificado pelas rotas; a regra não foi exercitada no emulador. |
| Detecção e Bloqueio de `TENANT_MISMATCH` | Implementado; suíte CI aprovada com mocks | `src/server/core/commerce.engine.ts` | Rejeita operações fora do tenant autorizado. |
| Registro de Eventos Administrativos | Best effort; não imutável | `src/server/routes/hq.router.ts` | A API grava logs em `/audit_logs`, mas não garante imutabilidade ou retenção. |
| Rotação Periódica de Chaves de Serviço | 🟡 **Implementado parcialmente** | `src/server/firebase-admin.ts` | Credenciais gerenciadas via variáveis de ambiente seguras do Google Cloud Run. |
