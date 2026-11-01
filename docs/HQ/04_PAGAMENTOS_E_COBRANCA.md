# HQ Central — Planos e Comissão Futura da Plataforma

## Modelo comercial

O lojista contrata o plano SaaS para usar o Store OS e seus módulos. A comissão de 8% da plataforma não está ativa hoje e não substitui nem desconta o plano. A cobrança recorrente dos planos ainda não está integrada no código.

Motoristas cadastrados pela loja ficam sob responsabilidade do lojista: a loja define quanto pagar e faz o pagamento conforme seu acordo com cada motorista. O App do Entregador facilita o acesso às rotas e o registro das entregas; não processa a remuneração do motorista.

## Comissão da plataforma — Em breve

A comissão de 8% será aplicável somente ao processo futuro de entregas executadas pela rede própria de entregadores da plataforma. O HQ deve mantê-la no estado `coming_soon` até a implantação dessa rede e da inteligência operacional. O recurso fica separado das vendas, do caixa e dos pagamentos de motoristas do Store OS.

Esse estado é persistido em `hq_settings/global.platformDeliveryCommissionStatus` e o padrão do servidor é `coming_soon`. Enquanto estiver nesse estado:

- `GET /api/hq/overview` continua retornando os agregados gerais de pedidos, mas retorna `null` para valores de comissão e métricas da rede;
- `GET /api/hq/ledger`, restrito a `hq_admin`, retorna `commissionStatus: coming_soon` e nenhuma linha, sem calcular comissão;
- a tela de configuração e o relatório mostram “Em breve”; não há cobrança, retenção, comissão histórica ou repasse;
- o valor de referência de 8% fica preparado em `platformCommissionRate`, mas não incide sobre pedidos ou motoristas da loja.

O campo `serviceFeePercent` do tenant é uma taxa independente aplicada no checkout do lojista. Não representa a comissão de entregadores da plataforma.

## Preparação técnica e limites

Quando a rede da plataforma for ativada, os registros deverão identificar os entregadores da própria plataforma separadamente dos motoristas `private` de cada loja. O filtro técnico futuro considera somente pedido real de delivery com pagamento aprovado, status `delivered` e entregador de plataforma registrado em `tenantId: marketplace`.

O Store OS mantém o lançamento integral da venda do tenant em `/financials`. Não há split bancário, carteira, custódia central ou conciliação de pagamentos de motorista implementados.

| Capacidade | Situação |
|---|---|
| Planos que dão acesso ao Store OS | Catálogo e preço cadastrados; cobrança recorrente não integrada |
| Cadastro e operação de motoristas próprios da loja | Fluxo logístico disponível; remuneração decidida e paga pela loja |
| Comissão de 8% da rede da plataforma | Em breve; estado padrão `coming_soon` |
| Estimativa e ledger de comissão da plataforma | Desativados até ativação futura |
| Split, custódia, payout e conciliação bancária | Não implementados |
