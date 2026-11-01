# 🏬 Store OS — 03: Catálogo de eApps (Embedded Apps), Módulos e Gerenciador de Janelas

## 📌 1. Visão Geral: Por que a nomenclatura "eApps"?

> 💡 **Princípio de Nomenclatura da Arquitetura:**  
> No Store OS, os módulos internos recebem a designação formal de **eApps (Embedded OS Apps / Aplicativos Embutidos)** propositalmente para **NÃO MISTURAR** com os **Apps Externos / Móveis da Plataforma**.

### Distinção Arquitetural Inviolável:
- **Apps Externos / Autônomos (PWA & Mobile):**
  - **App do Garçom (`/waiter`):** Interface móvel vertical rodando no smartphone do atendente de salão.
  - **App do Entregador (`/driver`):** Aplicação móvel com telemetria GPS no smartphone do motoboy/ciclista.
  - **App do Consumidor (`/marketplace`, `/loja/:slug`, `/profile`):** Vitrine e autoatendimento do cliente final.
  - **Gabinete HQ Central (`/hq`):** Painel web independente da franqueadora SaaS.
- **eApps do Store OS (Embedded Desktop Apps):**
  - São os **33 módulos embutidos** que operam **exclusivamente dentro do desktop do Store OS (`/os`)** como janelas multitarefa (PDV, KDS, Estoque, DRE, Mesas, etc.).
  - Eles compartilham a mesma sessão de hardware, o mesmo ciclo de vida do terminal e o mesmo contexto reativo do `tenantId`.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CATÁLOGO DE eAPPS STORE OS                      │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 🛒 OPERACIONAIS    │ 📊 GESTÃO & ERP    │ 📱 SIMULADORES & UTILITÁRIOS │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ • eApp PDV Caixa   │ • eApp Estoque ERP │ • Simulador App Garçom       │
│ • eApp Mesas/Salão │ • eApp Financeiro  │ • Simulador App Entregador   │
│ • eApp Cozinha KDS │ • eApp Fornecedore │ • Simulador Marketplace      │
│ • eApp Reservas    │ • eApp Reconciliaç │ • eApp Google Drive Loja     │
│ • eApp Hub Logíst. │ • eApp Invent Cego │ • eApp Calendário & Agenda   │
│ • eApp Histórico   │ • eApp Diretoria   │ • eApp Notas, Calc, Tarefas  │
│ • eApp Ordens Serv │ • eApp Relatórios  │ • eApp Configurações/Sistema │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que os operadores abram múltiplos eApps simultaneamente na mesma tela.
- Fornecer simuladores de apps móveis para que o lojista visualize a operação externa sem sair do desktop.
- Fornecer controles padrão de janela: Fechar (`X`), Minimizar (`_`), Maximizar (`🗖`) e Restaurar.
- Suportar acoplamento rápido (Docking) à esquerda (50% da tela), à direita (50% da tela) ou tela cheia (100%).
- Carregar o código das janelas pesadas sob demanda (lazy loading com `@defer`) para que o sistema operacional inicie instantaneamente em qualquer computador ou tablet.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Definição de Tipos e Registro Central:**
  - `src/app/models/os.model.ts`: Interface `OSWindow`, interface `OSAppDefinition` e o registro canônico `OS_APPS_REGISTRY` em `src/app/components/os/os-apps-registry.ts` contendo rótulo, título, ícone Material e gradiente de cor para os 33 aplicativos.
- **Simuladores Mobile Viewport:**
  - `src/app/components/os-windows/*-sim-window.ts`: Janelas que renderizam os componentes mobile (`waiter-app`, `driver-app`) dentro de frames que emulam aparelhos Android e iOS.
- **Gerenciador de Janelas em `src/app/components/client-os.ts`:**
  - Gerenciamento reativo via Signal:
    ```typescript
    readonly windows = signal<OSWindow[]>([]);
    ```
  - Métodos nativos:
    - `openApp(id: OSAppId)`: Instancia ou traz para foco (`zIndex`) a janela solicitada.
    - `closeWindow(id: OSAppId)`: Remove a janela da memória ativa.
    - `minimizeWindow(id: OSAppId)`: Oculta visualmente a janela mantendo-a na barra de tarefas.
    - `toggleMaximize(id: OSAppId)`: Alterna entre tamanho livre e 100% da viewport.
    - `dockWindow(id: OSAppId, position: 'left' | 'right' | 'full')`: Ajusta coordenadas para dividir a tela.
