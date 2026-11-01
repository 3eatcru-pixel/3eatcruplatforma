# HQ Central — Planos, Licenças e Assinaturas

## Catálogo

GET /api/hq/plans sempre retorna os três planos conhecidos. Para cada plano, mescla o documento salvo na coleção /plans aos valores de referência integrados ao servidor. O header X-HQ-Plan-Catalog-Source informa firestore, mixed ou defaults conforme a cobertura dos documentos. Falhas de leitura do Firestore retornam erro HTTP; a interface não exibe o catálogo como se tivesse carregado.

O HQ pode alterar mensalidade e cota cadastradas pelo endpoint PATCH /api/hq/plans/:id. Isso não cria cobrança recorrente nem aplica automaticamente a cota.

O catálogo de planos não equivale a um sistema de faturamento recorrente. Não foi localizada nesta auditoria uma integração de assinatura SaaS que cobre automaticamente a mensalidade.

No modelo comercial, o lojista paga o plano para usar o Store OS e os módulos incluídos. A comissão de 8% das entregas da plataforma é uma receita futura e independente; não substitui a mensalidade nem se aplica aos motoristas da loja.

## Tenants e cota de dispositivos

O provisionamento pelo HQ grava o plano selecionado e uma cota inicial (Starter: 2, Professional: 5, Enterprise: 20). A governança do tenant permite que hq_admin atualize plano e cota.

O endpoint de registro de dispositivos cria um registro de inventário, mas não consulta nem aplica a cota do tenant. A auditoria estrutural compara a quantidade de registros encontrados no inventário com devicesLimit e reporta excesso. Isso não representa limite de hardware conectado nem impede novos registros.

## Trial e suspensão

Novos tenants dos fluxos de cadastro começam em trial e fechados. A ativação ou suspensão é uma alteração administrativa manual. Não foi localizada automação que suspenda tenants a partir de inadimplência de assinatura SaaS.

## Maturidade

| Recurso | Estado |
|---|---|
| Catálogo editável pelo HQ | Implementado |
| Cota salva por tenant | Implementada como dado de governança |
| Bloqueio de novos registros ao atingir cota | Não implementado |
| Contagem de dispositivos físicos ativos | Não disponível sem agente/telemetria |
| Cobrança recorrente da assinatura SaaS | Não localizada |
| Auditoria de excesso de registros do inventário | Implementada na varredura sob demanda |

Testes não foram executados durante esta auditoria.
