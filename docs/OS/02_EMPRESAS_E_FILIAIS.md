# 🏬 Store OS — 02: Estrutura da Empresa, Filiais e Multiunidade

## 📌 1. Visão Geral da Arquitetura Multiunidade

No Store OS, uma sessão operacional pertence a **UMA unidade física específica (um único `tenantId`)**. Se um grupo empresarial possui múltiplas filiais (ex: Matriz Jardins e Filial Itaim), cada filial opera como um ambiente estritamente isolado: estoques independentes, mapas de mesas próprios, caixas físicos individuais e relatórios contábeis separados.

```text
               ┌────────────────────────────────────────────────────────┐
               │         PROPRIETÁRIO MULTI-LOJA (tenant_owner)         │
               │         E-mail vinculado a múltiplos tenants           │
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

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que o gestor configure os dados da sua própria loja (Nome Fantasia, Horário de Funcionamento, Telefone, Raio de Entrega, Taxa de Entrega, Cores do Tema e Logotipo).
- Impedir que operadores de uma filial acessem ou visualizem relatórios de outra filial do mesmo grupo.
- Permitir que um proprietário com múltiplos estabelecimentos alterne a unidade ativa do Store OS sem necessidade de deslogar do sistema.
- Garantir que cada movimentação de estoque ou de caixa seja rigorosamente atribuída ao `tenantId` correspondente.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Modelo de Dados do Estabelecimento (`CompanyTenant`):**
  - Armazenado em `src/shared/models/ecosystem.model.ts:4` com atributos de filial:
    - `id`, `name`, `legalName`, `cnpj`, `category`, `plan`, `status`
    - `ownerUid`, `staffUids`
    - `address`: Objeto estruturado com logradouro, número, bairro, cidade, UF e CEP.
    - `deliveryRadiusKm`, `deliveryFee`, `minOrderValue`, `isOpen`
    - `supportsDelivery`, `supportsTakeout`, `supportsReservation`
- **Isolamento de Dados no Servidor (`src/server/core/commerce.engine.ts:87`):**
  - A função `resolveAuthoritativeTenantId` extrai obrigatoriamente o `tenantId` contido nas claims do usuário autenticado. Se o cliente tentar enviar um payload contendo outro `tenantId`, o servidor rejeita a transação com `403 TENANT_MISMATCH`.
- **Interface de Configuração da Unidade:**
  - O ID `store-manager` abre Minha Loja no desktop; `settings` abre preferências locais do desktop. Hardware e periféricos permanecem sem integração.
  - O endpoint de tenants existe; isso não significa que a edição esteja disponível por uma tela do Store OS.
- **Seletor de Unidades no Ecossistema:**
  - Implementado em `src/app/services/ecosystem.service.ts:currentTenant`, onde o signal reativo mantém a unidade física ativa.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** `PATCH /api/tenants/:id` disparado pela aba de configurações da loja.
- **Proteção do HQ:**
  - Como documentado no HQ, campos como `status`, `plan` e `devicesLimit` são limpos pelo backend quando a requisição parte do lojista (`tenants.router.ts:192`). O lojista pode editar livremente: horário, raio de entrega, contato, telefone, bandeiras de entrega e slug público.
- **Impacto no Marketplace Regional:**
  - Ao marcar `isOpen: false` no Store OS, a loja é imediatamente rotulada como "Fechada" no Marketplace e no Storefront do consumidor, bloqueando checkout online com código `422 STORE_CLOSED`.

### Perspectiva 4: Validação

A suíte geral passou com 94/94 testes, mas usa mocks. Não houve homologação real de troca de unidade e isolamento entre filiais com dados do Firestore.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso Multiunidade | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Isolamento Absoluto de Dados por Tenant | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:87` | Impossível ler ou gravar dados entre tenants distintos. |
| Endpoint de alteração de dados da loja | 🟡 **Integrado parcialmente** | `src/server/routes/tenants.router.ts` e `src/app/components/eapps/eapp-store-manager.ts` | Minha Loja edita perfil, entrega e chave PIX; `settings` mantém preferências locais e não configura dados da loja. A chave PIX é limitada a 77 caracteres, mas não tem validação de formato ou titularidade nem confirmação bancária automática. |
| Controle de Abertura/Fechamento da Loja (`isOpen`) | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:221` | Loja fechada bloqueia pedidos online via código `422 STORE_CLOSED`. |
| Proteção de Campos Corporativos pelo Servidor | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:194` | Lojista não consegue burlar plano ou limites de hardware. |
| Seletor Rápido de Filiais no Topo do Desktop | 🟡 **Implementado parcialmente** | `src/app/services/ecosystem.service.ts` | O serviço suporta alternância de tenant; componente de dropdown visual entre filiais na barra de tarefas está ativo para donos multi-loja. |
| Transferência de Estoque Entre Filiais (Inter-company transfer) | 🔵 **Planejado, ainda não implementado** | `src/shared/models/ecosystem.model.ts` | Movimentação entre filiais da mesma rede prevista para a versão corporativa. |
