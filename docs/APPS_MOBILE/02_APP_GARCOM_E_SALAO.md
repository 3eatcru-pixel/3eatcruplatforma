# 📱 Apps Mobile Android — 02: App do Garçom, Comandas de Salão e Cadência de Cozinha

## 📌 1. Visão Geral da Operação de Salão (`/waiter`)

O **App do Garçom (`waiter-app.ts`)** é a interface móvel voltada para os atendentes de salão em restaurantes, bares, cafeterias e eventos. Projetado para rodar em smartphones Android comuns ou terminais de mão (POS portátil / Comandera), o aplicativo permite abrir mesas, consultar pedidos ativos, transferir comandas e lançar pratos organizados por **Cadência Gastronômica (Entrada, Prato Principal e Sobremesa)**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CICLO DO ATENDIMENTO DE MESA                    │
├────────────────────────────────────────────────────────────────────────┤
│  1. SELEÇÃO DA MESA NO SALÃO: Mapa com 4 status (Livre, Ocupada,       │
│     Reservada e Manutenção) com número de lugares e garçom titular     │
│                                                                        │
│  2. LANÇAMENTO DE ITENS: Categorias rápidas (Bebidas, Pratos, etc.)    │
│     + Quantidades + Observações personalizadas do cliente              │
│                                                                        │
│  3. CADÊNCIA DE COZINHA (3 TEMPOS): Seleciona se o item deve marchar   │
│     como 'Entrada', 'Prato Principal' ou 'Sobremesa'                   │
│                                                                        │
│  4. ENVIO PARA O KDS: Comanda despachada via Wi-Fi interno             │
│     (Mesa vira 'Ocupada' e total é atualizado instantaneamente)        │
│                                                                        │
│  5. 🔒 SEGURANÇA: Garçom não tem acesso ao faturamento global ou DRE   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que o garçom navegue pelo salão de mesas com identificação visual instantânea das mesas livres e ocupadas.
- Lançar novos itens na comanda da mesa com agilidade e pouquíssimos toques na tela.
- Enviar notas de preparo e tempos gastronômicos diretamente para o monitor da cozinha (KDS).
- Exibir a conta parcial da mesa para conferência do cliente antes do pagamento.
- **Isolamento de Segurança:** O garçom não deve, em hipótese alguma, ter acesso aos relatórios financeiros de fechamento de caixa ou DRE da empresa.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componente Angular:** `src/app/components/waiter-app.ts` (696 linhas).
  - Shell móvel portrait com cabeçalho contendo status de Wi-Fi e bateria.
  - Abas operacionais via Signal `activeTab = signal<WaiterTab>('mesas')`:
    - `'mesas'`: Grid de mesas com status badge e estatísticas de ocupação.
    - `'comanda'`: Carrinho da mesa ativa, seletor de pratos e botões de cadência.
    - `'kds_status'`: Acompanhamento do preparo dos pratos da sua mesa na cozinha.
    - `'pareamento'`: Configuração de terminal e seleção do garçom ativo.
- **Cadência Gastronômica de 3 Tempos:**
  - Signal `selectedCourse = signal<'entrada' | 'principal' | 'sobremesa'>('principal')`.
  - Ao despachar o pedido, o aplicativo concatena o tempo gastronômico nas observações do item (`notes`), permitindo que a cozinha identifique a ordem de saída.
- **Bloqueio de Segurança no Servidor (`src/server/routes/financials.router.ts:25`):**
  - O endpoint `GET /api/financials` valida as permissões do usuário autenticado:
    ```typescript
    if (req.user?.role === 'waiter') {
      res.status(403).json({
        error: 'Acesso negado: colaboradores de salão não possuem permissão para consultar o módulo financeiro.',
        code: 'FORBIDDEN_FINANCIAL_ACCESS'
      });
      return;
    }
    ```
- **Roteamento Backend:**
  - `GET /api/tables?tenantId=:id`: Carrega as mesas da unidade.
  - `POST /api/orders`: Cria pedidos com canal `'Waiter Comanda'`.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Garçom autenticado com custom claim `role === 'waiter'` vinculado ao `tenantId` da loja.
- **Integração com o KDS e Salão:**
  - Ao salvar o pedido na mesa 08, a transação atualiza `/tables/table-08` para `occupied` e adiciona o valor ao `currentTotal`.
  - O eApp KDS Cozinha no Store OS emite sinal sonoro de novo pedido para a praça de preparo.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Suíte de Segurança (`src/server/security_phase1.spec.ts`):**
  - **Bloqueio Financeiro P2:** Validação explícita de que token com papel `waiter` recebe HTTP 403 `FORBIDDEN_FINANCIAL_ACCESS` na rota financeira.
  - **Validação de 4 Estados de Mesa:** Confirmação de que o mapa de salão reflete mesas reservadas vindas do endpoint público de reservas.
- **Suíte de Guerras Comerciais (`src/server/commerce_war_tests.spec.ts` - Guerra 6):**
  - Validação de concorrência com pedidos lançados pelo garçom simultaneamente a pedidos do PDV e do iFood.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso do App do Garçom | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Mapa de Salão com 4 Estados de Mesa | 🟢 **Implementado e comprovado** | `src/app/components/waiter-app.ts:117` | Estados: Livre, Ocupada, Reservada e Manutenção. |
| Cadência Gastronômica (Entrada, Principal, Sobremesa) | 🟢 **Implementado e comprovado** | `src/app/components/waiter-app.ts:250` | Injeta tempo de saída nas notas do KDS. |
| Bloqueio Rigoroso ao Financeiro da Empresa | 🟢 **Implementado e comprovado** | `src/server/routes/financials.router.ts:25` | Rejeita requisições com código HTTP 403. |
| Visualização de Comanda e Conta Parcial | 🟢 **Implementado e comprovado** | `src/app/components/waiter-app.ts:170` | Calcula subtotal de consumo em tempo real. |
| Roteamento Direto para o KDS Cozinha | 🟢 **Implementado e comprovado** | `src/server/core/commerce.engine.ts:58` | Canal `'Waiter Comanda'` aceito nativamente. |
| Acompanhamento de Pratos Prontos no KDS | 🟢 **Implementado e comprovado** | `src/app/components/waiter-app.ts:380` | Notifica o garçom quando o prato está pronto no pass. |
| Transferência de Itens Entre Mesas Diferentes | 🟡 **Implementado parcialmente** | `src/app/models/ecosystem.model.ts` | Suportado no Store OS desktop; tela simplificada no celular em homologação. |
