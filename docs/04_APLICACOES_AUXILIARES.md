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

- **Objetivo**: Apoio à operação de entregas da loja.
- **Principais Recursos**:
  - Visualização e aceite de rotas de delivery atribuídas.
  - Conferência de itens no balcão da loja e confirmação de coleta.
  - Mapa de referência, atualização do estado das paradas e compartilhamento GPS opcional.
  - Baixa de entrega na interface.
- **Responsabilidade operacional**: até a implantação de uma rede própria da plataforma, a loja organiza as entregas com seus motoristas. O motorista pode usar este app para consultar rotas e atualizar etapas; a loja define a remuneração e paga diretamente.
- **Valores de rota**: um valor exibido é apenas o informado pela loja para aquela rota. A tela não calcula saldo, confirma recebimento ou processa pagamento.
- **Modo simulado**: carrega um motorista e duas rotas de demonstração locais; nenhuma alteração é persistida no servidor.
- **Mapa real**: MapLibre/OpenFreeMap exibe coordenadas reais já cadastradas e a posição atual do aparelho apenas quando o entregador autenticado escolhe compartilhar durante uma rota `in_progress`. O envio ocorre em primeiro plano, a cada 15 segundos; ao parar, sair da tela, ocultá-la ou concluir a rota, a posição é removida. A loja só mostra posições com ping dos últimos 2 minutos. Não há histórico de localização, geocodificação de endereços, traçado de rota ou navegação curva a curva.
- **Modo simulado**: o marcador móvel e posições geradas são apenas demonstração e nunca são enviados ao GPS real.
- **Limites atuais**: o leitor de QR não está conectado; início de turno é manual. Código, assinatura e foto da entrega são campos visuais, sem validação ou persistência. A conclusão não envia WhatsApp automaticamente; em modo real, apenas prepara um link de atendimento.
- **Fronteira de Segurança**:
  - O motorista `private` consulta rotas disponíveis somente da loja à qual está vinculado; o aceite exige correspondência exata entre a loja do motorista e a rota.
  - O entregador visualiza **apenas os pedidos atribuídos ao seu ID** (`order.driverId === user.id`).
  - Pode atualizar a entrega até `delivered`; não pode marcar o pedido como `completed` nem gerar liquidação financeira.
  - Não possui acesso a configurações da loja nem dados de outros entregadores.

---

## 📱 3. Autoatendimento & QR Code de Mesa (`/p/:id?table=X`)

- **Objetivo**: Permite que o cliente sentado na mesa faça pedidos diretamente do seu smartphone sem baixar aplicativo, vinculando a comanda à mesa física.
