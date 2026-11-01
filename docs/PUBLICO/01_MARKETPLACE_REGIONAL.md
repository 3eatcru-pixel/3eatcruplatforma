# Público — 01: Marketplace regional

O marketplace regional é uma interface web em /home. A rota /marketplace redireciona para /home; ao selecionar uma loja, a vitrine usa /p/:id.

O cliente pode solicitar geolocalização do navegador para estimar distâncias. A interface mobile responsiva não comprova PWA instalável nem app nativo. A configuração regional e os dados públicos das lojas dependem das rotas /api/hq/regional e /api/tenants/public.

O build de produção e a suíte geral passaram nesta revisão (90/90 testes). Não houve teste ponta a ponta nem homologação específica do fluxo regional com dados reais.
