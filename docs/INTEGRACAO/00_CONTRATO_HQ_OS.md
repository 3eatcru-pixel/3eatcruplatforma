# 🤝 Integração — 00: Contrato de Comunicação e Governança entre HQ e Store OS

## 📌 1. Visão Geral do Contrato Arquitetural HQ ↔ OS

A relação entre o **HQ Central** e o **Store OS Lojista** é regida por um contrato de responsabilidades. O HQ cobra a assinatura mensal por checkout recorrente Mercado Pago ou Stripe, confirmado por webhook assinado. A loja recebe diretamente os pagamentos dos seus pedidos e administra sua frota própria, incluindo a remuneração. A comissão futura de 8% só incidirá em entregas elegíveis da rede da plataforma e permanece em “Em breve”.

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
│ Registros em /devices        │ HQ               │ Inventário; sem MDM físico ou telemetria │
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
  - Proprietário/operador pode alterar nome, descrição pública, horário informativo, disponibilidade, modalidades, taxa paga pelo cliente (`deliveryFee`), complemento da loja ao entregador (`storeDeliveryContribution`), pedido mínimo e chave PIX. O PATCH aceita somente esses campos e rejeita os demais; campos como `status`, `plan`, `devicesLimit`, `deliveryRadiusKm` e `cnpj` não são editáveis pelo lojista.
  - `ownerUid` e `staffUids` não são alterados pelo PATCH e são mantidos por fluxos de identidade dedicados. `serviceFeePercent` é um campo legado ignorado; o checkout soma ao total do cliente somente `deliveryFee`. O compromisso de remuneração é a soma de `deliveryFee + storeDeliveryContribution`, sem transferência automática ao motorista. Lojas novas não recebem taxa, pedido mínimo ou horário de exemplo.
- **Efeito do Bloqueio pelo HQ (`src/server/core/commerce.engine.ts`):**
  - Quando o HQ altera `status: 'suspended'` em `/tenants/{id}`, a máquina de vendas `executeCommercialOrder` trava imediatamente qualquer nova venda com `403 TENANT_INACTIVE`.
  - A loja é retirada automaticamente da listagem pública (`tenants.router.ts`).
- **Resolução de Identidade por Custom Claims (`src/server/middleware/auth.middleware.ts`):**
  - O `tenantId` é extraído do Bearer Token assinado criptograficamente pelo Firebase.
  - A consulta ao banco utiliza `where('tenantId', '==', user.tenantId)`. Tentativa de injeção manual no corpo HTTP é rejeitada com `403 TENANT_MISMATCH`.
- **Tratamento de Concorrência e Duplicação:**
  - As operações comerciais que passam pelo Commerce Engine aceitam `X-Idempotency-Key` ou `idempotencyKey` conforme a rota.
  - Transações do Firestore protegem as operações cobertas pelo motor. Tentativas do PSP ainda não têm idempotência externa nem conciliação.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Fluxo do HQ para o OS:** O Store OS consulta os dados autorizados do tenant e lê o aviso/configuração pública durante a sincronização. `/api/hq/devices` é inventário administrativo do HQ, não telemetria consumida pelo Store OS.
- **Fluxo do OS para o HQ:** Não há envio periódico de vendas agregadas nem heartbeat de dispositivos. O HQ consulta pedidos elegíveis sob demanda em `GET /api/hq/tenants/:id/metrics`; campos de telemetria legados não comprovam estado físico.
- **Motoristas da loja:** São cadastrados como `private`; a loja usa o App do Entregador para facilitar rotas e baixas e decide a remuneração. O app não processa o pagamento.
- **Receita dos pedidos:** Pertence à loja e não deve transitar pela conta do HQ. O PIX usa a chave cadastrada no tenant. Cartão real está bloqueado até que cada loja tenha uma conta de adquirência conectada.
- **Assinatura do lojista:** É paga ao HQ pelo acesso completo ao Store OS; todos os planos liberam os mesmos módulos disponíveis. O plano diferencia a cota de dispositivos. O HQ gera checkout recorrente e acompanha faturas via Mercado Pago ou Stripe, conforme credenciais instaladas.
- **Cobrança da assinatura:** `POST /api/billing/hq/subscriptions/:tenantId/checkout` lê e-mail e plano no servidor; nenhum valor enviado pelo navegador é aceito. Webhooks assinados atualizam o estado e as faturas. Inadimplência ainda não suspende automaticamente o tenant.
- **Serviço futuro de entregadores do HQ:** Quando a rede própria e a inteligência operacional estiverem prontas, lojas que usarem entregadores da plataforma estarão sujeitas à comissão de 8% por entrega elegível.
- **Comissão da plataforma:** O estado `platformDeliveryCommissionStatus` fica em `coming_soon` enquanto a rede própria e a inteligência operacional não estiverem prontas. A trava do servidor também ignora valores `active` antigos salvos no Firestore. A cobrança fica separada do plano SaaS, dos pedidos da loja e da remuneração dos motoristas próprios.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- Nesta auditoria, `npm run test:ci` passou com 100/100 testes; as suítes `src/server/commerce_war_tests.spec.ts` e `src/server/security_phase1.spec.ts` cobrem cenários de isolamento, idempotência, tenant inativo e autorização do HQ. A execução usa mocks e não homologa Firebase real, PSP ou hardware.

---

## 📊 3. Matriz de Classificação de Maturidade do Contrato

| Regra Contratual HQ ↔ OS | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Soberania de Dados Comerciais do Lojista | Implementado; suíte CI aprovada nesta revisão | `src/server/routes/tenants.router.ts` | Lojista edita dados comerciais permitidos; os vínculos de identidade ficam em rotas dedicadas. |
| Bloqueio Imediato de Operação por Suspensão no HQ | Implementado; suíte CI aprovada nesta revisão | `src/server/core/commerce.engine.ts` | Mudança de status para inativo bloqueia novas vendas. |
| Imutabilidade de Planos e Limites pelo Lojista | Implementado; suíte CI aprovada nesta revisão | `src/server/routes/tenants.router.ts` | Servidor remove campos restritos enviados por usuário da loja. |
| Proteção de escopo entre lojas | Implementado; suíte CI aprovada nesta revisão | `src/server/core/commerce.engine.ts` | `TENANT_MISMATCH` rejeita operações fora do tenant autorizado. |
| Idempotência de pedidos e estoque no Commerce Engine | Implementado; suíte CI aprovada nesta revisão | `src/server/core/commerce.engine.ts` | Idempotência no PSP e conciliação de pagamentos continuam pendentes. |
| Notificação de comandos HQ em tempo real | Não localizada | src/server/routes/hq.router.ts | Há consultas/snapshots de dados; não foi localizado canal WebSocket ou push de comandos. |
