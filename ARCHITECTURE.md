# Arquitetura atual do 3EATCRU

Este documento resume a implementação presente no repositório. O índice canônico da documentação é [docs/INDEX.md](./docs/INDEX.md); o estado dos módulos está em [MODULE_STATUS.md](./MODULE_STATUS.md).

## Stack

- Angular 21 com Angular SSR no frontend.
- Express 5 para a API e o servidor SSR.
- Firebase Authentication e Firebase Admin SDK.
- Cloud Firestore para dados de negócio.
- Modelos compartilhados no diretório src/shared.

A implementação deste checkout é Angular/Express. Não há migração para Next.js/React concluída.

## Ambientes do produto

| Ambiente | Rotas | Responsabilidade e estado |
|---|---|---|
| HQ Central | /hq | Governança de tenants, responsáveis, catálogo de planos e configurações. A cobrança recorrente da assinatura SaaS não está integrada. |
| Store OS | /os, /pos | Desktop da loja e PDV standalone. O mapa de módulos identifica quais atalhos ainda são placeholders. |
| Público | /home, /p/:id | Marketplace regional, vitrine e pedidos do consumidor. |
| Rotas auxiliares | /waiter, /driver | Interfaces web para garçom e entregador; não comprovam aplicativos nativos ou PWA instalado. |

## Assinatura e dispositivos

O lojista contrata no HQ a assinatura para usar o Store OS e a cota de dispositivos do plano. A oferta deverá atender também lojas sem frota própria com entregadores da plataforma quando estiver pronta. O catálogo e a validação de cotas estão implementados; cobrança recorrente e regras/preços para esse acesso à frota não estão.

## Fluxo do negócio de entregas

A loja administra seus próprios motoristas e define a remuneração deles. A comissão futura de 8% da plataforma permanece em coming_soon, separada da assinatura SaaS e dos pagamentos dos pedidos. Só poderá incidir sobre entregas executadas pela futura rede própria da plataforma.

## Pagamentos do marketplace

O pagamento do pedido é destinado à conta da loja. O PIX pode ser direcionado à chave do tenant cadastrada no eApp Minha Loja, com confirmação manual. Cartão real fica bloqueado até existir credenciamento de pagamento por tenant; a chave Stripe global não deve receber pedidos das lojas.

## Arquitetura da API e persistência

As rotas Express são montadas em src/server/api.ts sob /api. O servidor usa Firebase Admin SDK; por isso, as regras de acesso do cliente em firestore.rules não substituem autorização e validação em cada rota.

O estado de cada rota, módulo, janela e integração precisa ser lido nas fontes atuais de maturidade, sem inferir prontidão de produção pela presença de um componente ou serviço.

## Prontidão

Este resumo não declara build, testes, implantação ou homologação aprovados. Consulte [MODULE_STATUS.md](./MODULE_STATUS.md) e [a estratégia de testes e recuperação](./docs/INTEGRACAO/04_TESTES_E_RECUPERACAO.md).
