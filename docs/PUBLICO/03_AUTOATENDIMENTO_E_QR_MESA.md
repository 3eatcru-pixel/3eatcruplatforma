# 🛍️ Público & Marketplace — 03: Autoatendimento, Totem Kiosk e QR Code na Mesa

## 📌 1. Visão Geral da Jornada Sem Fila

O ecossistema 3EATCRU oferece duas modalidades de autoatendimento presencial que eliminam filas e reduzem custos com equipe: o **QR Code na Mesa** (cardápio digital com comanda interativa no próprio smartphone do cliente) e o **Totem Kiosk Presencial** (estação física com monitor touchscreen na entrada da loja).

```text
       ┌─────────────────────────────────────────────────────────┐
       │              CLIENTE SENTA NA MESA 04                   │
       │     Aponta a câmera do celular para o QR Code da mesa   │
       │     Abre a URL: https://app.3eatcru.com/loja/slug?mesa=4│
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             CARDÁPIO DIGITAL NO NAVEGADOR               │
       │   - Sem necessidade de instalar app ou fazer cadastro   │
       │   - Seleciona pratos, bebidas e cadência de saída       │
       │   - Toca em 'Confirmar e Enviar para a Cozinha'         │
       └────────────────────────────┬────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
    ┌──────────────────────┐                  ┌──────────────────────┐
    │  KDS COZINHA (eApp)  │                  │  MAPA SALÃO (eApp)   │
    │  Tíquete cai com tag │                  │  Mesa 04 vira        │
    │  [MESA 04 - QR CODE] │                  │  [OCUPADA - R$ 85,00]│
    └──────────────────────┘                  └──────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que o comensal faça pedidos diretamente da mesa sem precisar esperar o garçom.
- Identificar automaticamente a mesa através do parâmetro de URL (`?mesa=X` ou `?table=X`).
- Sincronizar o pedido da mesa com o mapa do Store OS (`tables-window.ts`), atualizando o status para `occupied` e adicionando os itens ao consumo da mesa.
- No modo Totem Kiosk, prover interface simplificada de toque, finalizando com número de comanda física ou chamada na senha.
- Impedir que clientes em mesas façam pedidos caso o estabelecimento esteja operando exclusivamente no balcão.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Captura da Mesa na Vitrine Pública:**
  - Em `src/app/components/customer-storefront.ts:310`, o componente lê os parâmetros de rota e URL:
    ```typescript
    ngOnInit() {
      this.route.queryParams.subscribe(params => {
        if (params['mesa'] || params['table']) {
          this.activeTableNumber.set(params['mesa'] || params['table']);
          this.selectedOrderType.set('dine-in');
        }
      });
    }
    ```
- **Associação de Canal no Backend (`src/server/core/commerce.engine.ts:71`):**
  - Mapeamento de canais:
    ```typescript
    'table qr': 'Table QR',
    qr_table: 'Table QR',
    kiosk: 'Kiosk Totem'
    ```
  - Quando a comanda é aberta com `channel: 'Table QR'`, o `CommerceEngine` vincula o `orderNumber` à mesa correspondente em `/tables/{tableId}`, atualizando o campo `currentTotal` e o array de pedidos ativos.
- **Roteamento para a Cozinha:**
  - O pedido é gravado em `/orders` com `channel: 'Table QR'` e `status: 'preparing'`, gerando o tíquete visual no eApp KDS Cozinha instantaneamente.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Leitura de QR Code ou toque na tela do Totem físico.
- **Integração com o Salão:**
  - Quando o garçom visualiza o mapa no seu celular (`/waiter`), a mesa já exibe os pratos lançados pelo cliente pelo QR Code, evitando retrabalho ou lançamento duplicado.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/server/commerce_war_tests.spec.ts` (Guerra 6 - Cinco Canais Simultâneos): Validação de pedidos gerados concorrentemente via `Table QR` e `Kiosk Totem` simultâneos ao PDV e iFood.
  - `src/app/services/ecosystem.service.spec.ts`: Validação de leitura de parâmetros de mesa e sincronização com o estado reativo das mesas.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso de Autoatendimento | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Leitura Automática de Parâmetro de Mesa (`?mesa=`) | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts:310` | Identifica a mesa sem exigir login complexo. |
| Envio Direto ao KDS sem Intervenção Manual | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:71` | Canal `Table QR` entra direto na fila de preparo. |
| Atualização Atômica da Mesa para `occupied` | 🟢 **Implementado e comprovado** | `src/server/routes/tables.router.ts:40` | Sincroniza o total de consumo no salão. |
| Suporte ao Canal Kiosk Totem Presencial | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:62` | Canal dedicado para terminais touchscreen físicos. |
| Pagamento Direto do QR da Mesa via Pix | 🟢 **Implementado e comprovado** | `src/server/routes/payments.router.ts:24` | Cliente encerra e paga a conta da mesa pelo celular. |
| Chamada Digital de Garçom pelo QR da Mesa (Buzzer) | 🟡 **Implementado parcialmente** | `src/app/models/ecosystem.model.ts` | Alerta mapeado no modelo de mesa; interface com botão dedicado de solicitação de atendimento em finalização. |
