# 📱 04 — Aplicações e módulos auxiliares

## Arquitetura das rotas móveis

`/waiter` e `/driver` são rotas Angular acessadas pelo navegador e separadas do desktop `/os`. O código atual não confirma empacotamento Android, instalação PWA, acesso nativo à câmera ou rastreamento em segundo plano. Esta documentação descreve apenas o comportamento observado no código.

---

## 🍽️ 1. App Mobile do Garçom (`/waiter`)

- **Objetivo**: Atendimento ágil de salão e comandas de mesa.
- **Principais Recursos**:
  - Mapa de mesas da loja (Livre, Ocupada, Reservada, Conta solicitada).
  - Lançamento de pedidos organizados nos 3 tempos da gastronomia (Entrada, Principal, Sobremesa).
  - Registro de pedidos de salão e consulta dos status retornados pelo serviço de pedidos.
- **Modo simulado**: carrega quatro mesas de demonstração. Comandas, mudanças de mesas e reservas permanecem no estado local e são descartadas quando o modo de execução muda.
- **Limites atuais**: a tela não confirma entrega do pedido a uma estação KDS nem possui pareamento com terminal. Atualizar produtos, pedidos e mesas consulta a API no modo real; na simulação, atualiza os dados locais da sessão.
- **Fronteira de Segurança**:
  - Acesso restrito a garçons da loja (`waiter`).
  - **Bloqueado em `/api/financials` (403)**: O garçom não tem acesso ao DRE, lucro nem receitas da loja.

---

## 🛵 2. App Mobile do Entregador (`/driver`)

- **Objetivo**: Logística de entregas e navegação de rotas.
- **Principais Recursos**:
  - Visualização e aceite de rotas de delivery atribuídas.
  - Conferência de itens no balcão da loja e confirmação de coleta.
  - Navegação visual de rota e atualização do estado das paradas.
  - Baixa de entrega na interface.
- **Modo simulado**: carrega um motorista e duas rotas de demonstração locais; nenhuma alteração é persistida no servidor.
- **Limites atuais**: o mapa movimenta um marcador de prévia apenas na simulação e não usa a geolocalização do dispositivo. O leitor de QR não está conectado; início de turno é manual. Código, assinatura e foto da entrega são campos visuais, sem validação ou persistência. A conclusão não envia WhatsApp automaticamente; em modo real, apenas prepara um link de atendimento.
- **Fronteira de Segurança**:
  - O entregador visualiza **apenas os pedidos atribuídos ao seu ID** (`order.driverId === user.id`).
  - Não possui acesso a configurações da loja nem dados de outros entregadores.

---

## 📱 3. Autoatendimento & QR Code de Mesa (`/p/:id?table=X`)

- **Objetivo**: Permite que o cliente sentado na mesa faça pedidos diretamente do seu smartphone sem baixar aplicativo, vinculando a comanda à mesa física.
