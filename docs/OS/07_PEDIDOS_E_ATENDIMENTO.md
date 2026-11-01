# 🏬 Store OS — 07: Pedidos, Mesas, Cozinha (KDS) e Atendimento

## 📌 1. Visão Geral do Fluxo de Pedidos e Salão

O ecossistema 3EATCRU opera com um modelo unificado de pedidos omnichannel. Independentemente da origem (balcão do PDV, comanda lançada pelo garçom no salão, QR Code na mesa do restaurante ou pedido de entrega via marketplace), todos os pedidos convergem para a mesma máquina de estados de pedidos e para a esteira de produção da cozinha (KDS).

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CANAIS DE ENTRADA DO PEDIDO                     │
│    [PDV Balcão]    [App Garçom]    [QR Mesa]    [Marketplace Online]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    MÁQUINA DE ESTADOS DO PEDIDO                        │
│   pending ──► preparing ──► ready ──► dispatched ──► completed        │
│      │             │           │           │                           │
│      └─────────────┴───────────┴───────────┴───────► cancelled        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        MONITOR DE COZINHA (KDS)      │  │        MAPA DE SALÃO         │
│  - eApp KDS Cozinha & Bar            │  │  - eApp Mesas & Salão        │
│  - Alertas de Tempo e Cadência       │  │  - 4 Estados de Mesas        │
│  - Separação de Entradas/Principais  │  │  - Disponível, Ocupada,      │
│                                      │  │    Reservada e Manutenção    │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Controlar a ocupação física das mesas do salão em tempo real.
- Permitir que os pratos sejam despachados para a cozinha organizados por tempos gastronômicos (Entrada, Prato Principal, Sobremesa).
- Exibir tíquetes no KDS com código de cores para tempo de espera e controle de finalização por estação.
- Suportar reservas antecipadas sincronizadas com a disponibilidade real das mesas físicas.
- Garantir transições determinísticas de status do pedido de acordo com as regras de negócio.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Máquina de Estados de Pedidos (`ALLOWED_ORDER_TRANSITIONS`):**
  Definida em `src/server/core/commerce.engine.ts:17`:
  ```typescript
  export const ALLOWED_ORDER_TRANSITIONS: Record<OrderTransaction['status'], OrderTransaction['status'][]> = {
    pending: ['preparing', 'ready', 'dispatched', 'completed', 'cancelled'],
    preparing: ['ready', 'completed', 'cancelled'],
    ready: ['dispatched', 'completed', 'cancelled'],
    dispatched: ['completed', 'delivered', 'cancelled'],
    delivered: ['completed'],
    completed: ['cancelled'],
    cancelled: []
  };
  ```
- **Componentes do Store OS:**
  - `src/app/components/os-windows/tables-window.ts`: Janela do eApp Mapa de Salão com visão por planta física.
  - `src/app/components/os-windows/tables/table-grid.ts`: Grid visual com os 4 status oficiais (`available`, `occupied`, `reserved`, `maintenance`).
  - `src/app/components/os-windows/tables/table-details-modal.ts`: Detalhes da comanda da mesa e divisão de conta.
  - `src/app/components/os-windows/kds-window.ts`: eApp KDS Tela da Cozinha multisetores.
  - `src/app/components/os-windows/kds/kds-ticket.ts`: Tíquete individual do pedido com cronômetro de preparo.
  - `src/app/components/os-windows/reservations-window.ts`: eApp Reservas com status e horário agendado.
- **Roteamento Backend:**
  - `src/server/routes/orders.router.ts`:
    - `GET /api/orders`: Lista pedidos do tenant.
    - `POST /api/orders`: Cria novo pedido com validação atômica de estoque.
    - `PATCH /api/orders/:id/status`: Transição de status usando `transitionOrderStatus`.
  - `src/server/routes/tables.router.ts`:
    - `GET /api/tables`: Leitura realtime das mesas da unidade.
    - `PATCH /api/tables/:id`: Abertura, fechamento ou alteração de status da mesa.
  - `src/server/routes/reservations.router.ts`:
    - `POST /api/reservations`: Reserva interna. Altera status da mesa para `reserved` atomicamente no Firestore.
    - `POST /api/reservations/public`: Reserva feita pelo cliente final na vitrine pública. Rejeitada com `422 RESERVATIONS_DISABLED` se a loja estiver com reservas desativadas (`supportsReservation === false`).

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Criado no PDV, lançado pelo App do Garçom (`/waiter`) ou pelo cliente no Storefront público.
- **Sincronização em Tempo Real:**
  - As mesas e pedidos são ouvidos via WebSockets/Firestore snapshots. Quando o garçom adiciona uma bebida na mesa 04 via `/waiter`, a mesa no Store OS é imediatamente pintada de vermelho (`occupied`) e o total da comanda é atualizado em tela sem recarregar a página.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/security_phase1.spec.ts`:
    - Ciclo completo de reservas ACID sincronizando a mesa entre `available -> reserved -> occupied`.
    - Bloqueio de reservas públicas com `422 RESERVATIONS_DISABLED` se a loja não aceitar reservas.
  - `src/server/commerce_war_tests.spec.ts`:
    - **Guerra 5 (Duplo Cancelamento):** Validação de que tentativas simultâneas de cancelamento não estornam o estoque duas vezes.
    - **Guerra 6 (Cinco Canais Simultâneos):** Venda simultânea por PDV, Balcão, QR Mesa, iFood e Marketplace sem quebra de integridade.
- **Resultado:** 100% de testes aprovados.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso de Atendimento / Cozinha | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Máquina de Estados Canônica de Pedidos | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:17` | Garante transições legais e bloqueia retornos inválidos. |
| Mapa de Mesas com 4 Estados Visuais | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/tables/table-grid.ts` | Suporta mesas Livres, Ocupadas, Reservadas e em Manutenção. |
| Monitor KDS com Alerta de Tempo | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/kds-window.ts` | Tíquetes reativos com avanço de etapas de cocção. |
| Cadência Gastronômica (3 Tempos) | 🟢 **Implementado e comprovado** | `src/app/components/waiter-app.ts:250` | Garçom seleciona Entrada, Principal ou Sobremesa nas notas. |
| Ciclo de Reservas ACID Sincronizado | 🟢 **Implementado e comprovado** | `src/server/routes/reservations.router.ts:74` | Reserva ocupa a mesa no mapa físico instantaneamente. |
| Divisão de Conta por Pessoa na Mesa | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/tables/table-details-modal.ts` | Divide o saldo total pelo número de comensais sentados. |
| Roteamento Inteligente de Tíquete por Praça (Bar vs Cozinha) | 🟡 **Implementado parcialmente** | `src/app/models/ecosystem.model.ts` | Produtos possuem categoria; filtragem no KDS permite separar telas por praça de preparo. |
