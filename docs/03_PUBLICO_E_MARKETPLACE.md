# 🛍️ 03 — Ambiente 3: Público & Marketplace (Experiência do Consumidor)

## 📌 Visão Geral & Escopo

O **Ambiente Público** reúne todas as interfaces voltadas para o consumidor final, cobrindo o portal do **Marketplace Regional (`/home`)**, a **Vitrine Individual da Loja (`/p/:id`)** e a **Conta do Cliente (`/consumer/login`)**.

---

## 🛠️ Experiências Públicas Inclusas

1. **Marketplace Regional (`/home`)**:
   - Portal de descoberta de estabelecimentos por proximidade geográfica (Fórmula Haversine).
   - Busca de pratos, filtro por categorias, status de loja aberta/fechada e tempo estimado de entrega.
   - Redirecionamento transparente da rota legada `/marketplace` -> `/home`.

2. **Vitrine Individual & Cardápio Digital (`/p/:id`)**:
   - Cardápio público exclusivo de uma única unidade.
   - Suporte a autoatendimento na mesa via QR Code escaneado (`/p/:id?table=4`).
   - Agendamento de reservas de mesa online.

3. **Carrinho & Checkout Autorritativo**:
   - Montagem de carrinho de compras multi-itens com observações por item.
   - Envio do pedido diretamente ao motor comercial backend (`POST /api/orders/channels/...`).
   - Processamento de pagamento via PIX (EMV QR Code com CRC-16) ou Cartão.

---

## 🔒 Segurança e Permissões

- **Rotas**: `/home`, `/p/:id`, `/consumer/login`
- **Acesso**: Público (`guest` / `consumer`)
- **Mapeamento Backend**: `orders.router.ts`, `payments.router.ts` e `tenants.router.ts` (public endpoints)
- **Isolamento**: O consumidor acessa apenas dados higienizados da coleção pública `public_catalog` e `public_storefronts`. Dados financeiros e margens da loja permanecem inacessíveis.
