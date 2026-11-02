# Público — Arquitetura

As superfícies públicas são páginas web Angular. As rotas confirmadas em src/app/app.routes.ts incluem /home, /consumer/login e /p/:id. A interface regional adapta o layout para telas menores; isso não comprova empacotamento como PWA ou aplicativo nativo.

O cliente consome as rotas públicas de tenants e produtos e cria pedidos pelo backend. O fluxo de pagamentos e seus limites estão descritos em [Checkout e pagamentos](./04_CHECKOUT_PAGAMENTO_E_PIX.md). A descoberta pode solicitar geolocalização do navegador; isso não representa GPS contínuo de entregadores. A [auditoria do marketplace regional](./01_MARKETPLACE_REGIONAL.md) descreve o estilo de mapa e os limites de localização.

A presença de API, componente ou regra no repositório não certifica homologação. O estado do Store OS e dos eApps está em [Aplicativos e módulos](../OS/03_APLICATIVOS_E_MODULOS.md).
