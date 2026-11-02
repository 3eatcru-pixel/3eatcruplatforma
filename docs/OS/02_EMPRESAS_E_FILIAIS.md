# 🏬 Store OS — 02: Estrutura da Empresa, Filiais e Multiunidade

## 📌 1. Visão Geral da Arquitetura Multiunidade

No Store OS, uma sessão operacional pertence a **UMA unidade física específica (um único `tenantId`)**. A vinculação de responsável atual também é individual: o fluxo de identidade não permite que a mesma conta seja proprietária de várias lojas. A operação multiunidade de um grupo — com troca de filial dentro da mesma conta — ainda não está implementada.

```text
               ┌────────────────────────────────────────────────────────┐
               │         RESPONSÁVEL DA LOJA (tenant_owner)             │
               │         Sessão vinculada a um tenant                    │
               └───────────────────────────┬────────────────────────────┘
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
          🏬 FILIAL 1: Jardins (tenant-01)     🏬 FILIAL 2: Itaim (tenant-02)
          - PDV Caixa Local                    - PDV Caixa Local
          - Estoque Próprio (Cerveja: 120 un)  - Estoque Próprio (Cerveja: 45 un)
          - 15 Mesas Físicas                   - 8 Mesas Físicas
          - Fechamento de Caixa Próprio        - Fechamento de Caixa Próprio
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: Responsabilidade do módulo Minha Loja
- Permitir ao proprietário ou operador editar o nome e a descrição pública, o horário informativo, a disponibilidade para pedidos, as modalidades de entrega/retirada, o pedido mínimo, a chave PIX e a divisão fixa do custo da entrega entre cliente e loja.
- Deixar taxa, pedido mínimo, descrição e chave PIX realmente sem cadastro quando estiverem vazios; não preencher valores de exemplo.
- Criar lojas novas sem taxa, pedido mínimo ou horário inventado; a entrega começa desativada e a retirada fica habilitada.
- Não misturar a edição do catálogo de produtos, endereço e identidade visual com os campos que a tela atualmente oferece.
- Manter todos os registros e alterações vinculados ao `tenantId` da sessão. Multiunidade continua fora do fluxo implementado.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Modelo de Dados do Estabelecimento (`CompanyTenant`):**
  - Definido em `src/shared/models/ecosystem.model.ts` com atributos de loja:
    - `id`, `name`, `legalName`, `cnpj`, `category`, `plan`, `status`
    - `ownerUid`, `staffUids`
    - `address`: Objeto estruturado com logradouro, número, bairro, cidade, UF e CEP.
    - `deliveryRadiusKm`, `deliveryFee`, `minOrderValue`, `isOpen`
    - `supportsDelivery`, `supportsTakeout`, `supportsReservation`
- **Isolamento de Dados no Servidor (`src/server/core/commerce.engine.ts:87`):**
  - A função `resolveAuthoritativeTenantId` extrai obrigatoriamente o `tenantId` contido nas claims do usuário autenticado. Se o cliente tentar enviar um payload contendo outro `tenantId`, o servidor rejeita a transação com `403 TENANT_MISMATCH`.
- **Interface Minha Loja:**
  - O ID `store-manager` abre `src/app/components/eapps/eapp-store-manager.ts` no desktop. `settings` mantém somente preferências locais.
  - A tela edita nome, descrição pública, horário informativo, estado de abertura, entrega/retirada, taxa paga pelo cliente, complemento da loja ao entregador, pedido mínimo e PIX. Produtos, raio, endereço, telefone e identidade visual não são editados por esta tela.
- **Escopo da sessão:**
  - `EcosystemService.resolveOperationalTenantId()` fixa as operações de proprietário e operador no `tenantId` autenticado. Trocar a loja pública visualizada não concede acesso de edição a outro tenant.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** `PATCH /api/tenants/:id` disparado pela aba de configurações da loja.
- **Proteção de campos:**
  - `PATCH /api/tenants/:id` aceita uma lista explícita de campos de perfil para proprietário/operador e acrescenta `status`, `plan`, `devicesLimit` e `deliveryRadiusKm` apenas para `hq_admin`. Campos fora da lista são rejeitados; vínculo de responsável/equipe e valores legados de comissão/frota não são alterados por este endpoint.
- **Impacto no Marketplace Regional:**
  - Ao marcar `isOpen: false` no Store OS, a loja é imediatamente rotulada como "Fechada" no Marketplace e no Storefront do consumidor, bloqueando checkout online com código `422 STORE_CLOSED`.

### Perspectiva 4: Validação

A auditoria de 2026-11-02 encontrou e corrigiu a descrição que não chegava à vitrine, valores de exemplo nos formulários e no provisionamento, diferenças de estado inicial entre simulação/produção e a falta de allowlist no PATCH. A execução atual de `npm run check` passou com lint, 100/100 testes e build de produção. A suíte usa mocks e não substitui homologação com Firebase real. A troca multiunidade não foi homologada porque não é suportada pelo vínculo atual.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso Multiunidade | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Isolamento Absoluto de Dados por Tenant | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:87` | Impossível ler ou gravar dados entre tenants distintos. |
| Endpoint de alteração de dados da loja | 🟢 **Integrado com escopo validado** | `src/server/routes/tenants.router.ts` e `src/app/components/eapps/eapp-store-manager.ts` | Minha Loja edita nome, descrição pública, horário informativo, aberto/fechado, modalidades, parcela paga pelo cliente, complemento da loja ao entregador, pedido mínimo e chave PIX. Valores opcionais podem ser removidos. O pagamento do motorista permanece direto pela loja. A chave PIX tem limite de 77 caracteres, sem validação de formato, titularidade ou confirmação bancária automática. |
| Controle de Abertura/Fechamento da Loja (`isOpen`) | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:221` | Loja fechada bloqueia pedidos online via código `422 STORE_CLOSED`. |
| Proteção de Campos Corporativos pelo Servidor | 🟢 **Allowlist por perfil** | `src/server/routes/tenants.router.ts` | Campos fora da lista permitida são recusados; o HQ pode alterar os campos de governança previstos. |
| Acesso multiunidade pela mesma conta | ⚪ **Ainda não implementado** | `src/server/routes/tenants.router.ts` e fluxo de vínculo de responsável | A conta de responsável fica vinculada a um tenant; selecionar outra loja pública não muda o escopo da sessão. |
| Transferência de Estoque Entre Filiais (Inter-company transfer) | 🔵 **Planejado, ainda não implementado** | `src/shared/models/ecosystem.model.ts` | Movimentação entre filiais da mesma rede prevista para a versão corporativa. |
