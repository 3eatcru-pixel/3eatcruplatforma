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
| Pedidos, KDS e mesas | API/serviços; App Garçom separado em `/waiter` | KDS integrado para consulta/avanço até `ready`; Mesas e Agenda integradas para salão e reservas |
| Produtos e estoque | API, `InventoryService`, `stock-audits.router.ts` e `suppliers.router.ts` | eApps integrados para consulta/cadastro de produtos, diretório de fornecedores e registro de contagens divergentes. Contagem não altera saldo automaticamente; compra e recebimento ainda não estão disponíveis |
| Financeiro | API e `FinancialsService`; sangria/suprimento no PDV | eApp de consulta somente leitura integrado para proprietário/operador; sem DRE, conciliação ou criação de lançamentos pela janela |
| CRM e logística | APIs de pedidos/CRM/logística e serviços de domínio | eApps integrados para resumo de clientes e gestão da frota da loja/rotas; sem fidelidade, campanhas externas ou rede de entregadores da plataforma |
| RH, tarefas e O.S. | Routers de RH, tarefas e ordens de serviço | Cadastro básico de equipe e ponto manual, checklist e fluxo operacional de O.S. por unidade; sem folha, atribuição individual, cobrança ou pagamento |
| Notas e calendário | `/api/notes` e reservas | Notas privadas persistidas por operador e calendário de reservas somente leitura; operações seguem no eApp Agenda |
| WhatsApp e iFood | Domínios parciais e/ou APIs | Sem integração de provedor, webhook ou envio externo |

No modo simulado, pedidos, mesas, reservas, financeiro, logística e estoque mantêm dados locais; conferências de estoque também ficam apenas na sessão. Notas, RH, fornecedores, tarefas e ordens de serviço não chamam as APIs reais durante a simulação, evitando escrita acidental em dados operacionais. Esses dados não são enviados à fila offline; a troca do modo ou do tenant ativo limpa o estado. Mesas e rotas de demonstração também dão suporte às rotas móveis `/waiter` e `/driver`.

O detalhe por ID do atalho está em `docs/OS/03_APLICATIVOS_E_MODULOS.md`; o fluxo do PDV está em `docs/OS/04_PDV_E_OPERACOES.md`.

---

## 🔒 Segurança e Permissões

- **Rotas Primárias**: `/os`, `/pos`
- **Guarda de Rota**: `storeOperatorGuard`
- **Permissões Exigidas**: `tenant:manage`, `orders:manage_tenant`, `financials:manage_tenant`
- **Mapeamento Backend**: `orders`, `products`, `tables`, `financials`, `logistics` e `tenants.router.ts`
- **Zero-Trust**: Todas as consultas validam obrigatoriamente `tenantId` no servidor.
