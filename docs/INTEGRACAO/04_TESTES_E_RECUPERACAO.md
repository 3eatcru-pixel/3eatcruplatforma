# Integração — 04: Testes e recuperação

Atualizado em 2026-11-01. O bootstrap foi validado em uma cópia temporária sem `node_modules`: `npm run prestart` executou `npm ci`, instalou e verificou as 905 dependências do lockfile em cerca de 7 minutos. O checkout principal não foi removido nem reinstalado durante essa simulação. `npm start -- --port 3001` executou o hook `prestart`, compilou o servidor e iniciou a aplicação; `GET /home` respondeu HTTP 200. Os scripts `prestart` e `predev` validam as dependências antes de iniciar o servidor. Nesta revisão, `npm run lint`, `npm run test:ci` e o build de produção passaram. O build mede 604,53 kB brutos iniciais (129,08 kB estimados em transferência), sem aviso de limite. A suíte passou com 94/94 testes, incluindo os novos controles de mesas/reservas, CRM, RH/notas, ordens de serviço, fornecedores e contagens de estoque. O Estoque consulta/cadastra produtos e grava contagens divergentes sem ajustar saldo; RH registra equipe/ponto manual sem folha; O.S. registra andamento sem pagamento; tarefas e fornecedores persistem por unidade; notas são privadas do usuário. KDS, Financeiro, pagamentos e logística mantêm os limites descritos no mapa. Os testes usam mocks; Firebase real, PSP, carga, restauração e operação física ainda não foram homologados. Avisos CommonJS de Leaflet e gRPC continuam no build.

## Comandos disponíveis

O package.json define:

- Node.js suportado: 24.12+. Além do Firebase Admin SDK e do Angular CLI, as versões do Firebase Client SDK travadas no lockfile exigem Node 24.12+ no ambiente de desenvolvimento/SSR.
- `npm start` e `npm run dev` validam o lockfile e todos os pacotes obrigatórios (diretos e transitivos), comparando versões instaladas e entradas do lock de npm. Se `node_modules` estiver ausente ou incompleto/desatualizado, executam `npm ci --include=dev --prefer-offline --no-audit --no-fund` antes do `ng serve`, inclusive quando `NODE_ENV=production`. Com dependências consistentes, o guard não reinstala os pacotes.
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
