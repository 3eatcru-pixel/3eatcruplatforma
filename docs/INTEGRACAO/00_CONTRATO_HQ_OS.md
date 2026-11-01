# 🤝 Integração — 00: Contrato de Comunicação e Governança entre HQ e Store OS

## 📌 1. Visão Geral do Contrato Arquitetural HQ ↔ OS

A relação entre o **HQ Central** e o **Store OS Lojista** é regida por um contrato de responsabilidades. O HQ recebe a assinatura do lojista pelo uso do sistema e pela cota de dispositivos; a cobrança recorrente ainda não está integrada. A loja recebe diretamente os pagamentos dos seus pedidos e administra sua frota própria, incluindo a remuneração. O acesso a entregadores da plataforma e a comissão por entregas da rede seguem em “Em breve”.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MATRIZ DE PROPRIEDADE DOS DADOS                 │
├──────────────────────────────┬──────────────────┬──────────────────────┤
│ Entidade de Dados            │ Criador Primário │ Proprietário dos Dados│
├──────────────────────────────┼──────────────────┼──────────────────────┤
│ Planos SaaS (/plans)         │ HQ Central       │ HQ Central           │
│ Taxa da Rede (/hq_settings)  │ HQ Central       │ HQ Central           │
│ Tenant Status & Licença      │ HQ Central       │ HQ Central           │
│ Produtos e Cardápio          │ Store OS         │ Estabelecimento      │
│ Pedidos e Vendas Balcão      │ Store OS         │ Estabelecimento      │
│ Mapa de Mesas e Comandas     │ Store OS         │ Estabelecimento      │
│ Livro-Caixa e Despesas       │ Store OS         │ Estabelecimento      │
│ Dispositivos Físicos (/dev)  │ Store OS / HQ    │ Compartilhado (MDM)  │
│ Estimativa HQ de entregas   │ HQ (consulta)    │ Derivada; sem escrita │
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
- **Filtro de Governança no Backend (`src/server/routes/tenants.router.ts`):**
  - O Store OS pode alterar seus dados comerciais (nome, telefone, horário, taxa de entrega, raio de atuação).
  - O Lojista **não pode alterar:** `status`, `plan`, `devicesLimit` ou `cnpj`. `ownerUid` e `staffUids` são removidos do payload de PATCH para qualquer papel e são mantidos por fluxos de identidade dedicados. `serviceFeePercent` é um campo legado ignorado; o checkout usa `deliveryFee` como valor fixo de entrega.
- **Efeito do Bloqueio pelo HQ (`src/server/core/commerce.engine.ts`):**
  - Quando o HQ altera `status: 'suspended'` em `/tenants/{id}`, a máquina de vendas `executeCommercialOrder` trava imediatamente qualquer nova venda com `403 TENANT_INACTIVE`.
  - A loja é retirada automaticamente da listagem pública (`tenants.router.ts`).
- **Resolução de Identidade por Custom Claims (`src/server/middleware/auth.middleware.ts`):**
  - O `tenantId` é extraído do Bearer Token assinado criptograficamente pelo Firebase.
  - A consulta ao banco utiliza `where('tenantId', '==', user.tenantId)`. Tentativa de injeção manual no corpo HTTP é rejeitada com `403 TENANT_MISMATCH`.
- **Tratamento de Concorrência e Duplicação:**
  - O contrato exige o cabeçalho `X-Idempotency-Key` ou campo `idempotencyKey` no payload.
  - Transações do Firestore (`adminDb.runTransaction`) garantem isolamento serializável em operações simultâneas de estoque e pagamento.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Fluxo do HQ para o OS:** O Store OS assina ou consulta dados do tenant via `GET /api/tenants/:id` e telemetria de dispositivos via `GET /api/hq/devices?tenantId=:id`.
- **Fluxo do OS para o HQ:** O Store OS reporta dados agregados de venda e status de dispositivos (`lastPing`, `batteryLevel`, `appVersion`).
- **Motoristas da loja:** São cadastrados como `private`; a loja usa o App do Entregador para facilitar rotas e baixas e decide a remuneração. O app não processa o pagamento.
- **Receita dos pedidos:** Pertence à loja e não deve transitar pela conta do HQ. O PIX usa a chave cadastrada no tenant. Cartão real está bloqueado até que cada loja tenha uma conta de adquirência conectada.
- **Assinatura do lojista:** É paga ao HQ pelo uso do Store OS e pela cota de dispositivos do plano. A cobrança recorrente automática ainda não existe.
- **Serviço futuro de entregadores do HQ:** Para loja sem motorista próprio, será uma opção comercial do HQ quando a frota própria e a inteligência operacional estiverem prontas. Preço e contratação estão pendentes.
- **Comissão da plataforma:** O estado `platformDeliveryCommissionStatus` começa como `coming_soon`. Não há cálculo nem cobrança ativos. O futuro processo de 8% ficará separado do plano SaaS e do caixa do lojista e dependerá da rede própria e da inteligência operacional.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- As suítes `src/server/commerce_war_tests.spec.ts` e `src/server/security_phase1.spec.ts` cobrem cenários de isolamento, idempotência, tenant inativo e autorização do HQ. Elas não foram executadas nesta revisão; o resultado de aprovação anterior não foi revalidado.

---

## 📊 3. Matriz de Classificação de Maturidade do Contrato

| Regra Contratual HQ ↔ OS | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Soberania de Dados Comerciais do Lojista | Implementado (não retestado nesta revisão) | `src/server/routes/tenants.router.ts` | Lojista edita dados comerciais permitidos; os vínculos de identidade ficam em rotas dedicadas. |
| Bloqueio Imediato de Operação por Suspensão no HQ | Implementado (não retestado nesta revisão) | `src/server/core/commerce.engine.ts` | Mudança de status para inativo bloqueia novas vendas. |
| Imutabilidade de Planos e Limites pelo Lojista | Implementado (não retestado nesta revisão) | `src/server/routes/tenants.router.ts` | Servidor remove campos restritos enviados por usuário da loja. |
| Proteção de escopo entre lojas | Implementado (não retestado nesta revisão) | `src/server/core/commerce.engine.ts` | `TENANT_MISMATCH` rejeita operações fora do tenant autorizado. |
| Idempotência de pedidos e estoque no Commerce Engine | Implementado (não retestado nesta revisão) | `src/server/core/commerce.engine.ts` | Cobertura da idempotência de pagamentos é separada e ainda não foi implementada. |
| Notificação de comandos HQ em tempo real | Não localizada | src/server/routes/hq.router.ts | Há consultas/snapshots de dados; não foi localizado canal WebSocket ou push de comandos. |
