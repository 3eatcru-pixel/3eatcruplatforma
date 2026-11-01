# Integração — 04: Testes e recuperação

Atualizado em 2026-11-01. Nesta auditoria, `npm start` foi executado com `node_modules` ausente: o guard instalou as 905 dependências do lockfile e o servidor iniciou. `GET /home` respondeu HTTP 200 em menos de 7 s sem credenciais ADC locais, confirmando que o SSR inicial não espera o Firebase Admin. Após as mudanças de carregamento do SDK e integração dos eApps Estoque/KDS, a mesma rota voltou a responder HTTP 200. `npm run lint` passou; `npm run build -- --stats-json` passou com bundle inicial de 600,66 kB brutos (126,50 kB estimados em transferência), sem aviso de limite do bundle inicial. O Firebase Auth é carregado depois da primeira renderização; o Firestore só é carregado quando uma tela solicita uma assinatura em tempo real. Não há consulta automática de conectividade ao abrir o app. `npm run test:ci` passou com 90/90 testes. O Estoque permite consulta/cadastro sem ajuste de saldo; o KDS carrega a unidade ativa e permite avançar pedidos até `ready` conforme o papel; o Financeiro consulta lançamentos da unidade e exclui pendências dos totais liquidados, sem produzir DRE ou conciliar adquirentes. Os cenários de teste anteriores foram alinhados ao modo real/offline, aos papéis do garçom e do entregador, e à exigência de pagamento confirmado para liquidação; as verificações de autorização e pagamento no servidor foram mantidas. Avisos CommonJS de Leaflet e gRPC continuam no build. Recuperação de backup, carga, integração ao vivo do Firestore e homologação não foram executadas.

## Comandos disponíveis

O package.json define:

- Node.js suportado: 24.12+. Além do Firebase Admin SDK e do Angular CLI, as versões do Firebase Client SDK travadas no lockfile exigem Node 24.12+ no ambiente de desenvolvimento/SSR.
- `npm start` e `npm run dev` validam o lockfile e as dependências diretas. Se `node_modules` estiver ausente ou incompleto/desatualizado, executam `npm ci --include=dev --prefer-offline --no-audit --no-fund` antes do `ng serve`, inclusive quando `NODE_ENV=production`. Com dependências consistentes, o guard não reinstala os pacotes.
- Para lint, testes ou build executados isoladamente, use `npm ci` antes da primeira execução no checkout; o guard é ligado ao fluxo de inicialização web.
- As rotas Express que usam Firebase Admin precisam de Application Default Credentials para acessar dados reais. No Cloud Run, use a identidade de serviço do ambiente; localmente, use `gcloud auth application-default login` ou configure `GOOGLE_APPLICATION_CREDENTIALS` para um arquivo de credenciais mantido fora do repositório. Nunca versione chaves. Consulte a [documentação oficial do Firebase Admin SDK](https://firebase.google.com/docs/admin/setup).
- A sincronização do marketplace é iniciada após a primeira renderização no navegador para o SSR não aguardar credenciais/Firestore. Sem ADC, a tela inicial ainda renderiza, mas os dados reais das APIs administrativas não estarão disponíveis.
- npm run test:ci para executar testes sem watch.
- npm run lint para lint.
- npm run check para lint seguido de testes.
- npm run build para build Angular com configuração de produção.

O servidor npm start usa a configuração development do ng serve. Registre o comando exato, data, ambiente e resultado de cada build.

## Inventário estático

Há specs no cliente Angular e no servidor Express, incluindo cenários de segurança, pedidos, pagamentos, rotas, offline, serviços do HQ e do Store OS. A presença dos arquivos não comprova aprovação; os resultados da execução desta revisão estão registrados acima.

## Recuperação e confiabilidade pendentes de validação

Antes do lançamento, documentar e ensaiar:

1. Backup e restauração do Firestore, com responsáveis e metas de recuperação.
2. Recuperação de configuração, segredos e identidade do ambiente.
3. Reprocessamento idempotente de pedidos offline e conflitos de estoque.
4. Confirmação e conciliação de pagamentos com cada adquirente.
5. Comportamento sob múltiplas instâncias do servidor e limites de requisições compartilhados.
6. Procedimentos para incidente, indisponibilidade e retorno à operação.

Não declarar teste de carga, webhook de adquirente ou restauração de backup sem evidência de execução.
