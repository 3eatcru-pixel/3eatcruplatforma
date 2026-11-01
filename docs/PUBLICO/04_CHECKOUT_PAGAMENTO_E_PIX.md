# Público — 04: Checkout e pagamentos

Atualizado em 2026-11-01 por leitura do cliente, API e roteador de pagamentos. Este documento descreve o fluxo encontrado; não declara integração financeira homologada.

## Fluxos disponíveis no código

O checkout da vitrine cria o pedido e chama POST /api/payments/process para PIX ou dinheiro. O servidor verifica pedido, tenant, valor e autorização antes de criar a transação em payment_transactions. Repetições do mesmo meio reutilizam a tentativa pendente.

- **PIX:** o lojista cadastra sua chave na tela Minha Loja; o checkout público só oferece PIX quando a chave está cadastrada. O servidor monta um BR Code para essa chave e registra a transação como pending_pix. O valor é destinado à conta da loja. A confirmação é manual e não verifica recebimento no banco ou PSP. Checkout real sem chave retorna `TENANT_PIX_KEY_NOT_CONFIGURED`; sandbox do PDV pode mostrar um endereço não roteável.
- **Confirmação:** POST /api/payments/:id/confirm permite confirmação autenticada por hq_admin, tenant_owner ou operator do mesmo tenant. A rota não consulta um provedor para verificar o recebimento do PIX.
- **Webhooks:** não foi localizado endpoint de webhook de adquirente em src/server/api.ts ou em src/server/routes/payments.router.ts.
- **Cartão:** transação real está bloqueada com `TENANT_CARD_ACCOUNT_NOT_CONFIGURED` quando há apenas uma chave global Stripe. O valor não deve ser cobrado na conta central do HQ. Cartão Mercado Pago continua não implementado; em sandbox, há somente simulação.
- **Dinheiro:** o checkout público registra pagamento pendente para recebimento na entrega/retirada; operador da loja registra a confirmação presencial. Vouchers permanecem restritos ao fluxo operacional disponível.
- **Liquidação por loja:** recebimento por cartão exige uma conta de adquirência conectada a cada tenant, ainda não integrada. PIX e dinheiro ficam sob responsabilidade da loja; o HQ não recebe nem repassa valores de pedidos.

O campo serviceFeePercent legado não entra no checkout. A entrega usa o valor fixo deliveryFee configurado pela loja. A comissão futura de 8% da rede própria da plataforma permanece em coming_soon e não é cobrada neste fluxo.

## Limites para operação

Como não há adquirente conectada por loja, `feeDeducted` fica em zero e `netAmount` repete o valor bruto. Taxas bancárias reais não são conhecidas nem conciliadas. A emissão da imagem do QR Pix usa um serviço externo; a chave e o payload apontam para a loja.

Antes de produção, validar as chaves Pix das lojas, automatizar confirmação por webhook assinado se houver PSP, conectar uma adquirente por tenant para cartões, adicionar expiração/cancelamento da tentativa pendente, idempotência no PSP, estornos e conciliação. No app, repetir a mesma tentativa pendente reutiliza a transação e outro meio de pagamento fica bloqueado enquanto ela existir; a assinatura SaaS cobrada pelo HQ é um fluxo separado do checkout do consumidor.

## Validação

Nesta revisão, build e testes não foram executados. Não declarar como aprovados os cenários descritos em arquivos de teste sem registrar a execução atual.
