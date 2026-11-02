# HQ Central — Planos, Licenças e Assinaturas

## Catálogo

GET /api/hq/plans sempre retorna os três planos conhecidos. Todos dão acesso ao Store OS completo; a diferença comercial entre eles é a cota de dispositivos. O servidor lê do Firestore apenas `priceMonthly` e `maxDevices` quando cada valor é válido; nome, descrição e acesso completo vêm do catálogo compartilhado no código. Campos legados como `includedModules` são ignorados, então não restringem acesso. O header `X-HQ-Plan-Catalog-Source` informa `firestore`, `mixed` ou `defaults` conforme a cobertura de valores válidos salvos. Falhas de leitura do Firestore retornam erro HTTP; a interface não exibe o catálogo como se tivesse carregado.

O HQ pode alterar mensalidade e cota cadastradas pelo endpoint `PATCH /api/hq/plans/:id`. O preço salvo é lido no servidor quando o HQ gera um checkout; alterar o catálogo não altera automaticamente assinaturas já ativas. O valor `maxDevices` do catálogo é usado como cota inicial para novos tenants no plano escolhido (o cadastro público usa Starter); tenants existentes não são atualizados automaticamente e podem receber ajuste individual pela ficha de governança.

O lojista paga ao HQ uma assinatura mensal para usar o Store OS completo em qualquer plano. A cota de dispositivos define a diferença entre os planos. O HQ gera checkout hospedado por Mercado Pago ou Stripe para o e-mail de cobrança da loja. A confirmação e as renovações são registradas por webhooks assinados do provedor; o cliente não pode informar valor nem marcar uma fatura como paga. A integração só fica pronta para uso real quando as credenciais API e os segredos de webhook do provedor escolhido forem configurados no servidor.

Lojas que usarem entregadores da rede própria da plataforma pagarão comissão de 8% sobre as entregas elegíveis, além da assinatura SaaS. A cobrança da comissão é um fluxo separado e continua em `coming_soon` até a rede e a inteligência operacional estarem prontas; não se aplica aos motoristas da loja.

## Tenants e cota de dispositivos

O provisionamento pelo HQ grava o plano selecionado e a cota `maxDevices` atual daquele plano. Se não houver documento de plano ou valor salvo, usa os padrões Starter: 2, Professional: 5, Enterprise: 20. A governança do tenant permite que hq_admin atualize plano e cota independentemente; trocar o plano de um tenant não sincroniza o limite existente.

O endpoint de registro de dispositivos valida a cota `devicesLimit` do tenant e recusa novos registros com `409 DEVICE_QUOTA_REACHED` quando o inventário atinge o limite. A contagem cobre registros de `/devices`, não hardware fisicamente conectado. A auditoria estrutural também compara a quantidade no inventário com `devicesLimit` e reporta excesso caso a cota seja reduzida abaixo do total já cadastrado.

## Trial e suspensão

Novos tenants dos fluxos de cadastro começam em trial e fechados. A ativação ou suspensão é uma alteração administrativa manual. Não foi localizada automação que suspenda tenants a partir de inadimplência de assinatura SaaS.

## Maturidade

| Recurso | Estado |
|---|---|
| Catálogo editável pelo HQ | Implementado |
| Cota salva por tenant | Implementada e alterável pela governança |
| Bloqueio de novos registros ao atingir cota | Implementado por transação no cadastro de dispositivo |
| Contagem de dispositivos físicos ativos | Não disponível sem agente/telemetria |
| Acesso ao Store OS nos planos Starter, Professional e Enterprise | Incluído em todos os planos; o plano define preço e cota de dispositivos |
| Assinatura SaaS do lojista para o HQ | Checkout recorrente Mercado Pago/Stripe, painel HQ, registro de faturas e confirmação por webhook implementados; credenciais e homologação live pendentes |
| Suspensão automática por inadimplência | Não implementada; status de cobrança é registrado, mas o estado operacional do tenant não muda automaticamente |
| Acesso à rede da plataforma para lojas sem frota própria | Coming soon até ativação da rede e inteligência operacional; comissão futura de 8% separada do plano |
| Auditoria de excesso de registros do inventário | Implementada na varredura sob demanda |

O checkout e os webhooks estão implementados no código, mas não foram homologados com contas live nem com credenciais de provedor neste checkout. A ativação exige variáveis secretas no servidor e configuração do endpoint de webhook no painel de cada provedor. O sistema registra inadimplência, mas não suspende o tenant automaticamente.
