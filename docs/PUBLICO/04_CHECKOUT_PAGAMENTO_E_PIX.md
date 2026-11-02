# Público — 04: Checkout e pagamentos

Atualizado em 2026-11-02 após revisar o cliente, API e roteador de pagamentos. Este documento descreve o fluxo encontrado; não declara integração financeira homologada.

## Fluxos disponíveis no código

O checkout da vitrine cria o pedido e chama POST /api/payments/process para PIX ou dinheiro. O servidor verifica pedido, tenant, valor e autorização antes de criar a transação em payment_transactions. Repetições do mesmo meio reutilizam a tentativa pendente.

- **PIX:** o lojista cadastra sua chave na tela Minha Loja; o checkout público só oferece PIX quando a chave está cadastrada. O servidor monta um BR Code para essa chave e registra a transação como pending_pix. O valor é destinado à conta da loja. A confirmação é manual e não verifica recebimento no banco ou PSP. Checkout real sem chave retorna `TENANT_PIX_KEY_NOT_CONFIGURED`. O PDV pode mostrar um endereço não roteável apenas em teste sandbox interno; a vitrine pública não recebe esse QR.
- **Confirmação:** POST /api/payments/:id/confirm permite confirmação autenticada por hq_admin, tenant_owner ou operator do mesmo tenant. A rota não consulta um provedor para verificar o recebimento do PIX; antes de confirmar, confere atomicamente que o pedido existe, está pendente (sem pagamento aprovado/estornado), pertence ao mesmo tenant, mantém o mesmo valor e segue vinculado à tentativa.
- **Webhooks:** não foi localizado endpoint de webhook de adquirente em src/server/api.ts ou em src/server/routes/payments.router.ts.
- **Cartão:** o checkout público retorna `TENANT_CARD_ACCOUNT_NOT_CONFIGURED` até existir uma adquirente conectada à conta da loja. O valor não deve ser cobrado na conta central do HQ. Cartão Mercado Pago continua não implementado; o sandbox do PDV é restrito ao operador e ao pedido `pos-counter`, que fica marcado como simulado.
- **Terminal externo no PDV:** proprietário/operador cadastra perfis próprios da loja em Configurações e habilita PIX, crédito e/ou débito. O caixa escolhe um perfil ativo, confere a aprovação no equipamento/aplicativo bancário e confirma a entrada manual. O servidor registra pedido, transação com o nome do terminal e lançamento financeiro em uma operação atômica com chave idempotente. Esse caminho não chama o PSP da plataforma nem torna o checkout público de cartão disponível; o HQ não configura esses terminais.
- **Dinheiro:** o checkout público registra pagamento pendente para recebimento na entrega/retirada; operador da loja registra a confirmação presencial. Vouchers permanecem restritos ao fluxo operacional disponível.
- **Liquidação por loja:** no checkout processado pelo sistema, cartão exige uma conta de adquirência conectada a cada tenant, ainda não integrada. No PDV presencial, a loja pode registrar recebimento feito por terminal externo próprio. PIX e dinheiro ficam sob responsabilidade da loja; o HQ não recebe nem repassa valores de pedidos. Uma tentativa de sandbox do PDV não representa liquidação e é excluída do histórico financeiro real.
- **Conclusão financeira:** a API só aceita `status: completed` quando há uma transação aprovada que corresponda ao pedido, tenant e valor. O entregador pode atualizar o andamento até `delivered`, mas não conclui a liquidação financeira. Cancelar pedido já pago exige fluxo de estorno, ainda não implementado; a API retorna `409 REFUND_REQUIRED`.

## Divisão manual do custo da entrega

Em Minha Loja, o proprietário/operador configura dois valores fixos por pedido de delivery:

- **Taxa paga pelo cliente (`deliveryFee`):** entra no total do pedido e é mostrada no checkout.
- **Complemento pago pela loja (`storeDeliveryContribution`):** não aumenta o total do cliente; fica registrado como parte que a loja combina pagar diretamente ao entregador.
- **Remuneração combinada do entregador:** `deliveryFee + storeDeliveryContribution`, gravada como snapshot no pedido. Ao juntar pedidos numa rota, os snapshots são somados.

Exemplo: cliente paga R$ 4,00, loja complementa R$ 4,00 e o entregador recebe R$ 8,00 como valor combinado. O pagamento continua fora do sistema: o dinheiro/PIX da venda chega diretamente à loja e ela paga a equipe de entrega. O Store OS registra o combinado, mas não desconta o complemento da venda nem transfere saldo ao motorista. A configuração é fixa por entrega, definida manualmente; não estima distância nem usa IA. Para delivery, o servidor exige que a loja tenha habilitado a modalidade e configurado a taxa cobrada do cliente; valor ausente não vira frete padrão.

O campo legado `serviceFeePercent` não entra no checkout. A comissão futura de 8% pertence exclusivamente à rede própria da plataforma, permanece em `coming_soon` e não é incluída nessa divisão da frota da loja.

### Referências consultadas

- A documentação oficial do iFood descreve que, na entrega própria, a loja define a taxa cobrada do cliente e que pode assumir o custo da taxa em promoções de entrega parceira: [Plano Entrega Flex](https://blog-parceiros.ifood.com.br/plano-entrega-flex/) e [configuração da loja no iFood](https://blog-parceiros.ifood.com.br/jornada-de-ativacao/).
- O adendo oficial do DoorDash Storefront separa taxa de entrega do comerciante e do cliente e permite ajustar a parcela cobrada do cliente: [Storefront Product Addendum](https://help.doordash.com/es-us/merchants/article/merchant-terms-of-service-us-english-storefront-product-addendum). Esse é um padrão de divisão consultado, não uma tarifa ou regra importada para o 3EATCRU.

## Limites para operação

Como não há adquirente conectada por loja, `feeDeducted` fica em zero e `netAmount` repete o valor bruto. Taxas bancárias reais, inclusive as cobradas pelo terminal externo da loja, não são conhecidas nem conciliadas. A confirmação externa é uma declaração do operador e não consulta banco, maquininha ou PSP. A emissão da imagem do QR Pix usa um serviço externo; a chave e o payload apontam para a loja.

Antes de produção, validar as chaves Pix das lojas, automatizar confirmação por webhook assinado se houver PSP, conectar uma adquirente por tenant para cartões, adicionar expiração/cancelamento da tentativa pendente, idempotência no PSP, estornos e conciliação. No app, repetir a mesma tentativa pendente reutiliza a transação e outro meio de pagamento fica bloqueado enquanto ela existir; a assinatura SaaS cobrada pelo HQ é um fluxo separado do checkout do consumidor.

## Validação

Nesta revisão, lint, 100/100 testes e build de produção passaram. Os testes usam mocks e não homologam recebimento PIX, adquirentes, webhooks, pagamento do complemento da loja ou conciliação financeira real.
