# 📱 04 — Aplicações & Módulos Auxiliares Especializados (PWAs Web Mobile)

## 📌 Esclarecimento Importante sobre Arquitetura Móvel

> 🚨 **DISCIPLINA DE IMPLANTAÇÃO MÓVEL:**
> As aplicações móveis do ecossistema (**App do Garçom** e **App do Entregador**) são **Progressive Web Applications (PWAs) / Web Apps Responsivas** rodando sobre Angular no navegador e otimizadas para smartphones e maquininhas Android (SmartPOS).
> 
> **O QUE SÃO:**
> - Web applications PWA responsivas com suporte a instalação na tela inicial.
> - Interfaces otimizadas para touch e operação em pé.
> - Telas de emulação visual de dispositivos no HQ Central para testes de homologação.
> 
> **O QUE NÃO SÃO:**
> - Projetos nativos Kotlin/Java compilados via Android Studio (APK/AAB nativo).
> - Containers Cordova/Capacitor (operam diretamente via browser / WebView).

---

## 🍽️ 1. App Mobile do Garçom (`/waiter`)

- **Objetivo**: Atendimento ágil de salão e comandas de mesa.
- **Principais Recursos**:
  - Mapa de mesas da loja (Livre, Ocupada, Reservada, Conta solicitada).
  - Lançamento de pedidos organizados nos 3 tempos da gastronomia (Entrada, Principal, Sobremesa).
  - Envio instantâneo de comandas ao KDS da cozinha.
- **Fronteira de Segurança**:
  - Acesso restrito a garçons da loja (`waiter`).
  - **Bloqueado em `/api/financials` (403)**: O garçom não tem acesso ao DRE, lucro nem receitas da loja.

---

## 🛵 2. App Mobile do Entregador (`/driver`)

- **Objetivo**: Logística de entregas e navegação de rotas.
- **Principais Recursos**:
  - Visualização e aceite de rotas de delivery atribuídas.
  - Conferência de itens no balcão da loja e confirmação de coleta.
  - Navegação de rota com telemetria GPS.
  - Baixa de entrega realizada com código de confirmação.
- **Fronteira de Segurança**:
  - O entregador visualiza **apenas os pedidos atribuídos ao seu ID** (`order.driverId === user.id`).
  - Não possui acesso a configurações da loja nem dados de outros entregadores.

---

## 📱 3. Autoatendimento & QR Code de Mesa (`/p/:id?table=X`)

- **Objetivo**: Permite que o cliente sentado na mesa faça pedidos diretamente do seu smartphone sem baixar aplicativo, vinculando a comanda à mesa física.
