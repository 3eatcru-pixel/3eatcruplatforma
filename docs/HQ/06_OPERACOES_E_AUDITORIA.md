# 🏛️ HQ Central — 06: Operações de Rede, Configuração Regional e Auditoria Contínua

## 📌 1. Visão Geral das Operações de Rede

O HQ Central possui uma camada operacional voltada para a saúde da infraestrutura da franqueadora, abrangendo **auditoria contínua de integridade**, **controle de modo de manutenção**, **disseminação de avisos operacionais (Broadcast)** e **parametrização da vitrine regional do marketplace**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        HQ CENTRAL: OPERAÇÕES GLOBAIS                   │
├────────────────────────────────────────────────────────────────────────┤
│  1. MOTOR DE AUDITORIA CONTÍNUA (POST /api/hq/audit/run)               │
│     - Varre Tenants (CNPJs incompletos, limites de hardware estourados)│
│     - Varre Produtos (Preço zero, tenant inexistente, inconsistências) │
│     - Varre Pedidos (Divergências matemáticas: Subtotal + Frete ≠ Tot) │
│                                                                        │
│  2. MODO DE MANUTENÇÃO & BROADCAST GLOBAL (/api/hq/system/*)           │
│     - Trava preventiva de novas requisições em manutenções programadas │
│     - Mensagens de rodapé exibidas em todos os terminais da rede       │
│                                                                        │
│  3. VITRINE E PROMOÇÃO REGIONAL (/api/hq/regional)                     │
│     - Banner Hero da praça ativa (ex: 'Grande São Paulo')              │
│     - Gestão de bairros prioritários e curadoria de lojas em destaque  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir ao operador do SaaS verificar a conformidade de 100% dos registros do banco de dados com um clique, identificando falhas de dados antes que afetem as operações fiscais das lojas.
- Permitir a publicação de comunicados urgentes para todos os operadores de loja (ex: instabilidade em adquirente externa de cartão).
- Configurar praças regionais e campanhas da tela pública de marketplace regional (`/marketplace`).

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Motor de Auditoria do Ecossistema:**
  - Endpoint `POST /api/hq/audit/run` (`src/server/routes/hq.router.ts:337`).
  - Executa leitura em lote de `tenants`, `products`, `orders` e `devices`.
  - Verifica integridade contábil:
    ```typescript
    const expected = Math.max(0, o.subtotal + (o.deliveryFee || 0) + (o.tax || 0) - (o.discount || 0));
    if (Math.abs(expected - o.total) > 0.15) {
      ledgerConsistent = false;
      issues.push(`Divergência contábil no pedido #${o.orderNumber}.`);
    }
    ```
  - Emite relatório com status `'passed'`, `'warning'` ou `'failed'`.
- **Modo de Manutenção e Broadcast:**
  - `POST /api/hq/system/broadcast` (`hq.router.ts:144`).
  - `POST /api/hq/system/maintenance` (`hq.router.ts:166`).
  - Gravado no Firestore `/hq_settings/global`.
- **Configuração Regional:**
  - `GET /api/hq/regional` e `POST /api/hq/regional` (`hq.router.ts:524-541`).
  - Armazenado em `/public_regional/default`.
- **Interfaces Visuais no HQ:**
  - `src/app/components/hq/hq-audit.ts` (execução e histórico de auditoria).
  - `src/app/components/hq/hq-system-config.ts` (broadcast e manutenção).
  - `src/app/components/hq/hq-regional-manager.ts`, `hq-regional-spotlight.ts` e `hq-regional-hero-form.ts`.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Acesso exclusivo por Super Admin (`requireHqAdmin`).
- **Comunicação com o Marketplace e Store OS:**
  - O componente público de marketplace (`src/app/components/regional-marketplace.ts`) lê `/api/hq/regional` para exibir o banner da região e lojas em destaque.
  - O Store OS lê `/api/hq/overview` ou ouvinte de `/hq_settings/global` para alertar o operador de caixa caso a rede esteja em manutenção programada.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/services/hq-api.service.spec.ts`: Cobertura completa de execução de auditoria, toggle de manutenção e envio de comunicados.
  - `src/server/api.spec.ts`: Validação de healthcheck da infraestrutura.
- **Resultado:** Aprovado em todos os testes.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso Operacional | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Varredura Automática de Integridade Contábil | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:373` | Valida divergências entre soma de itens, taxas, descontos e total. |
| Varredura de CNPJs e Cotas de Dispositivos | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:355` | Aponta cadastros incompletos e lojas com terminais além do contratado. |
| Broadcast Global de Avisos | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:144` | Mensagem persistida e auditada no Firestore. |
| Controle Central de Modo de Manutenção | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:166` | Flag booleana mestra persistida em `/hq_settings/global`. |
| Gestão Visual do Marketplace Regional | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:541` | Configuração de títulos, praças e banners públicos. |
| Agendamento Crônico de Auditoria em Segundo Plano | 🟡 **Implementado parcialmente** | `src/server/routes/hq.router.ts:337` | Auditoria executada sob demanda via chamada da API; job de cron de 24h em background pronto para ativação contínua. |
