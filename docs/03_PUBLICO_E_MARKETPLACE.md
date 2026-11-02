# 🛍️ 03 — Ambiente 3: Público & Marketplace (Experiência do Consumidor)

## 📌 Visão Geral & Escopo

O **Ambiente Público** reúne todas as interfaces voltadas para o consumidor final, cobrindo o portal do **Marketplace Regional (`/home`)**, a **Vitrine Individual da Loja (`/p/:id`)** e a **Conta do Cliente (`/consumer/login`)**.

---

## 🛠️ Experiências Públicas Inclusas

1. **Marketplace Regional (`/home`)**:
   - Portal de descoberta de estabelecimentos ativos usando a projeção pública de `GET /api/tenants/public`.
   - Busca e filtros por categoria, capacidades cadastradas e status conhecido. Distância só aparece para lojas com coordenadas.
   - O modo real não usa lojas mock quando a API falha; a lista pública fica vazia e a interface informa a indisponibilidade.
   - Redirecionamento transparente da rota legada `/marketplace` -> `/home`.

2. **Vitrine Individual & Cardápio Digital (`/p/:id`)**:
   - Cardápio público exclusivo de uma única unidade.
   - Suporte a autoatendimento na mesa via QR Code escaneado (`/p/:id?table=4`).
   - Agendamento de reservas de mesa online.

3. **Carrinho & Checkout Autorritativo**:
   - Montagem de carrinho de compras multi-itens com observações por item.
   - Envio do pedido diretamente ao motor comercial backend (`POST /api/orders/channels/...`).
   - Checkout envia o pedido à loja. PIX usa a chave configurada pela loja com confirmação manual; dinheiro pode ser pago no recebimento. Cartão não está disponível até cada loja conectar sua própria conta de pagamento.
   - A loja contrata o plano HQ e recebe o valor de seus pedidos diretamente em sua conta de pagamento. Ela escolhe e remunera seus motoristas. O app de motorista facilita a operação.
   - A rede de entregadores da plataforma e os 8% associados a essa rede estão `coming_soon`; não incidem nos pedidos nem nos motoristas da loja.

---

## 🔒 Segurança e Permissões

- **Rotas**: `/home`, `/p/:id`, `/consumer/login`
- **Acesso**: Público (`guest` / `consumer`)
- **Mapeamento Backend**: `orders.router.ts`, `payments.router.ts` e `tenants.router.ts` (public endpoints)
- **Isolamento**: O consumidor acessa somente campos higienizados por `toPublicStorefront` e `toPublicProduct`. Dados financeiros, telefone privado, chave PIX, equipe, dados de dispositivo e margens da loja permanecem inacessíveis. WhatsApp só é exposto quando cadastrado como contato público.
