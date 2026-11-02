# Público — 01: Marketplace regional

Atualizado em 2026-11-02 após auditoria dos mapas e localização.

O marketplace regional é servido em `/home`; `/marketplace` e `/regional` redirecionam para a mesma tela. A vitrine individual usa `/p/:id`.

## Origem e qualidade dos dados

- Em modo real, marketplace e página inicial leem `TenantsService.publicStorefronts`, alimentado por `GET /api/tenants/public`. A rota retorna apenas estabelecimentos `active` e aplica `toPublicStorefront` no servidor.
- O contrato público não inclui CNPJ, nome legal, telefone privado, credenciais PIX, dados de equipe, inventário de dispositivos ou campos financeiros. O contato via WhatsApp e produtos destacados só aparecem quando a loja os configurou como dados públicos.
- Se a API falhar, a lista pública fica vazia e a interface apresenta o estado de erro; lojas de demonstração não são usadas como fallback em modo real. No modo de simulação, os dados de exemplo são rotulados como demonstração.
- Avaliações, contagem de avaliações, prazo de entrega, horário, localização e taxa só são apresentados quando há valores cadastrados. Não há avaliação agregada implementada; por isso, o marketplace não classifica por nota.

## Descoberta, distância e entrega

A busca filtra lojas por categoria, capacidades explícitas, nome e endereço publicado. O HQ define o raio inicial (1–30 km) em `defaultSearchRadiusKm`; quando a configuração regional carrega, esse valor preenche o filtro do consumidor. Depois de autorizar o GPS, o consumidor pode ajustar seu raio localmente. A distância e o filtro por raio só são ativados depois que o navegador fornece a localização real; falha de GPS não usa um ponto fixo como fallback. Uma loja sem coordenadas pode aparecer, mas não recebe distância calculada. A busca textual não geocodifica endereços. Status de abertura desconhecido não é contado como aberto ou fechado.

A loja organiza e paga os próprios motoristas; o app de motorista facilita a operação. A rede de entregadores da plataforma e a comissão de 8% continuam `coming_soon`; não fazem parte dos pedidos da loja. Consulte [API e eventos](../INTEGRACAO/02_API_E_EVENTOS.md) para o contrato operacional.

## Mapa e privacidade da localização

O mapa regional usa o estilo vetorial Liberty do OpenFreeMap através do MapLibre, com créditos OpenMapTiles e OpenStreetMap visíveis ([guia oficial do OpenFreeMap](https://openfreemap.org/quick_start/), [documentação do MapLibre](https://maplibre.org/maplibre-gl-js/docs/)). A base preserva as cores do mapa com saturação levemente elevada. Os marcadores só usam coordenadas públicas cadastradas para cada estabelecimento. A análise cartográfica administrativa do HQ é independente da busca pública; contabiliza apenas lojas ativas com latitude e longitude válidas, e não inventa coordenadas nem altera o raio inicial ou a área de entrega de uma loja. A inicialização aguarda a abertura da visualização cartográfica; sair dela libera o mapa para evitar instâncias duplicadas. O carregamento preguiçoso e os workers estáticos passam por `MapProviderService` e pela configuração `assets` do Angular.

O consumidor solicita sua localização ao tocar no comando de GPS. As coordenadas ficam no navegador para calcular a distância em linha reta e ordenar resultados; não são enviadas à API nem compartilhadas com as lojas. Não há geocodificação de texto, rota para o cliente, rastreamento de entrega ou estimativa de chegada calculada pelo mapa.

A interface responsiva não comprova PWA instalável nem app nativo. Nesta revisão, não houve teste ponta a ponta nem homologação do fluxo regional com dados reais.
