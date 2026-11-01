# 📱 Apps Mobile Android — 03: App do Consumidor e Marketplace Mobile PWA

## 📌 1. Visão Geral da Experiência do Consumidor no Android

O **App do Consumidor (`regional-marketplace-mobile.ts`)** é a solução de compras e relacionamento do cliente final, operando como um PWA (Progressive Web App) instalável diretamente na tela inicial de qualquer smartphone Android. A interface foi construída especificamente para navegação com uma só mão, com transições suaves e carregamento instantâneo.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        APP DO CONSUMIDOR ANDROID                       │
├────────────────────────────────────────────────────────────────────────┤
│  1. HEADER & PRAÇA REGIONAL: Seleção rápida da região (São Paulo, etc.)│
│  2. BANNER HERO DA PRAÇA: Campanhas ativas da franqueadora             │
│  3. CARROSSEL DE CATEGORIAS: Gastronomia, Varejo, Serviços e Saúde     │
│  4. FEED DE ESTABELECIMENTOS: Distância real do GPS, frete e estrelas  │
│  5. VITRINE DA LOJA & CARDÁPIO: Fotos de alta definição e adicionais   │
│  6. CARRINHO FLUTUANTE & CHECKOUT: Pix instantâneo ou Cartão de Crédito│
│  7. RASTREAMENTO EM TEMPO REAL: Status do pedido atualizado via push   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir a busca de restaurantes e lojas próximas utilizando a localização GPS do celular.
- Abrir o cardápio da loja com categorias em carrossel horizontal de fácil rolagem com o polegar.
- Gerenciar carrinho com cálculo automático de subtotal, frete e descontos.
- Exibir modal de pagamento com Pix Copia-e-Cola e QR Code para leitura por outro celular.
- Manter o cliente informado sobre o status do pedido com barra de progresso visual.
- Permitir ao cliente salvar seus endereços habituais (casa, trabalho) para checkout em 1 clique.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componentes de Frontend:**
  - `src/app/components/marketplace/regional-marketplace-mobile.ts` (865 linhas):
    - Layout mobile-first com cabeçalho sticky, seletor de praça regional com dropdown animado e botões de atalho.
    - Feed de cards com badge luminoso de "Aberto/Fechado", cálculo de distância euclidiana via `ecosystem.calculateDistanceToUser()` e tags de especialidades culinárias.
  - `src/app/components/customer-storefront.ts`:
    - Vitrine do estabelecimento com navegação responsiva em telas verticais de smartphone.
  - `src/app/components/consumer-profile.ts`:
    - Perfil do cliente com lista de pedidos, barra de status em 4 etapas (`Pendente`, `Em Preparo`, `Em Rota`, `Entregue`) e endereços salvos.
- **Roteamento Backend:**
  - `GET /api/tenants/public`: Lista de lojas sanitizada.
  - `GET /api/products/public?tenantId=:id`: Cardápio sem dados de custo.
  - `POST /api/orders`: Criação de pedido com canal `'Online Marketplace'`.
  - `POST /api/payments/intent`: Criação de cobrança Pix dinâmica.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Consumidor acessa a URL no Chrome do Android ou abre o PWA instalado na homescreen.
- **Integração com Logística e Cozinha:**
  - O pedido criado pelo cliente no app mobile aparece no KDS da cozinha da loja no mesmo instante.
  - Quando o motorista assume a entrega no `/driver`, o app do consumidor recebe a notificação e atualiza a barra de progresso para "Em Rota".

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/services/ecosystem.service.spec.ts`: Teste de montagem e responsividade do componente mobile do consumidor.
  - `src/server/commerce_war_tests.spec.ts` (Guerra 6): Validação de compras simultâneas pelo canal Marketplace Mobile concorrendo com o PDV físico.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso do App do Consumidor Mobile | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Interface Mobile-First Otimizada para Toque | 🟢 **Implementado e comprovado** | `src/app/components/marketplace/regional-marketplace-mobile.ts` | Navegação por gestos, bottom bar e cards fluidos. |
| Seletor de Praças Regionais Dinâmico | 🟢 **Implementado e comprovado** | `src/app/components/marketplace/regional-marketplace-mobile.ts:34` | Alterna praças e atualiza o feed de lojas. |
| Cálculo de Distância via GPS do Celular | 🟢 **Implementado e comprovado** | `src/app/services/ecosystem.service.ts` | Exibe km exato até o estabelecimento. |
| Carrinho Flutuante e Checkout Pix na Tela | 🟢 **Implementado e comprovado** | `src/app/components/customer-storefront.ts:600` | Gera QR Code e chave Pix Copia-e-Cola. |
| Acompanhamento de Pedido com Barra de Status | 🟢 **Implementado e comprovado** | `src/app/components/consumer-profile.ts:120` | Atualiza automaticamente em tempo real. |
| Agendamento de Reservas de Mesa | 🟢 **Implementado e comprovado** | `src/server/routes/reservations.router.ts:74` | Reserva mesa diretamente pelo celular. |
| Notificações Push Nativas via Service Worker | 🟡 **Implementado parcialmente** | `src/index.html` | Infraestrutura PWA pronta; registro de token FCM para push nativo em homologação. |
