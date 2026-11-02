# Público — 01: Marketplace regional

Atualizado em 2026-11-01 após auditoria do fluxo público.

O marketplace regional é servido em `/home`; `/marketplace` e `/regional` redirecionam para a mesma tela. A vitrine individual usa `/p/:id`.

## Origem e qualidade dos dados

- Em modo real, marketplace e página inicial leem `TenantsService.publicStorefronts`, alimentado por `GET /api/tenants/public`. A rota retorna apenas estabelecimentos `active` e aplica `toPublicStorefront` no servidor.
- O contrato público não inclui CNPJ, nome legal, telefone privado, credenciais PIX, dados de equipe, inventário de dispositivos ou campos financeiros. O contato via WhatsApp e produtos destacados só aparecem quando a loja os configurou como dados públicos.
- Se a API falhar, a lista pública fica vazia e a interface apresenta o estado de erro; lojas de demonstração não são usadas como fallback em modo real. No modo de simulação, os dados de exemplo são rotulados como demonstração.
- Avaliações, contagem de avaliações, prazo de entrega, horário, localização e taxa só são apresentados quando há valores cadastrados. Não há avaliação agregada implementada; por isso, o marketplace não classifica por nota.

## Descoberta, distância e entrega

A busca filtra lojas por categoria, capacidades explícitas, nome e endereço publicado. Uma loja sem coordenadas pode aparecer, mas não recebe distância calculada. A distância e o filtro por raio só são ativados depois que o navegador fornece a localização real; falha de GPS não usa um ponto fixo como fallback. A busca textual não geocodifica endereços. Status de abertura desconhecido não é contado como aberto ou fechado.

A loja organiza e paga os próprios motoristas; o app de motorista facilita a operação. A rede de entregadores da plataforma e a comissão de 8% continuam `coming_soon`; não fazem parte dos pedidos da loja. Consulte [API e eventos](../INTEGRACAO/02_API_E_EVENTOS.md) para o contrato operacional.

A interface responsiva não comprova PWA instalável nem app nativo. Nesta revisão, não houve teste ponta a ponta nem homologação do fluxo regional com dados reais.
