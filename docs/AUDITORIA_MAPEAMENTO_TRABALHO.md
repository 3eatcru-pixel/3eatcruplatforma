# Auditoria de Mapeamento Profundo (Trabalho)

## Objetivo
Mapear funcionalidades HQ e OS para alimentar a documentação do 3EATCRU seguindo as 4 perspectivas solicitadas.

## Estrutura de Classificação
- [I] Implementado e comprovado
- [P] Implementado parcialmente
- [L] Planejado, ainda não implementado
- [X] Não localizado no código
- [!] Inconsistente ou com defeito

---

## 1. HQ Central
## 1. HQ Central
- **Funcionalidades:**
    - Gestão de Empresas (Tenants): `hq-tenants-list.ts`, `hq-tenant-governance-modal.ts` [I]
    - CRM Global: `hq-crm.ts` [I]
    - Gestão de Planos/Pricing: `hq-plans-pricing.ts` [L]
    - Auditoria e Governança: `hq-audit.ts` [L]
    - Configurações do Sistema: `hq-system-config.ts` [L]
    - Gestão de Dispositivos: `hq-devices-list.ts` [L]
- **Perspectiva Funcional:** Central de comando para administradores da plataforma.
- **Implementação:** Standalone components em Angular, servidos pelo `EcosystemService`.

## 2. OS Lojista
- **Funcionalidades:**
    - PDV: `pos-window.ts`, `pos-cart.ts` [I]
    - Estoque: `inventory-window.ts`, `inventory-table.ts` [I]
    - Financeiro: `finance-window.ts`, `finance-ledger.ts` [I]
    - CRM de Loja: `crm-window.ts` [L]
    - Garçom: `waiter-app.ts` [I]
    - Entregador: `driver-app.ts` [I]
- **Perspectiva Funcional:** Operação de ponta a ponta do lojista.
- **Implementação:** Componentes de janelas e apps dedicados.

---
## 3. Integração HQ-OS
- **Status:** [P] Baseado no `EcosystemService` e `hq-api.service.ts`.

---
## Notas
- Baseado na análise inicial de `src/app/components/hq` e `src/app/components/os-windows`.
- Próximo passo: Análise detalhada dos arquivos.
