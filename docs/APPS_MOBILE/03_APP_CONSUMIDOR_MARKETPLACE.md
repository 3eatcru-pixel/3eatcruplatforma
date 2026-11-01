# Aplicações auxiliares — 03: Marketplace e experiência do consumidor

Esta página descreve as interfaces web existentes. O repositório não comprova um aplicativo Android nativo, PWA instalável ou entrega de notificações push.

## Rotas e telas

- /home apresenta o marketplace regional.
- /p/:id apresenta a vitrine pública da loja.
- /consumer/login permite autenticação do consumidor.
- /waiter e /driver são rotas web auxiliares e não são o app do consumidor.

A interface regional é responsiva e pode solicitar geolocalização do navegador para estimar distância até estabelecimentos. Esse recurso não representa rastreamento do entregador.

## Integrações observadas

- A lista pública de lojas usa GET /api/tenants/public.
- O catálogo público usa GET /api/products/public.
- Pedidos usam as rotas do domínio /api/orders.
- Pagamentos usam POST /api/payments/process e, para confirmação manual autorizada, POST /api/payments/:id/confirm.
- Reservas públicas usam /api/reservations/public.

O estado dos módulos e os limites operacionais estão em [Aplicativos e módulos do Store OS](../OS/03_APLICATIVOS_E_MODULOS.md) e [Checkout e pagamentos](../PUBLICO/04_CHECKOUT_PAGAMENTO_E_PIX.md).

## Limites conhecidos

- Não há integração de push nativo comprovada nesta documentação.
- O KDS não está integrado como janela do Store OS; o pedido não deve ser descrito como aparecendo em uma estação KDS conectada.
- A confirmação de PIX não é verificada por webhook de adquirente no servidor.
- O build Angular de produção e a suíte geral passaram nesta revisão (90/90 testes). Não foi gerado pacote nativo nem feita homologação em dispositivo móvel.
