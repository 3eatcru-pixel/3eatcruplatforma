# Integração — 04: Testes e recuperação

Atualizado em 2026-11-01 por leitura estática. Resultados antigos, contagens registradas e nomes de arquivos de teste não representam aprovação atual. Nesta revisão, testes, build, recuperação e homologação não foram executados.

## Comandos disponíveis

O package.json define:

- npm run test:ci para executar testes sem watch.
- npm run lint para lint.
- npm run check para lint seguido de testes.
- npm run build para build Angular com configuração de produção.

O servidor npm start continua usando a configuração development do ng serve. Registre o comando exato, data, ambiente e resultado de cada build.

## Inventário estático

Há specs no cliente Angular e no servidor Express, incluindo cenários de segurança, pedidos, pagamentos, rotas, offline, serviços do HQ e do Store OS. A presença dos arquivos não comprova aprovação. Não há nesta página uma contagem de casos aprovados porque a suíte não foi executada nesta revisão.

## Recuperação e confiabilidade pendentes de validação

Antes do lançamento, documentar e ensaiar:

1. Backup e restauração do Firestore, com responsáveis e metas de recuperação.
2. Recuperação de configuração, segredos e identidade do ambiente.
3. Reprocessamento idempotente de pedidos offline e conflitos de estoque.
4. Confirmação e conciliação de pagamentos com cada adquirente.
5. Comportamento sob múltiplas instâncias do servidor e limites de requisições compartilhados.
6. Procedimentos para incidente, indisponibilidade e retorno à operação.

Não declarar teste de carga, webhook de adquirente ou restauração de backup sem evidência de execução.
