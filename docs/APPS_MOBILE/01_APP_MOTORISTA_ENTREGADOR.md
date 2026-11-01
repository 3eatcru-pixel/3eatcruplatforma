# 📱 Apps Mobile Android — 01: App do Motorista e Logística de Entregas

## 📌 1. Visão Geral da Jornada do Entregador (`/driver`)

O **App do Motorista (`driver-app.ts`)** é a ferramenta de trabalho para entregadores parceiros da plataforma ou frotas próprias das lojas. O aplicativo gerencia todo o ciclo da corrida: validação presencial de entrada de turno (**Clock-in via QR Code**), aceite de rotas, navegação geodésica por GPS, paradas sequenciais (**Waypoints**), comprovante digital de entrega e controle de repasses financeiros.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CICLO OPERACIONAL DA ENTREGA                    │
├────────────────────────────────────────────────────────────────────────┤
│  1. CLOCK-IN DE TURNO: Entregador escaneia o QR Code físico da loja    │
│     (Muda status de 'offline' para 'available')                        │
│                                                                        │
│  2. ACEITE DA ROTA: Seleciona corrida compatível com seu veículo       │
│     (POST /api/logistics/routes/:id/accept - Valida frota da loja)     │
│                                                                        │
│  3. COLETA NO ESTABELECIMENTO: Chegada à loja -> Conferência de pacotes│
│     (Transição para 'at_store' -> 'in_progress')                       │
│                                                                        │
│  4. NAVEGAÇÃO GPS & WAYPOINTS: Mapa geodésico Leaflet com ETA e rotas  │
│                                                                        │
│  5. COMPROVANTE & FINALIZAÇÃO: Assinatura na tela ou foto da entrega   │
│     (Conclusão atômica e liberação dos ganhos em carteira)             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Exigir que o motorista faça Clock-in antes de receber corridas para garantir sua presença física na base.
- Exibir rotas organizadas por sequência lógica de entrega (Waypoint 1, Waypoint 2, etc.) com endereço, telefone do destinatário e valor a receber.
- Fornecer navegação GPS na tela com instruções visuais e alerta de proximidade.
- Coletar comprovante de entrega (assinatura do cliente ou foto do produto entregue).
- Manter o saldo de ganhos do dia atualizado em tempo real.
- **Segurança Estrita:** O motorista nunca pode enxergar dados de outros entregadores nem assumir rotas de lojas com frota exclusiva que não seja a sua.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componente Angular:** `src/app/components/driver-app.ts` (1.046 linhas).
  - Controle de abas via Signal `activeTab = signal<DriverScreenTab>('active_route')`:
    - `'active_route'`: Mapa Leaflet, paradas ativas e botões de fluxo.
    - `'available_routes'`: Lista de rotas abertas para aceite na região.
    - `'delivery_details'`: Dados completos do cliente e itens do pacote.
    - `'financial'`: Ganhos do dia, extrato por corrida e taxa média por km.
    - `'profile'`: CNH, placa do veículo, tipo (moto, bike, carro) e avaliação.
    - `'proof_summary'`: Tela de coleta de assinatura digital e captura de imagem.
- **Roteamento Backend (`src/server/routes/logistics.router.ts`):**
  - `POST /api/logistics/routes/:id/accept`:
    - Validação de Frota P1: Se a loja tiver `deliveryFleetType === 'own'`, o servidor valida se o `tenantId` do motorista coincide com a loja. Se houver divergência, responde com `403 TENANT_MISMATCH`.
  - `POST /api/logistics/routes/:id/pickup`: Confirma a coleta dos pacotes na cozinha.
  - `POST /api/logistics/routes/:id/complete`: Liquida a corrida, marcando o pedido em `/orders` como `'delivered'` e liberando o repasse ao motorista.
- **Isolamento de Pedidos no Servidor (`src/server/routes/orders.router.ts:25`):**
  - Para usuários com papel `driver`, o endpoint `GET /api/orders` aplica obrigatoriamente a cláusula `order.driverId === req.user.id`. Tentativas de consultar pedidos de outras frotas são rejeitadas.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Motorista logado com Bearer ID Token com claim `role: 'driver'`.
- **Comunicação com o Store OS e Cliente:**
  - Quando o motorista clica em "Confirmar Coleta" (`pickup`), o Store OS do lojista atualiza o status do pedido para `dispatched`.
  - O aplicativo do cliente consumidor passa a exibir a mensagem "Seu pedido saiu para entrega com o motorista X".

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Suíte de Segurança (`src/server/security_phase1.spec.ts`):**
  - **Bloqueio de Motorista Não Atribuído:** Confirmação de que motorista não consegue transicionar pedidos onde `driverId !== uid`.
  - **Bloqueio de Rota Cross-Tenant:** Tentativa de motorista de frota própria assumir corrida de outro restaurante retorna `403 TENANT_MISMATCH`.
- **Suíte de Guerra Comercial (`src/server/commerce_war_tests.spec.ts` - Guerra 8):**
  - Validação de que dois motoristas disputando a mesma rota têm a atribuição resolvida serializavelmente sem sobreposição.
- **Resultado:** 100% de aprovação.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso do App do Entregador | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Entrada de Turno por QR Code (Clock-in) | 🟢 **Implementado e comprovado** | `src/app/components/driver-app.ts:77` | Trava o aplicativo em modo offline até a leitura. |
| Mapa de Navegação Geodésica com Leaflet | 🟢 **Implementado e comprovado** | `src/app/components/driver-app.ts:160` | Renderiza localização, pinos de entrega e trajeto. |
| Isolamento Estrito de Pedidos por `driverId` | 🟢 **Implementado e comprovado** | `src/server/routes/orders.router.ts:25` | Impede vazamento de dados de outros entregadores. |
| Bloqueio Cross-Tenant de Frotas Próprias | 🟢 **Implementado e comprovado** | `src/server/routes/logistics.router.ts:180` | Emite HTTP 403 `TENANT_MISMATCH` em frotas exclusivas. |
| Transições de Status (`at_store`, `pickup`, `complete`)| 🟢 **Implementado e comprovado** | `src/server/routes/logistics.router.ts:220` | Reflete imediatamente no Store OS e no cliente. |
| Extrato Financeiro de Corridas do Dia | 🟢 **Implementado e comprovado** | `src/app/components/driver-app.ts:500` | Exibe ganhos totais, corridas concluídas e gorjetas. |
| Coleta de Comprovante de Entrega na Tela | 🟢 **Implementado e comprovado** | `src/app/components/driver-app.ts:800` | Suporta assinatura touchscreen e confirmação por código. |
| Roteamento Multi-Paradas Otimizado por IA (TSP Solver) | 🟡 **Implementado parcialmente** | `src/server/routes/logistics.router.ts` | Paradas ordenadas por sequência numérica; algoritmo de caixeiro viajante em tempo real em expansão. |
