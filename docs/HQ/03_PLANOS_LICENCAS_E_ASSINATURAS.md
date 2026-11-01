# 🏛️ HQ Central — 03: Planos, Licenças, Assinaturas e Períodos de Teste

## 📌 1. Visão Geral da Política de Licenciamento SaaS

O modelo de monetização e governança do 3EATCRU é baseado em planos de licenciamento por cotas de hardware operacional e módulos ativados. O HQ Central é o único ambiente com autoridade para cadastrar planos, estipular valores de mensalidade e definir o teto de dispositivos simultâneos (`devicesLimit`) por estabelecimento.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          CATÁLOGO DE PLANOS                            │
├─────────────────┬────────────────────┬──────────────────┬──────────────┤
│ Plano           │ Mensalidade Padrão │ Teto Dispositivos│ Módulos      │
├─────────────────┼────────────────────┼──────────────────┼──────────────┤
│ Starter         │ R$ 149,00 / mês    │ Até 2 Terminais  │ PDV Caixa    │
│ Professional    │ R$ 299,00 / mês    │ Até 5 Terminais  │ Full ERP     │
│ Enterprise      │ R$ 599,00 / mês    │ Até 20 Terminais │ MDM Supremo  │
└─────────────────┴────────────────────┴──────────────────┴──────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que novos clientes iniciem com um período de degustação (`trial`), com restrições de uso comercial até homologação formal.
- Permitir ao Super Admin atualizar as características e preços dos planos públicos da plataforma.
- Bloquear automaticamente a conexão de novos terminais de PDV físicos quando o estabelecimento atingir ou exceder o limite contratado em seu plano (`activeDevicesCount > devicesLimit`).
- Permitir ao HQ conceder upgrades ou downgrades de plano por tenant.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Definição de Planos Padrão:** Em `src/server/routes/hq.router.ts:34` (`DEFAULT_SAAS_PLANS`), armazenando a estrutura de planos em `/plans/{id}` no Firestore.
- **Consulta Pública de Planos:** `GET /api/hq/plans` (`hq.router.ts:485`) aberto para consulta na landing page ou aplicativo do lojista.
- **Atualização de Planos pelo HQ:** `PATCH /api/hq/plans/:id` (`hq.router.ts:499`), restrito via middleware `requireHqAdmin`.
- **Cotas de Terminais por Plano:**
  - Configurado no provisionamento de tenants (`tenants.router.ts:161`):
    ```typescript
    devicesLimit: body.plan === 'Enterprise' ? 20 : body.plan === 'Professional' ? 5 : 2
    ```
- **Auditoria de Violação de Cotas:**
  - O motor de auditoria em `src/server/routes/hq.router.ts:358` verifica:
    ```typescript
    if (t.activeDevicesCount > t.devicesLimit) {
      issues.push(`Estabelecimento [${t.name}] excedeu limite de terminais.`);
    }
    ```
- **Interface Visual do HQ:** `src/app/components/hq/hq-plans-pricing.ts` permitindo ajuste de valores e limites diretamente no dashboard administrativo.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Operador no HQ altera planos via interface ou faz upgrade de uma empresa específica via modal de governança (`src/app/components/hq/hq-tenant-governance-modal.ts`).
- **Comunicação com o Store OS:**
  - Ao inicializar o Store OS (`src/app/components/client-os.ts`), o frontend consulta os dados do tenant e o array de dispositivos registrados.
  - A tentativa de parear um dispositivo excedente pelo lojista é barrada se a contagem atingir o limite estipulado pelo HQ.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/services/hq-api.service.spec.ts`: Valida a busca e atualização de planos de assinatura pelo HQ.
  - `src/server/routes/hq.router.ts` (testado via `security_phase1.spec.ts`): Confirmação de que lojistas comuns são impedidos de chamar `PATCH /api/hq/plans/:id`.
- **Resultado:** Aprovado em todos os testes unitários e de integração.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso / Regra | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Definição Centralizada de Planos SaaS | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:34` | Catálogo Starter, Professional e Enterprise persistido no Firestore `/plans`. |
| Limite de Dispositivos por Plano | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:161` | 2 terminais para Starter, 5 para Pro e 20 para Enterprise. |
| Período de Teste (Trial) no Onboarding | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts:241` | Novas lojas entram em `trial` e necessitam aprovação de plano. |
| Alteração de Plano e Cotas pelo HQ | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:181` | Super Admin pode alterar campos `plan` e `devicesLimit` de qualquer empresa. |
| Suspensão por Inadimplência | 🟡 **Implementado parcialmente** | `src/server/routes/tenants.router.ts:181` | HQ pode marcar `status: 'suspended'` manualmente; automação de corte baseada em webhook de gateway de pagamento recorrente está planejada. |
| Cobrança Recorrente de Assinatura via Cartão/Boleto | 🟡 **Implementado parcialmente** | `src/server/routes/payments.router.ts` | Suporte a transações avulsas via Stripe/Pix pronto; integração com engine de recorrência (Stripe Billing/Subscriptions) em planejamento. |
