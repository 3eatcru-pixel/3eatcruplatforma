# 🏬 02 — Ambiente 2: Store OS Lojista (Sistema Operacional do Estabelecimento)

## 📌 Visão Geral & Escopo

O **Store OS (`/os`, `/pos`)** é o sistema operacional desktop de **UMA unidade física específica**. É utilizado diariamente pelo proprietário da loja, gerentes e operadores de caixa (`tenant_owner`, `operator`).

> 🚨 **FRONTEIRA ESTRITA DE PRODUTO:**
> O Store OS é estritamente limitado ao escopo do seu `tenantId`. Um lojista do Store OS **NÃO enxerga dados de outros estabelecimentos** e **NÃO possui privilégios do HQ Central**. Também não é a tela do cliente consumidor.

---

## 🛠️ Módulos Integrados no Store OS

1. **PDV Balcão & Frente de Caixa (`/pos`)**:
   - Vendas rápidas de balcão com seleção de produtos, descontos e formas de pagamento.
   - Sangria, suprimento e fechamento cego de caixa.

2. **KDS — Kitchen Display System**:
   - Tela da cozinha para recepção e avanço de pedidos por estação em tempo real.

3. **Mapa de Mesas & Comandas**:
   - Controle de ocupação de mesas físicas, tempo de permanência e divisão de conta.

4. **Estoque NFe & ERP Financeiro**:
   - Gestão de estoque com baixa automática nas vendas e DRE da loja.

5. **CRM & Canal WhatsApp**:
   - Notificações automáticas de status de pedido diretamente ao WhatsApp do cliente.

---

## 🔒 Segurança e Permissões

- **Rotas Primárias**: `/os`, `/pos`
- **Guarda de Rota**: `storeOperatorGuard`
- **Permissões Exigidas**: `tenant:manage`, `orders:manage_tenant`, `financials:manage_tenant`
- **Mapeamento Backend**: `orders`, `products`, `tables`, `financials`, `logistics` e `tenants.router.ts`
- **Zero-Trust**: Todas as consultas validam obrigatoriamente `tenantId` no servidor.
