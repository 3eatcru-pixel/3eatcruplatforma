# Público — 01: Marketplace regional

O marketplace regional é uma interface web em /home. A rota /marketplace redireciona para /home; ao selecionar uma loja, a vitrine usa /p/:id.

O cliente pode solicitar geolocalização do navegador para estimar distâncias. A interface mobile responsiva não comprova PWA instalável nem app nativo. A configuração regional e os dados públicos das lojas dependem das rotas /api/hq/regional e /api/tenants/public.

O estado dos fluxos e os limites desta interface precisam ser conferidos no código e no mapa geral. Testes e homologação não foram executados nesta revisão.
