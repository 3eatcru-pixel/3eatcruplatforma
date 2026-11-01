# HQ Central — Planos, Licenças e Assinaturas

## Catálogo

GET /api/hq/plans sempre retorna os três planos conhecidos. Para cada plano, mescla o documento salvo na coleção /plans aos valores de referência integrados ao servidor. O header X-HQ-Plan-Catalog-Source informa firestore, mixed ou defaults conforme a cobertura dos documentos. Falhas de leitura do Firestore retornam erro HTTP; a interface não exibe o catálogo como se tivesse carregado.

O HQ pode alterar mensalidade e cota cadastradas pelo endpoint PATCH /api/hq/plans/:id. Isso não cria cobrança recorrente. O valor `maxDevices` do catálogo é usado como cota inicial para novos tenants no plano escolhido (o cadastro público usa Starter); tenants existentes não são atualizados automaticamente e podem receber ajuste individual pela ficha de governança.

O lojista contrata no HQ a assinatura para usar o Store OS e a cota de dispositivos do plano. O catálogo e os limites existem no código, mas ainda não foi localizada uma integração que cobre automaticamente a mensalidade.

No modelo comercial acordado, a oferta deverá atender também lojas sem frota própria com entregadores da plataforma quando a rede e a inteligência operacional estiverem prontas. Se esse acesso ficará incluído no plano ou terá uma regra adicional, assim como preço e cobrança, ainda não está implementado. A comissão futura de 8% por entrega da rede da plataforma é um fluxo separado e não se aplica aos motoristas da loja.

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
| Assinatura SaaS do lojista para o HQ | Modelo comercial definido; cobrança recorrente não integrada |
| Acesso à rede da plataforma para lojas sem frota própria | Coming soon; inclusão no plano/regra adicional, preço e operação ainda não definidos |
| Auditoria de excesso de registros do inventário | Implementada na varredura sob demanda |

Testes não foram executados durante esta auditoria.
