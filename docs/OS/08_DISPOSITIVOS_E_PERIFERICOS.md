# 🏬 Store OS — 08: Dispositivos, Periféricos e Conectividade de Hardware

## 📌 1. Visão Geral da Camada de Periféricos de Loja

O ambiente de varejo físico e gastronomia depende da comunicação contínua com equipamentos periféricos de automação comercial: **impressoras térmicas de tíquetes**, **leitores de código de barras**, **balanças de pesagem**, **gavetas automáticas de dinheiro** e **máquinas de cartão integradas (TEF/Smart POS)**. O Store OS abstrai esses dispositivos por meio de protocolos web modernos (Web Serial API, WebUSB e Web Bluetooth) e renderização gráfica em bobinas térmicas padronizadas (80mm e 58mm).

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        STORE OS: HUB DE HARDWARE                       │
│    (src/app/components/os-windows/settings/hardware-settings.ts)       │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. IMPRESSORAS     │ 2. LEITORES DE     │ 3. BALANÇAS DE CHECKOUT      │
│    TÉRMICAS        │    CÓDIGO DE BARRA │    (KG / GRAMAS)             │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ • Bobina 80mm KDS  │ • Leitor USB HID   │ • Protocolo Toledo / Prix    │
│ • Bobina 58mm PDV  │ • Emulação Teclado │ • Protocolo Filizola         │
│ • Gaveta Automática│ • Câmera Scanner   │ • Captura Direta no Carrinho │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que a loja configure a impressora de produção da cozinha separada da impressora de cupom fiscal do caixa.
- Capturar instantaneamente o código de barras bipado pelo operador no balcão sem perder o foco dos campos do PDV.
- Ler o peso líquido da balança conectada à porta serial do computador quando um item precificado por quilo for selecionado.
- Permitir o auto-provisionamento de novos terminais de atendimento (KDS, Tablets ou PDVs) respeitando a cota da loja.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componente de Configuração de Hardware:**
  - `src/app/components/os-windows/settings/hardware-settings.ts`: Janela para seleção de impressoras ativas, taxa de comunicação serial de balança (baud rate: 9600, 4800) e teste de comunicação.
  - `src/app/components/os-windows/settings/provision-device-modal.ts`: Modal para cadastrar novo terminal e gerar credenciais de acesso local.
- **Módulo de Leitura de Código de Barras:**
  - `src/app/components/os-windows/pos/pos-scanner.ts`: Escuta global de eventos de teclado com buffer rápido (captura rajada de caracteres típica de leitores USB a laser) e busca produto por `barcode` ou `sku`.
- **Módulo de Balança:**
  - `src/app/components/os-windows/pos/pos-scale-modal.ts`: Modal interativo com botões de Tara, Estabilização e Envio de Peso para o carrinho.
- **Formatação de Cupom Térmico:**
  - `src/app/components/os-windows/pos/pos-receipt-modal.ts`: Estilização CSS voltada para impressão sem margens com largura configurável (`w-[80mm]` ou `w-[58mm]`) e fontes monoespaçadas de alta legibilidade.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Interação física com os periféricos do caixa.
- **Integração com o Servidor e HQ:**
  - Ao provisionar um novo dispositivo (`provision-device-modal.ts`), o Store OS chama `POST /api/hq/devices`, associando o número de série ao seu `tenantId`.
  - O servidor valida se a loja ainda possui vagas na cota contratada (`activeDevicesCount < devicesLimit`). Se excedida, a criação é rejeitada.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/services/store-os-api.service.spec.ts`: Cobertura de chamadas de dispositivos e hardware no escopo do lojista.
  - Testes de renderização de cupom e leitor em suíte de componentes.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Dispositivo / Periférico | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Leitor de Código de Barras USB | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-scanner.ts` | Captura eventos de leitor laser e preenche carrinho. |
| Impressão de Cupom Térmico (80mm/58mm) | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-receipt-modal.ts` | Impressão via browser `window.print` com layout térmico. |
| Provisionamento Local de Dispositivos | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/settings/provision-device-modal.ts` | Valida cota de hardware antes de ativar terminal. |
| Interface e Emulação de Balança de Pesagem | 🟢 **Implementado e comprovado** | `src/app/components/os-windows/pos/pos-scale-modal.ts` | Tara, cálculo de peso e multiplicação por kg. |
| Conexão Física Direta via Web Serial API | 🟡 **Implementado parcialmente** | `src/app/components/os-windows/settings/hardware-settings.ts` | Estrutura de configuração serial pronta; chamada `navigator.serial.requestPort()` em homologação para navegadores Chromium. |
| Protocolo Nativo ESC/POS via Rede Raw Socket (Porta 9100) | 🔵 **Planejado, ainda não implementado** | `docs/00_ARQUITETURA_GERAL.md` | Previsto para driver nativo Node.js/Desktop (Electron). |
