# HQ Central — Receita SaaS, pagamentos de pedidos e comissão futura

## Modelo comercial

O HQ recebe do lojista a assinatura pelo uso do Store OS e pela cota de dispositivos do plano. A cobrança recorrente ainda não está integrada.

O valor pago pelo consumidor em um pedido do marketplace pertence à loja e deve chegar diretamente à conta configurada por ela. Esse fluxo não é receita do HQ e não deve passar por uma conta central da plataforma. A oferta da assinatura deverá atender lojas sem equipe própria com entregadores da plataforma quando estiver disponível; ainda não foi definido se esse acesso ficará incluído no plano ou será uma opção adicional, e preço e cobrança não estão implementados.

Motoristas cadastrados pela loja ficam sob responsabilidade do lojista: a loja define quanto pagar e faz o pagamento conforme seu acordo com cada motorista. O App do Entregador facilita o acesso às rotas e o registro das entregas; não processa a remuneração do motorista.

## Comissão da plataforma — Em breve

A comissão de 8% será aplicável somente ao processo futuro de entregas executadas pela rede própria de entregadores da plataforma. O HQ deve mantê-la no estado `coming_soon` até a implantação dessa rede e da inteligência operacional. O recurso fica separado das vendas, do caixa e dos pagamentos de motoristas do Store OS.

Esse estado é persistido em `hq_settings/global.platformDeliveryCommissionStatus` e o padrão do servidor é `coming_soon`. Enquanto estiver nesse estado:

- a configuração do HQ usa `POST /api/hq/system/platform-delivery-commission` para salvar `coming_soon`; a API rejeita a ativação antecipada;
- `GET /api/hq/overview` continua retornando os agregados gerais de pedidos, mas retorna `null` para valores de comissão e métricas da rede;
- `GET /api/hq/ledger`, restrito a `hq_admin`, retorna `commissionStatus: coming_soon` e nenhuma linha, sem calcular comissão;
- a tela de configuração e o relatório mostram “Em breve”; não há cobrança, retenção, comissão histórica ou repasse;
- o valor de referência de 8% fica preparado em `platformCommissionRate`, mas não incide sobre pedidos ou motoristas da loja.

O campo legado `serviceFeePercent` não é aplicado. No checkout, a cobrança de entrega usa somente o valor fixo `deliveryFee` definido pela loja (inclusive R$ 0,00). A comissão futura de 8% não é repassada ao pedido nem cobrada do cliente enquanto estiver em `coming_soon`.

## Pagamentos de pedidos das lojas

O PIX pode usar a chave do tenant cadastrada pelo lojista em Minha Loja; o recebimento é direto na conta dessa chave, mas a confirmação do PIX é manual e não consulta o PSP. A integração de cartão com uma conta global Stripe foi removida do processamento live para impedir que pedidos das lojas sejam cobrados na conta da plataforma. Cartão real ficará indisponível até existir conexão de adquirência vinculada ao tenant. Dinheiro e voucher são recebidos e administrados pela loja.

## Preparação técnica e limites

Quando a rede da plataforma for ativada, os registros deverão identificar os entregadores da própria plataforma separadamente dos motoristas `private` de cada loja. O filtro técnico futuro considera somente pedido real de delivery com pagamento aprovado, status `delivered` e entregador de plataforma registrado em `tenantId: marketplace`.

O Store OS mantém o lançamento integral da venda do tenant em `/financials`. Não há split bancário, carteira, custódia central ou conciliação de pagamentos de motorista implementados.

| Capacidade | Situação |
|---|---|
| Planos que dão acesso ao Store OS | Catálogo e preço cadastrados; cobrança recorrente não integrada |
| Cota de dispositivos por plano | Aplicada no cadastro de novos tenants e no registro de dispositivos |
| Acesso de lojas sem frota à rede de entregadores da plataforma | Em breve; inclusão no plano/regra adicional, preço e operação ainda não definidos |
| Cadastro e operação de motoristas próprios da loja | Fluxo logístico disponível; remuneração decidida e paga pela loja |
| Comissão de 8% da rede da plataforma | Em breve; estado padrão `coming_soon` |
| Estimativa e ledger de comissão da plataforma | Desativados até ativação futura |
| Recebimento direto via chave PIX da loja | Implementado com confirmação manual; sem webhook/baixa automática; tarifas do banco não são apuradas |
| Cartão real destinado à conta da loja | Bloqueado até integração PSP por tenant |
| Custódia, repasse e conciliação bancária do pagamento dos pedidos | Não implementados; HQ não deve receber os valores da loja |