- **Otimização Extrema com `@defer`:**
  - O template `src/app/components/client-os.html` utiliza blocos `@defer (on timer(0ms))` para cada janela, garantindo First Contentful Paint (FCP) de alto desempenho e separação de chunks por janela.
- **Barra de Tarefas e Menu Iniciar:**
  - `src/app/components/os/taskbar.ts`: Renderiza ícones ativos com indicador luminoso e relógio de sistema.
  - `src/app/components/os/start-menu.ts`: Menu com busca textual, agrupamento de aplicativos por categoria e atalho para desligamento/bloqueio.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Clique em ícones da área de trabalho (`src/app/components/os/desktop-icon.ts`), itens do menu iniciar ou atalhos na barra de tarefas.
- **Simuladores Móveis:** Eles reutilizam os mesmos componentes e serviços (`WaiterService`, `DriversService`) das rotas mobile, mas injetados no contexto do desktop do OS para supervisão.
- **Isolamento de Estado:** Cada janela encapsula seu próprio estado reativo através dos serviços injetados correspondentes (`OrdersService`, `InventoryService`, `FinancialsService`), comunicando-se com as rotas REST `/api/*` autenticadas.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/app.spec.ts`: Validação de montagem sem erros do ecossistema.
  - `src/app/services/ecosystem.service.spec.ts`: Validação de interoperabilidade entre módulos do Store OS.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade dos eApps Embutidos

| Módulo / eApp | ID do App | Classificação | Arquivo de Implementação |
|---|---|---|---|
| eApp PDV - Frente de Caixa | `pos` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos-window.ts` |
| eApp Mesas & Salão | `tables` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/tables-window.ts` |
| eApp KDS Cozinha | `kds` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/kds-window.ts` |
| eApp Estoque ERP & NFe | `inventory` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/inventory-window.ts` |
| eApp Financeiro & DRE | `finance` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/finance-window.ts` |
| eApp Hub de Logística | `drivers` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/drivers-window.ts` |
| eApp Reservas & Fila de Espera | `agenda` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/reservations-window.ts` |
| eApp Histórico de Vendas | `history` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/order-history-window.ts` |
| eApp Ordens de Serviço | `services` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/services-window.ts` |
| eApp Gerenciador da Loja Pública | `store-manager`| 🟢 **Implementado e comprovado** | `src/app/components/os-windows/store-manager-window.ts` |
| eApp Relatórios & Métricas | `reports` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/reports-window.ts` |
| eApp Fidelidade & CRM | `crm` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/crm-window.ts` |
| eApp Reconciliação Financeira | `reconciliation` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/reconciliation-window.ts` |
| eApp Inventário Cego | `stock-audit` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/stock-audit-window.ts` |
| eApp Diretoria da Loja (Admin Hub) | `admin-hub` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/admin-hub-window.ts` |
| eApp Gestão de Fornecedores | `suppliers` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/suppliers-window.ts` |
| eApp RH & Gestão de Pessoal | `rh` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/rh-window.ts` |
| eApp WhatsApp Business | `whatsapp` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/whatsapp-window.ts` |
| eApp Portal iFood | `ifood` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/ifood-window.ts` |
| eApp Google Drive Store Cloud | `google-drive`| 🟢 **Implementado e comprovado** | `src/app/components/os-windows/google-drive-window.ts` |
| Simulador App Garçom | `waiter-sim` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/waiter-sim-window.ts` |
| Simulador App Motorista | `driver-sim` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/driver-sim-window.ts` |
| Simulador Marketplace | `consumer-sim` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/consumer-sim-window.ts` |
| eApps Utilitários (Calculadora, Notas, Tarefas) | `calc/notes/tasks` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/*.ts` |
| eApp Painel de Controle e Dispositivos | `settings/system` | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/settings-window.ts` |
| eApp Loja de Extensões / AppStore de Plugins Externos | `appstore` | 🟡 **Implementado parcialmente** | `src/app/models/os.model.ts` (registrado na barra; interface de marketplace de terceiros com catálogo base). |
