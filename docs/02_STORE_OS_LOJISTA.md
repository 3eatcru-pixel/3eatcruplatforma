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
| PDV | Rota standalone `/pos`; atalho no desktop encaminha para ela | Implementado no código, build/homologação pendentes nesta revisão |
| Pedidos, KDS e mesas | API/serviços; App Garçom separado em `/waiter` | Sem janelas KDS ou mapa de mesas integrados |
| Produtos e estoque | API e `InventoryService` | Sem janela de estoque; dados demo só no modo simulado |
| Financeiro | API e `FinancialsService`; sangria/suprimento no PDV | Sem janela financeira/DRE integrada |
| CRM, WhatsApp e iFood | Domínios parciais e/ou APIs | Sem eApps desktop integrados nesta auditoria |

O detalhe por ID do atalho está em `docs/OS/03_APLICATIVOS_E_MODULOS.md`; o fluxo do PDV está em `docs/OS/04_PDV_E_OPERACOES.md`.

---

## 🔒 Segurança e Permissões

- **Rotas Primárias**: `/os`, `/pos`
- **Guarda de Rota**: `storeOperatorGuard`
- **Permissões Exigidas**: `tenant:manage`, `orders:manage_tenant`, `financials:manage_tenant`
- **Mapeamento Backend**: `orders`, `products`, `tables`, `financials`, `logistics` e `tenants.router.ts`
- **Zero-Trust**: Todas as consultas validam obrigatoriamente `tenantId` no servidor.
