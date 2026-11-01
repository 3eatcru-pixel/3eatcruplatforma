# 🏛️ HQ Central — 00: Arquitetura e Governança da Plataforma

## 📌 1. Visão Geral & Pergunta Central de Arquitetura

> **Pergunta Central:** Como a plataforma controla e administra todas as empresas sem interferir indevidamente na operação de cada uma?

O **HQ Central (`/hq`)** atua como o gabinete executivo e autoridade regulatória da franqueadora SaaS. Ele exerce a governança macro sobre contratos, limites de hardware (MDM), tarifação global de split e conformidade fiscal/cadastral (CNPJ), ao mesmo tempo em que preserva a soberania transacional interna de cada estabelecimento lojista.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN HQ (hq_admin)                       │
│  - Aprovação/Suspensão de Empresas    - Configuração de Planos SaaS    │
│  - Auditoria de Conciliação Global     - Bloqueio Remoto de Terminais  │
│  - Broadcasts de Manutenção            - Catálogo Mestre de eApps      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Governança & Restrições
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     FIRESTORE ZERO-TRUST RULES                         │
│  /tenants/{id}       -> update: restrito (Lojista não altera status)   │
│  /hq_settings/global -> read/write: restrito a hq_admin                │
│  /plans/{id}         -> write: restrito a hq_admin                     │
│  /devices/{id}       -> status MDM controlado remotamente              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que o operador do SaaS (`hq_admin`) visualize métricas agregadas da rede (GMV total transacionado, estabelecimentos ativos, volume de terminais conectados e receita de comissão SaaS).
- Centralizar o controle do ciclo de vida das empresas (de `trial` para `active`, `suspended` ou `cancelled`).
- Definir políticas de preço de planos SaaS (Starter, Professional, Enterprise) e taxa padrão de split sobre vendas online (padrão de 8%).
- Executar ações MDM em terminais de ponto de venda (bloquear, reiniciar ou forçar atualização remota).
- Publicar alertas globais e acionar modo de manutenção sem interrupção abrupta dos bancos transacionais locais.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componente Frontend:** `src/app/components/hq-central.ts` (standalone component com navegação por abas em Angular 21, consumindo signals reativos).
- **Subcomponentes Especializados:**
  - `src/app/components/hq/hq-tenants-list.ts`: Grid e busca de empresas com status, plano e CNPJ.
  - `src/app/components/hq/hq-tenant-governance-modal.ts`: Modal executivo para bloqueio/aprovação e alteração de cotas de dispositivos.
  - `src/app/components/hq/hq-ledger.ts`: Tabela analítica de comissões retidas pedido a pedido.
  - `src/app/components/hq/hq-plans-pricing.ts`: Gestão de planos SaaS e preços mensais.
  - `src/app/components/hq/hq-devices-list.ts`: Telemetria de hardware MDM e envio de comandos.
  - `src/app/components/hq/hq-eapps-catalog.ts`: Supervisão do catálogo mestre de eApps embutidos do Store OS.
  - `src/app/components/hq/hq-system-config.ts`: Chave de modo de manutenção e broadcast global.
  - `src/app/components/hq/hq-audit.ts`: Motor de auditoria cadastral e verificação de integridade contábil.
- **Serviço Angular do HQ:** `src/app/services/hq-api.service.ts` e `src/app/services/hq.service.ts`.
- **Roteamento Backend:** `src/server/routes/hq.router.ts` montado sob `/api/hq/*`.
- **Guarda de Segurança e Middleware:** `requireHqAdmin` em `src/server/middleware/auth.middleware.ts`.
- **Coleções Firestore Utilizadas:**
  - `/tenants`: Diretório de empresas.
  - `/hq_settings/global`: Configurações mestras privadas (comissão, modo de manutenção).
  - `/plans`: Catálogo de planos de licenciamento.
  - `/devices`: Dispositivos físicos e status MDM.
  - `/audit_logs`: Livro-razão imutável de ações administrativas.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Autenticação de Entrada:** Requisições para `/api/hq/*` exigem cabeçalho `Authorization: Bearer <id_token>` onde o token decodificado deve conter a custom claim `role === 'hq_admin'` ou pertencer a administrador registrado em `/admins/{uid}` com `email_verified === true`.
- **Prevenção de Evasão:** Tentativas de operadores de loja (`tenant_owner`, `operator`) de consumir `/api/hq/*` são interceptadas imediatamente com código HTTP `403 Forbidden` (`code: 'HQ_ADMIN_REQUIRED'`).
- **Comunicação com o Store OS:**
  - O Store OS lê dados do tenant via `/api/tenants/:id`.
  - Se o HQ alterar o `status` do tenant para `suspended`, a rotina transacional `executeCommercialOrder` do backend imediatamente rejeita novas transações com `403 TENANT_INACTIVE`.
  - Se o HQ alterar o status do dispositivo para `locked` via `/api/hq/devices/:id/lock`, o hardware tem sua sessão interrompida.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Unitários e de Integração:**
  - `src/app/services/hq-api.service.spec.ts`: Validação de 11 cenários de chamada a endpoints de governança.
  - `src/server/security_phase1.spec.ts`: Asserção de que endpoints do HQ rejeitam usuários sem claim `hq_admin` com HTTP 403.
  - `src/server/commerce_war_tests.spec.ts`: Validação de que bloqueio de tenant no HQ reflete imediatamente em erro `403 TENANT_INACTIVE` no motor de vendas.
- **Resultados:** 100% dos testes passaram em execução automatizada (`vitest`).

---

## 📊 3. Matriz de Classificação de Maturidade dos Recursos do HQ

| Recurso / Funcionalidade | Classificação | Arquivo de Evidência | Detalhes & Pendências |
|---|---|---|---|
| Autenticação exclusiva de Super Admin | 🟢 **Implementado e comprovado** | `src/server/middleware/auth.middleware.ts` | Exige `role === 'hq_admin'` ou `/admins/{uid}` com `email_verified`. |
| Visão Geral Executiva (GMV, Tenants, Receita) | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:102` | `GET /api/hq/overview` calcula GMV real descontando cancelados e pedidos simulados. |
| Alteração de Modo de Manutenção Global | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:166` | `POST /api/hq/system/maintenance` com persistência em `/hq_settings/global`. |
| Emissão de Broadcast Global | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:144` | `POST /api/hq/system/broadcast` auditado em `/audit_logs`. |
| Configuração de Percentual de Split da Plataforma | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:188` | `POST /api/hq/system/commission` (limite entre 0% e 50%). |
| Gestão de Planos de Assinatura | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:485` | `GET /plans` e `PATCH /plans/:id` com cotas de terminais. |
| Split Contábil Automatizado por Pedido | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:407` | `GET /api/hq/ledger` computa fee da plataforma e net da loja. |
| Dispositivos e MDM Remoto (Lock/Reboot) | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:270` | `POST /api/hq/devices/:id/lock` e `restart`. |
| Catálogo Mestre de eApps Embutidos | 🟢 **Implementado e comprovado** | `src/app/components/hq/hq-eapps-catalog.ts` | Supervisão dos 30 eApps do Store OS por plano e status. |
| Auditoria Automatizada do Ecossistema | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:337` | `POST /api/hq/audit/run` valida CNPJs, preços, limites de dispositivos e integridade contábil. |
| Cobrança Recorrente Automática de Mensalidades | 🟡 **Implementado parcialmente** | `src/server/routes/payments.router.ts` | Pagamento de pedidos ativo via Stripe/Pix; cobrança de faturas SaaS de mensalidade ocorre via simulação de plano no ledger. |
