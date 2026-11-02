# HQ Central — Receita SaaS, pagamentos de pedidos e comissão futura

## Modelo comercial

O HQ recebe do lojista a assinatura mensal pelo acesso completo ao Store OS e pela cota de dispositivos do plano. Todos os planos incluem o mesmo acesso ao OS; o limite de dispositivos é a diferença comercial cadastrada. O HQ pode gerar checkout recorrente Mercado Pago ou Stripe e acompanhar o estado e as faturas recebidas pelos webhooks.

O valor pago pelo consumidor em um pedido do marketplace pertence à loja e deve chegar diretamente à conta configurada por ela. Esse fluxo não é receita do HQ e não passa pela cobrança central da plataforma. Quando a loja contratar entregadores da rede própria da plataforma, incidirá uma comissão separada de 8% sobre as entregas elegíveis. A rede ainda está em `coming_soon`, então essa comissão não é calculada nem cobrada hoje.

Motoristas cadastrados pela loja ficam sob responsabilidade do lojista: a loja define quanto pagar e faz o pagamento conforme seu acordo com cada motorista. O App do Entregador facilita o acesso às rotas e o registro das entregas; não processa a remuneração do motorista.

## Comissão da plataforma — Em breve

A comissão de 8% será aplicável somente ao processo futuro de entregas executadas pela rede própria de entregadores da plataforma. O HQ deve mantê-la no estado `coming_soon` até a implantação dessa rede e da inteligência operacional. O recurso fica separado das vendas, do caixa e dos pagamentos de motoristas do Store OS.

Esse estado é persistido em `hq_settings/global.platformDeliveryCommissionStatus` e o padrão do servidor é `coming_soon`. Uma trava de prontidão no backend força esse estado até a rede e a inteligência operacional existirem; um valor `active` legado salvo no Firestore é ignorado. Enquanto estiver nesse estado:

- a configuração do HQ usa `POST /api/hq/system/platform-delivery-commission` para salvar `coming_soon`; a API rejeita a ativação antecipada;
- `GET /api/hq/overview` continua retornando os agregados gerais de pedidos, mas retorna `null` para valores de comissão e métricas da rede;
- `GET /api/hq/ledger`, restrito a `hq_admin`, retorna `commissionStatus: coming_soon` e nenhuma linha, sem calcular comissão;
- a tela de configuração e o relatório mostram “Em breve”; não há cobrança, retenção, comissão histórica ou repasse;
- o valor de referência de 8% fica preparado em `platformCommissionRate`, mas não incide sobre pedidos ou motoristas da loja.

O campo legado `serviceFeePercent` não é aplicado. No checkout, a cobrança de entrega usa somente o valor fixo `deliveryFee` definido pela loja (inclusive R$ 0,00). A comissão futura de 8% não é repassada ao pedido nem cobrada do cliente enquanto estiver em `coming_soon`.

## Motor de assinatura do HQ

O painel `Pagamentos SaaS` no HQ lista lojas, plano, provedor e status da assinatura, permite gerar/abrir o checkout hospedado e cancelar a assinatura no provedor. O preço vem do plano autorizado no servidor e o e-mail vem do cadastro do tenant. Um checkout pendente é reutilizado para impedir cobranças recorrentes duplicadas. O backend mantém `platform_subscriptions`, `platform_billing_invoices` e `billing_webhook_events`; os identificadores externos e estados são persistidos sem guardar cartão ou credenciais do provedor.

Mercado Pago e Stripe usam credenciais apenas no servidor. O checkout requer API key e segredo de webhook configurados. O Stripe valida a assinatura com o corpo HTTP bruto; Mercado Pago valida o HMAC do `x-signature` e consulta o recurso no provedor antes de registrar a cobrança. No Mercado Pago, configure os tópicos `subscription_preapproval` e `subscription_authorized_payment`; este último busca a fatura em `/authorized_payments/{id}`. O tópico `payment` também é aceito como compatibilidade. Sem webhook assinado, o HQ não marca o pagamento como confirmado. O cancelamento só altera o estado local depois de o provedor confirmar.

Configuração necessária: `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_BILLING_WEBHOOK_SECRET`, `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`. O checkout Mercado Pago envia a URL de webhook em cada assinatura. Os provedores podem ser configurados individualmente. O estado de cobrança não suspende automaticamente a loja; a política de prazo de tolerância e bloqueio operacional ainda precisa ser definida.

## Pagamentos de pedidos das lojas

O PIX pode usar a chave do tenant cadastrada pelo lojista em Minha Loja; o recebimento é direto na conta dessa chave, mas a confirmação do PIX é manual e não consulta o PSP. A integração de cartão com uma conta global Stripe foi removida do processamento live para impedir que pedidos das lojas sejam cobrados na conta da plataforma. Cartão real ficará indisponível até existir conexão de adquirência vinculada ao tenant. Dinheiro e voucher são recebidos e administrados pela loja.

## Preparação técnica e limites

Quando a rede da plataforma for ativada, os registros deverão identificar os entregadores da própria plataforma separadamente dos motoristas `private` de cada loja. O filtro técnico futuro considera somente pedido real de delivery com pagamento aprovado, status `delivered` e entregador de plataforma registrado em `tenantId: marketplace`.

O Store OS mantém o lançamento integral da venda do tenant em `/financials`. Não há split bancário, carteira, custódia central ou conciliação de pagamentos de motorista implementados.

| Capacidade | Situação |
|---|---|
| Acesso ao Store OS pelos planos | Acesso completo em todos os planos; a cota de dispositivos diferencia cada plano |
| Cobrança recorrente da assinatura SaaS | Checkout Stripe/Mercado Pago e registro de status/faturas implementados; credenciais e homologação live pendentes |
| Painel HQ de assinaturas | Lista status, gera links de checkout, cancela no provedor e consulta faturas recebidas por webhook |
| Cota de dispositivos por plano | Aplicada no cadastro de novos tenants e no registro de dispositivos |
| Uso da rede de entregadores da plataforma | Em breve; quando ativada, comissão de 8% por entrega elegível, separada da assinatura SaaS |
| Cadastro e operação de motoristas próprios da loja | Fluxo logístico disponível; remuneração decidida e paga pela loja |
| Comissão de 8% da rede da plataforma | Em breve; estado padrão `coming_soon` |
| Estimativa e ledger de comissão da plataforma | Desativados até ativação futura |
| Recebimento direto via chave PIX da loja | Implementado com confirmação manual; sem webhook/baixa automática; tarifas do banco não são apuradas |
| Cartão real destinado à conta da loja | Bloqueado até integração PSP por tenant |
| Custódia, repasse e conciliação bancária do pagamento dos pedidos | Não implementados; HQ não deve receber os valores da loja |
