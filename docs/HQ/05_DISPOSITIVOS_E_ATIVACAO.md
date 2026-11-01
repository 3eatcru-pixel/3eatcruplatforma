# 🏛️ HQ Central — 05: Gestão de Dispositivos, MDM e Ativação de Terminais

## 📌 1. Visão Geral da Camada de Hardware e MDM

O ecossistema 3EATCRU opera com terminais de atendimento distribuídos em unidades físicas (terminais de caixa PDV, telas de cozinha KDS, totens de autoatendimento e tablets de garçons). O HQ Central dispõe de um módulo **MDM (Mobile Device Management)** capaz de supervisionar o parque de hardware, aplicar restrições operacionais e despachar comandos remotos.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        HQ CENTRAL: PAINEL MDM                          │
│        (src/app/components/hq/hq-devices-list.ts - /api/hq/devices)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │ POST .../lock         │ POST .../restart      │ POST .../pair
            ▼                       ▼                       ▼
    [🔒 BLOQUEIO REMOTO]     [🔄 REINICIALIZAÇÃO]    [📱 PAREAMENTO SEGURO]
    Muda status para         Envia sinal de reboot   Associa Serial Number
    'locked' no Firestore    e atualização de app    ao tenantId e cota
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Manter o inventário completo de todos os terminais em operação na rede (Nome do Dispositivo, Número de Série, Endereço MAC, IP Local, Versão do SO, Versão da Aplicação, Nível de Bateria e Localização Física).
- Permitir o pareamento seguro de novos equipamentos, respeitando o limite máximo contratado pela unidade (`devicesLimit`).
- Permitir que o Super Admin suspenda ou bloqueie instantaneamente qualquer terminal (ex: em caso de extravio, furto ou inadimplência da unidade).
- Enviar comando de reinicialização remota para forçar recarga da aplicação web e limpeza de cache.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Modelo de Dados de Dispositivo (`POSDevice`):**
  Definido em `src/shared/models/ecosystem.model.ts:80`:
  ```typescript
  export interface POSDevice {
    id: string;
    tenantId: string;
    tenantName: string;
    deviceName: string;
    type: 'terminal' | 'kds' | 'mobile_waiter' | 'totem' | 'scale';
    serialNumber: string;
    macAddress?: string;
    ipAddress?: string;
    osVersion: string;
    appVersion: string;
    status: 'online' | 'offline' | 'locked' | 'updating';
    lastPing: string;
    location?: string;
    batteryLevel?: number;
  }
  ```
- **Endpoints de MDM no HQ:**
  - `GET /api/hq/devices`: Consulta todos os dispositivos da rede ou filtra por `tenantId` (`src/server/routes/hq.router.ts:210`).
  - `POST /api/hq/devices`: Registra novo hardware associado à loja (`hq.router.ts:225`).
  - `POST /api/hq/devices/:id/lock`: Alterna estado entre `online` e `locked` (`hq.router.ts:270`).
  - `POST /api/hq/devices/:id/restart`: Define estado como `updating` e dispara ordem de reboot (`hq.router.ts:295`).
- **Persistência Firestore:** Coleção `/devices/{id}`.
- **Interface Visual do HQ:** `src/app/components/hq/hq-devices-list.ts` com cards de status, indicadores de bateria e botões de ação remota.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Comandos emitidos pelo Super Admin autenticado com `requireHqAdmin`.
- **Efeito no Store OS:**
  - O Store OS (`src/app/components/client-os.ts`) observa seu próprio registro de hardware.
  - Se o status do terminal for modificado para `'locked'`, o sistema operacional do lojista exibe a tela de bloqueio forçado, desativando comandos do teclado e mouse para o operador local.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/services/hq-api.service.spec.ts`: Cobertura de chamadas aos endpoints de listagem, pareamento e bloqueio de dispositivos.
  - `src/app/services/store-os-api.service.spec.ts`: Validação de busca de dispositivos escopados ao tenant.
- **Resultado:** 100% de aprovação.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso MDM / Hardware | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Inventário Centralizado de Terminais | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:210` | Registro de MAC, IP, bateria, versão e serial no Firestore `/devices`. |
| Bloqueio Remoto de Terminal (`/lock`) | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:270` | Altera status para `locked` e gera registro em `/audit_logs`. |
| Comando Remoto de Reinicialização (`/restart`) | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:295` | Altera status para `updating` notificando o cliente web. |
| Pareamento Seguro com Validação de Tenant | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:225` | Impede pareamento de terminais órfãos sem loja associada. |
| Coleta de Telemetria Passiva em Background (Heartbeat contínuo) | 🟡 **Implementado parcialmente** | `src/app/components/os/os-status-widget.ts` | Dispositivos enviam telemetria na inicialização e ações de venda; heartbeat por WebSocket a cada 30 segundos em planejamento. |
| Gerenciamento de Firmware Nativo (Android/Linux MDM agent) | 🔵 **Planejado, ainda não implementado** | `docs/00_ARQUITETURA_GERAL.md` | Previsto para empacotamento com APK Android dedicado para máquinas Smart POS. |
