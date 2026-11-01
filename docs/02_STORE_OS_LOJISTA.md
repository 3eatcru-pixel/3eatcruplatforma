# 🏬 02 — Ambiente 2: Store OS Lojista (Sistema Operacional do Estabelecimento)

## 📌 Visão Geral & Escopo

O **Store OS (`/os`, `/pos`)** é o sistema operacional desktop de **UMA unidade física específica**. É utilizado diariamente pelo proprietário da loja, gerentes e operadores de caixa (`tenant_owner`, `operator`).

> 🚨 **FRONTEIRA ESTRITA DE PRODUTO:**
> O Store OS é estritamente limitado ao escopo do seu `tenantId`. Um lojista do Store OS **NÃO enxerga dados de outros estabelecimentos** e **NÃO possui privilégios do HQ Central**. Também não é a tela do cliente consumidor.

---

## Estado atual dos módulos do lojista

O registro de atalhos do Store OS não comprova que uma janela esteja implementada. Nesta auditoria, os domínios abaixo têm serviços e/ou APIs, mas não devem ser descritos como telas integradas quando a janela não existe.

| Domínio | Interface encontrada | Estado |
|---|---|---|
| PDV | Rota standalone `/pos`; atalho no desktop encaminha para ela | Build de produção passou nesta revisão; homologação operacional pendente |
| Pedidos, KDS e mesas | API/serviços; App Garçom separado em `/waiter` | KDS integrado para consulta e avanço de preparo até `ready`; mapa de mesas permanece sem janela |
| Produtos e estoque | API e `InventoryService` | eApp integrado para consulta e cadastro; dados demo só no modo simulado. Ajuste de saldo e trilha de movimentos ainda não disponíveis |
| Financeiro | API e `FinancialsService`; sangria/suprimento no PDV | eApp de consulta somente leitura integrado para proprietário/operador; sem DRE, conciliação ou criação de lançamentos pela janela |
| CRM, WhatsApp e iFood | Domínios parciais e/ou APIs | Sem eApps desktop integrados nesta auditoria |

No modo simulado, os serviços de pedidos, mesas, reservas, financeiro, logística e estoque mantêm dados na memória local. Esses dados não são persistidos nem enviados à fila offline; a troca do modo ou do tenant ativo limpa o estado. Mesas e rotas de demonstração também dão suporte às rotas móveis `/waiter` e `/driver`.

O detalhe por ID do atalho está em `docs/OS/03_APLICATIVOS_E_MODULOS.md`; o fluxo do PDV está em `docs/OS/04_PDV_E_OPERACOES.md`.

---

## 🔒 Segurança e Permissões

- **Rotas Primárias**: `/os`, `/pos`
- **Guarda de Rota**: `storeOperatorGuard`
- **Permissões Exigidas**: `tenant:manage`, `orders:manage_tenant`, `financials:manage_tenant`
- **Mapeamento Backend**: `orders`, `products`, `tables`, `financials`, `logistics` e `tenants.router.ts`
- **Zero-Trust**: Todas as consultas validam obrigatoriamente `tenantId` no servidor.
