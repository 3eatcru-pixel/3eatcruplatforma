# 🤝 Integração — 00: Contrato de Comunicação e Governança entre HQ e Store OS

## 📌 1. Visão Geral do Contrato Arquitetural HQ ↔ OS

A relação entre o **HQ Central** e o **Store OS Lojista** é regida por um contrato rígido de responsabilidades. O princípio basilar é a **autonomia operacional local sob governança de rede**: o HQ dita as regras do jogo (planos, taxas de split, bloqueios de segurança e homologação de hardware), enquanto o Store OS é o soberano exclusivo de sua operação cotidiana (estoque, vendas, comandas e equipe).

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MATRIZ DE PROPRIEDADE DOS DADOS                 │
├──────────────────────────────┬──────────────────┬──────────────────────┤
│ Entidade de Dados            │ Criador Primário │ Proprietário dos Dados│
├──────────────────────────────┼──────────────────┼──────────────────────┤
│ Planos SaaS (/plans)         │ HQ Central       │ HQ Central           │
│ Taxa Global (/hq_settings)   │ HQ Central       │ HQ Central           │
│ Tenant Status & Licença      │ HQ Central       │ HQ Central           │
│ Produtos e Cardápio          │ Store OS         │ Estabelecimento      │
│ Pedidos e Vendas Balcão      │ Store OS         │ Estabelecimento      │
│ Mapa de Mesas e Comandas     │ Store OS         │ Estabelecimento      │
│ Livro-Caixa e Despesas       │ Store OS         │ Estabelecimento      │
│ Dispositivos Físicos (/dev)  │ Store OS / HQ    │ Compartilhado (MDM)  │
│ Split e Comissões (/ledger)  │ Backend Automát. │ Compartilhado        │
└──────────────────────────────┴──────────────────┴──────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Definir com clareza o que o HQ pode alterar em um lojista e o que ele é terminantemente proibido de alterar.
- Definir o que o Store OS pode solicitar ao HQ (ex: upgrade de plano, pareamento de novos terminais).
- Especificar o comportamento determinístico do sistema quando uma licença expira ou uma empresa é bloqueada.
- Garantir que um estabelecimento nunca consiga ler ou gravar informações de outro estabelecimento.
- Tratar falhas transitórias de conexão, requisições duplicadas e operações concorrentes.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Filtro de Governança no Backend (`src/server/routes/tenants.router.ts:192`):**
  - O Store OS pode alterar seus dados comerciais (nome, telefone, horário, taxa de entrega, raio de atuação).
  - O Lojista **não pode alterar:** `status`, `plan`, `devicesLimit`, `serviceFeePercent`, `cnpj`, `ownerUid`, `staffUids`. Tentativas são ignoradas pelo servidor.
- **Efeito Imediato do Bloqueio pelo HQ (`src/server/core/commerce.engine.ts:194`):**
  - Quando o HQ altera `status: 'suspended'` em `/tenants/{id}`, a máquina de vendas `executeCommercialOrder` trava imediatamente qualquer nova venda com `403 TENANT_INACTIVE`.
  - A loja é retirada automaticamente da listagem pública (`tenants.router.ts:25`).
- **Resolução de Identidade por Custom Claims (`src/server/core/commerce.engine.ts:87`):**
  - O `tenantId` é extraído do Bearer Token assinado criptograficamente pelo Firebase.
  - A consulta ao banco utiliza `where('tenantId', '==', user.tenantId)`. Tentativa de injeção manual no corpo HTTP é rejeitada com `403 TENANT_MISMATCH`.
- **Tratamento de Concorrência e Duplicação:**
  - O contrato exige o cabeçalho `X-Idempotency-Key` ou campo `idempotencyKey` no payload.
  - Transações do Firestore (`adminDb.runTransaction`) garantem isolamento serializável em operações simultâneas de estoque e pagamento.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Fluxo do HQ para o OS:** O Store OS assina ou consulta dados do tenant via `GET /api/tenants/:id` e telemetria de dispositivos via `GET /api/hq/devices?tenantId=:id`.
- **Fluxo do OS para o HQ:** O Store OS reporta dados agregados de venda e status de dispositivos (`lastPing`, `batteryLevel`, `appVersion`).
- **Split Financeiro:** Ao fechar cada venda no PDV ou Storefront, o backend calcula a fatia de 8% do SaaS e 92% da loja, gravando em `/financials` e refletindo em `/api/hq/ledger`.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/commerce_war_tests.spec.ts`:
    - **Guerra 7:** Bloqueio transversal de Tenant (usuário da Loja A tenta alterar estoque da Loja B -> Rejeitado com HTTP 403 `TENANT_MISMATCH`).
    - **Guerra 4:** Idempotência tripla em reenvios de pedidos.
  - `src/server/security_phase1.spec.ts`:
    - Validação de que loja com status inativo rejeita vendas com `403 TENANT_INACTIVE`.
    - Validação de bloqueio de operadores em endpoints do HQ Central.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade do Contrato

| Regra Contratual HQ ↔ OS | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Soberania de Dados Comerciais do Lojista | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:181` | Lojista edita cardápio, estoque e expediente com total autonomia. |
| Bloqueio Imediato de Operação por Suspensão no HQ | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:194` | Mudança de status para inativo aborta novas vendas com `403`. |
| Imutabilidade de Planos e Limites pelo Lojista | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:193` | Servidor expurga campos restritos enviados pelo operador da loja. |
| Proteção Absoluta Anti-Invasão entre Lojas | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:102` | `TENANT_MISMATCH` impede qualquer acesso cruzado de dados. |
| Reconciliação Transacional de Conflitos e Duplicidade | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:149` | Idempotência e transação atômica eliminam duplicações. |
| Notificação Push Instantânea de Comandos HQ no Store OS | 🟡 **Implementado parcialmente** | `src/server/routes/hq.router.ts:270` | O Store OS atualiza dados via polling/snapshot; WebSockets diretos para comandos de trava imediata em homologação. |
