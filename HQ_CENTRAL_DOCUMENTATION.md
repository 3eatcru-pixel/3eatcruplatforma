# 📖 DOCUMENTAÇÃO EXECUTIVA — HQ CENTRAL (3EATCRU V7.0)

> Para a visão detalhada de contratos e fronteiras de API deste pilar e sua conexão com os demais 6 pilares do ecossistema, consulte **[docs/PILAR_1_HQ_CENTRAL.md](./docs/PILAR_1_HQ_CENTRAL.md)** e **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## 🏛️ 1. Papel do HQ Central na Arquitetura de 7 Pilares

O **HQ Central** (`/hq`, login dedicado em `/hq/login`) é o **Pilar 1** do ecossistema: o gabinete executivo exclusivo do **Proprietário / Administrador Geral da Plataforma SaaS (`hq_admin`)**.

- **Isolamento Estrito de Domínio:**
  - `/api/hq/*` concentra **apenas** governança global da plataforma (visão consolidada, planos SaaS, comissão padrão, dispositivos MDM, banner regional e auditoria master).
  - Operações de entregadores foram desacopladas para `/api/logistics/drivers*` ([Pilar 6](./docs/PILAR_6_APP_ENTREGADOR_E_LOGISTICA.md)), reservas para `/api/reservations*` ([Pilares 2, 4 e 5](./docs/PILAR_2_STORE_OS_LOJISTA.md)) e o diretório de clientes para `/api/crm/consumers`, eliminando qualquer mistura de rotas administrativas do HQ com janelas operacionais do Store OS.
- **Autoridade Verificada:** Exige Custom Claim `role === 'hq_admin'` ou identidade Super Admin com `email_verified === true` registrada em `/admins/{uid}` (sem aceitação de curingas `@3eatcru.com` e sem leitura de privilégio a partir de `/users/{uid}`).

---

## 🛡️ 2. Módulos e Sub-abas do HQ Central

### 2.1. Portfólio de Lojas (`tenants`) — 🟢 REAL
- **Provisionamento e Homologação:** Lojas cadastradas pelo portal de parceiros iniciam em `status: 'trial'` e `isOpen: false` com CNPJ de 14 dígitos e endereço validado. O HQ Central promove para `active` (liberando exposição em `/api/tenants/public` no [Pilar 3](./docs/PILAR_3_MARKETPLACE_REGIONAL.md) e [Pilar 4](./docs/PILAR_4_VITRINE_PUBLICA_E_AUTOATENDIMENTO.md)) ou aplica `suspended` (bloqueando novos pedidos com `403 TENANT_INACTIVE`).
- **Governança Individual (`HqTenantGovernanceModalComponent`):** Ajuste de split de comissão da loja, limite de terminais MDM e parâmetros operacionais persistidos no Cloud Firestore (`/tenants/{tenantId}`).

### 2.2. Planos Comerciais SaaS (`plans`) — 🟢 REAL
- **Regra Comercial Unificada:** 100% dos módulos operacionais do ecossistema estão disponíveis em todos os planos; a escada de valor é definida pelo limite de dispositivos MDM simultâneos (`Starter`: 2, `Professional`: 6, `Enterprise`: ilimitados), persistida em `/plans/{planId}` via `PATCH /api/hq/plans/:id`.

### 2.3. Tesouraria & Split SaaS (`ledger`) — 🟡 BETA
- **Consolidação Real:** Soma apenas pedidos efetivamente liquidados (`paymentStatus === 'paid'`) através do `CommerceEngine` e `/api/payments` ([Pilar 7](./docs/PILAR_7_NUCLEO_BACKEND_OFFLINE_E_SEGURANCA.md)).
- **Comissão Global:** Parametrização persistida em `/hq_settings/global` via `PATCH /api/hq/system/commission` (`{ percent: number }`, padrão 8%).

### 2.4. Portal Regional (`regional`) — 🟢 REAL
- **Segregação Privado vs Público:** Configurações sensíveis permanecem em `/hq_settings/global` (restritas a `isAdmin()`), enquanto o banner hero, subtítulo e destaques do Marketplace são gravados em `/public_regional/default` e servidos publicamente em `GET /api/hq/regional`.

### 2.5. Frota MDM & Supervisão de Entregadores (`devices`) — 🟡 BETA
- **Terminais POS:** Inventário filtrável por loja ou nó central (`/devices/{deviceId}`) com comandos auditados de bloqueio (`POST /api/hq/devices/:id/lock`) e reinício (`POST /api/hq/devices/:id/restart`).
- **Supervisão Global de Entregadores:** Consulta global via `/api/logistics/drivers` e disparo de ping via `/api/logistics/drivers/:id/ping`.

### 2.6. CRM Global (`consumers`) — 🟡 BETA
- Diretório consolidado de consumidores consultado via `GET /api/crm/consumers` com proteção de PII em `firestore.rules`.

### 2.7. Auditoria Master (`audit`) — 🟢 REAL
- `POST /api/hq/audit/run` inspeciona integridade aritmética dos pedidos (`subtotal + deliveryFee - discount === total`), consistência de estoque e livro-razão no Cloud Firestore, gravando relatório imutável em `/audit_logs`.

### 2.8. Console de Auditoria Mobile Android (`apps_preview`) — 🔵 MOCK (Homologação Visual)
- Simulador visual em chassi de smartphone/tablet para inspeção de layout dos aplicativos `/driver`, `/marketplace`, `/waiter` e `/p/:id`.

### 2.9. Manual Integrado dos 7 Pilares (`hq-documentation-modal`) — 🟢 REAL
- Modal de consulta executiva e técnica dentro do próprio `/hq` sincronizado com os 7 Pilares da V7.0 e matriz RBAC de 6 papéis.

---

## 🗄️ 3. Persistência Oficial & Segregação Real vs. Sandbox

1. **Cloud Firestore Enterprise Ativo (18 Coleções):** Todos os dados de governança, empresas, produtos, pedidos, reservas, transações de pagamento, livro-razão e logs de auditoria são persistidos no banco Firestore via Firebase Admin SDK no servidor Express (`src/server/`) e blindados por `firestore.rules` Zero-Trust.
2. **Transparência de Pagamentos (`sandbox` vs `live`):** O Proxy Universal `/api/payments` persiste todas as transações em `/payment_transactions` no Firestore e informa explicitamente `mode: 'sandbox'` quando chaves de PSP real (`STRIPE_SECRET_KEY` / `MERCADOPAGO_ACCESS_TOKEN`) não estão definidas no ambiente.
3. **Isolamento de Dados de Demonstração:** Registros marcados como simulação (`isSimulated: true`) permanecem segregados dos indicadores contábeis reais e podem ser expurgados sem afetar lançamentos reais.
