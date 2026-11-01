# 🏛️ HQ Central — 01: Gestão de Empresas, Tenants e Filiais

## 📌 1. Visão Geral & Ciclo de Vida da Empresa

No ecossistema 3EATCRU, cada empresa cadastrada é representada por um documento na coleção `/tenants/{tenantId}`. O HQ Central é a autoridade máxima que concede autorização de funcionamento, aprova pedidos de abertura e pode suspender operações comerciais.

```text
               ┌────────────────────────────────────────────────────────┐
               │              1. CADASTRO / ONBOARDING                  │
               │   POST /api/auth/register-merchant (Validação Módulo 11)│
               │   Status Inicial: 'trial' • Loja: Fechada (isOpen:false)│
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │              2. GOVERNANÇA EXECUTIVA HQ                │
               │   PATCH /api/tenants/:id (Apenas Super Admin)          │
               │   Transição para: 'active', 'suspended', 'cancelled'   │
               └───────────────────────────┬────────────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
           🟢 STATUS: 'active'                    🔴 STATUS: 'suspended' / 'trial'
    - Opera PDV, Balcão e Delivery        - Operação comercial bloqueada (403)
    - Visível no Marketplace Regional     - Oculto do Marketplace Público
    - Emissão fiscal e movimentações      - Acesso restrito a relatórios e regularização
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir o cadastro de novos estabelecimentos comerciais com dados reais (Razão Social, Nome Fantasia, CNPJ de 14 dígitos, Endereço completo, Coordenadas geográficas, Segmento e Contato).
- Validar a unicidade e integridade algorítmica do CNPJ no momento da entrada.
- Possibilitar ao Super Admin aprovar novas contas, alterar planos de assinatura, definir limites de terminais conectados e bloquear unidades inadimplentes ou irregulares.
- Garantir que um lojista jamais possa alterar seu próprio plano, status de ativação ou limites de dispositivos.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Onboarding no Servidor:** `src/server/routes/auth.router.ts:110` (`POST /api/auth/register-merchant`).
  - Utiliza função `isValidCnpj(cnpj)` em `src/server/routes/auth.router.ts:17` implementando o algoritmo oficial brasileiro de validação de dígitos verificadores por **Módulo 11**.
  - Exige endereço físico completo (`street`, `number`, `neighborhood`, `city`, `state` de 2 letras e `zipCode` de 8 dígitos numéricos).
  - Provisiona a loja estritamente com `status: 'trial'`, `isOpen: false`, `activeDevicesCount: 1` e `devicesLimit: 2`.
- **Provisionamento Direto via HQ:** `src/server/routes/tenants.router.ts:108` (`POST /api/tenants`).
  - Rota restrita por `requireHqAdmin`. Permite ao HQ criar unidades franqueadas já ativas ou vinculadas a gestores designados.
- **Governança e Atualização de Status:** `src/server/routes/tenants.router.ts:181` (`PATCH /api/tenants/:id`).
  - **Filtro de Segurança Estrito:** Se `req.user?.role !== 'hq_admin'`, o servidor expurga do payload os campos protegidos:
    ```typescript
    delete updates.status;
    delete updates.plan;
    delete updates.devicesLimit;
    delete updates.serviceFeePercent;
    delete updates.cnpj;
    delete updates.id;
    delete updates.createdAt;
    delete updates.ownerUid;
    delete updates.staffUids;
    delete updates.isSimulated;
    ```
- **Auditoria de Alterações:** Toda modificação executada pelo HQ é registrada em `/audit_logs` com usuário, ação e campos afetados.
- **Interface Visual do HQ:** `src/app/components/hq/hq-tenants-list.ts` e `src/app/components/hq/hq-tenant-governance-modal.ts`.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada de Dados:** Formulário de cadastro em `src/app/components/auth/merchant-auth.ts` enviando payload estruturado para `/api/auth/register-merchant`.
- **Filtro de Exibição Pública:** `GET /api/tenants/public` (em `tenants.router.ts:23`) retorna exclusivamente lojas com `status === 'active'`, removendo previamente campos sensíveis (CNPJ, e-mail de contato do proprietário, staffUids e cotas de hardware) através do helper `toPublicStorefront`.
- **Efeito Imediato no Store OS:**
  - Caso o HQ altere o status de uma loja para `'suspended'`, qualquer tentativa subsequente de checkout ou abertura de pedido via PDV ou Storefront no backend falha com:
    ```json
    {
      "status": 403,
      "code": "TENANT_INACTIVE",
      "message": "Estabelecimento \"Nome\" não está ativo para operações comerciais (status: suspended)."
    }
    ```

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Suíte de Segurança:** `src/server/security_phase1.spec.ts`:
  - Validação de rejeição de CNPJ com máscara incorreta ou dígitos verificadores inválidos (retorna HTTP 400 `INVALID_CNPJ`).
  - Validação de duplicidade de CNPJ (retorna HTTP 409 `CNPJ_ALREADY_REGISTERED`).
  - Validação de onboarding em modo `trial` com loja fechada.
  - Bloqueio de alteração de `status` e `plan` por operadores de loja.
- **Suíte de Guerra Comercial:** `src/server/commerce_war_tests.spec.ts`:
  - Validação de que transações de venda são sumariamente bloqueadas quando a empresa está inativa.
- **Resultado:** 100% aprovado nos testes automatizados.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso / Regra | Classificação | Arquivo de Evidência | Observações Técnicas |
|---|---|---|---|
| Validação Algorítmica de CNPJ (Módulo 11) | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts:17` | Valida 1º e 2º dígitos com pesos matemáticos padrão da Receita Federal. |
| Detecção de CNPJ Duplicado | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts:182` | Consulta atômica no Firestore antes de aceitar cadastro. |
| Onboarding em Status Trial | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts:241` | Lojas recém-cadastradas iniciam em `trial` e `isOpen: false`. |
| Bloqueio/Ativação de Empresas pelo HQ | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:181` | Apenas `hq_admin` pode alterar o campo `status`. |
| Sanitização de Dados Públicos de Lojas | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:23` | Remove CNPJ, faturamento e dados privados ao listar para o consumidor. |
| Gestão Multi-Filiais (Matriz e Filiais Vinculadas) | 🟡 **Implementado parcialmente** | `src/shared/models/ecosystem.model.ts` | Suporta múltiplos registros de tenants independentes. Agrupamento formal de filiais sob uma mesma "holding" está mapeado via modelo, mas sem tela específica de árvore societária no HQ. |
| Geolocalização e Raio de Atendimento da Loja | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:142` | Coordenadas `lat`/`lng` e `deliveryRadiusKm` gravados no tenant. |
