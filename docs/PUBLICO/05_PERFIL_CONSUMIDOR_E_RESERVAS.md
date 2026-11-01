# 🛍️ Público & Marketplace — 05: Perfil do Consumidor, Fidelidade e Reservas de Mesa

## 📌 1. Visão Geral da Experiência do Cliente

O módulo de **Perfil do Consumidor e Serviços ao Cliente (`consumer-profile.ts`)** gerencia a persistência da jornada do cliente no ecossistema: seu histórico de compras em múltiplas lojas da rede, gestão de endereços frequentes de entrega, saldo de pontos do programa de fidelidade e o **Agendamento de Reservas de Mesas com Sincronização ACID**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PAINEL DO CONSUMIDOR (/profile)                 │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. HISTÓRICO       │ 2. ENDEREÇOS       │ 3. RESERVAS DE MESA          │
│ • Pedidos Ativos   │ • Casa / Trabalho  │ • Agendamento com Data/Hora  │
│ • Rastreamento     │ • Complemento/Ref. │ • Número de Pessoas          │
│ • Recompras Rápidas│ • CEP e Coordenadas│ • Sincronização com o Salão  │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que o cliente consulte o status de seus pedidos em tempo real (`Preparando`, `Saiu para Entrega`, `Entregue`).
- Salvar endereços favoritos para agilizar compras futuras sem necessidade de redigitar dados.
- Permitir o agendamento prévio de mesas em restaurantes cadastrados, selecionando número de comensais, data e turno.
- Garantir que a reserva ocupe imediatamente a mesa no mapa do Store OS, evitando que dois clientes reservem a mesma mesa para o mesmo horário.
- Respeitar a configuração da loja: se o restaurante não aceitar reservas (`supportsReservation === false`), a opção pública deve estar indisponível.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componente Angular:** `src/app/components/consumer-profile.ts`.
  - Exibe cartões de pedidos com barra de progresso visual de status e detalhamento de itens.
  - Seletor de endereços favoritos e exibição de saldo de fidelidade.
- **Roteamento de Reservas Públicas (`src/server/routes/reservations.router.ts:74`):**
  - Endpoint `POST /api/reservations/public`.
  - **Validação de Habilitação:** Se `tenant.supportsReservation === false`, responde com:
    ```typescript
    if (tenant.supportsReservation === false) {
      res.status(422).json({
        error: 'Este estabelecimento não está aceitando reservas de mesa no momento.',
        code: 'RESERVATIONS_DISABLED'
      });
      return;
    }
    ```
  - **Sincronização Atômica com a Mesa:** O servidor localiza uma mesa disponível com capacidade adequada em `/tables` e atualiza seu status para `'reserved'` na mesma transação.
- **Isolamento de Dados no Firestore (`firestore.rules:246`):**
  - A consulta na coleção `/orders` filtra estritamente por `resource.data.customerId == request.auth.uid`. Clientes são terminantemente impedidos de ler pedidos alheios.
  - A coleção `/consumers/{consumerId}` só permite leitura e atualização pelo próprio titular (`request.auth.uid == consumerId`).

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Consumidor autenticado na vitrine pública ou no modal de agendamento de mesa (`src/app/components/customer-storefront.ts:198`).
- **Comunicação com o Store OS:**
  - A reserva aparece instantaneamente no eApp Reservas do lojista (`reservations-window.ts`), permitindo que a recepção confirme o check-in na chegada dos convidados.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Suíte de Segurança (`src/server/security_phase1.spec.ts`):**
  - **Cenário de Reserva ACID:** Criação de reserva via `/api/reservations/public` validando alteração automática do status da mesa de `available` para `reserved`.
  - **Cenário de Loja sem Reserva:** Tentativa de agendamento em loja com `supportsReservation: false` é rejeitada com HTTP 422 `RESERVATIONS_DISABLED`.
  - **Cenário de Isolamento de Perfil:** Validação de que clientes recebem apenas seus próprios pedidos na listagem.
- **Resultado:** 100% de testes aprovados.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso do Consumidor / Reservas | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Consulta ao Histórico Próprio de Pedidos | 🟢 **Implementado e comprovado** | `firestore.rules:246` | Isolamento garantido por regra de segurança `customerId == uid`. |
| Agendamento Público de Reservas ACID | 🟢 **Implementado e comprovado** | `src/server/routes/reservations.router.ts:74` | Sincroniza estado de ocupação da mesa física no salão. |
| Bloqueio de Reservas quando Desabilitadas | 🟢 **Implementado e comprovado** | `src/server/routes/reservations.router.ts:80` | Emite HTTP 422 `RESERVATIONS_DISABLED`. |
| Gestão de Múltiplos Endereços Favoritos | 🟢 **Implementado e comprovado** | `src/app/components/consumer-profile.ts` | Salva logradouro, número, bairro e coordenadas do cliente. |
| Acompanhamento em Tempo Real do Status da Entrega | 🟢 **Implementado e comprovado** | `src/app/components/consumer-profile.ts:120` | Atualiza automaticamente conforme o motorista transiciona a rota. |
| Extrato de Pontos e Cashback da Loja | 🟡 **Implementado parcialmente** | `src/app/components/consumer-profile.ts` | Saldo acumulado exibido na interface; motor de resgate em desenvolvimento. |
