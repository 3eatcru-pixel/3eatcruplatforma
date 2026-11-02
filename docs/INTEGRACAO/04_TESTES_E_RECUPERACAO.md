# Integração — 04: Testes e recuperação

Validação local em 2026-11-01: `npm run lint` passou; `npm run test:ci` passou com 96/96 testes em 10 arquivos; `npm run build` passou com bundle inicial de 604,53 kB brutos (129,08 kB estimados em transferência), com avisos CommonJS de Leaflet e gRPC; `npm ci --dry-run --include=dev --no-audit --no-fund` passou. Em cópia temporária limpa, `npm ci --include=dev --no-audit --no-fund` instalou 933 pacotes em 6 minutos e o build de produção passou. No checkout Windows aberto, o `npm ci` falhou ao remover binários nativos em uso (`EPERM`); `npm install --include=dev --no-audit --no-fund` concluiu com avisos de limpeza para esses binários bloqueados. Depois disso, o lint, os testes e o build também passaram no checkout. `node server/server.mjs` em `PORT=3102` iniciou e `GET /api/health` respondeu HTTP 200 com `environment: development`. Isso não comprova Cloud Run, Firebase real, Cloud SQL, PSP, carga, restauração ou operação física.

## Comandos disponíveis

O package.json define:

- Use uma versão de Node compatível com as engines dos pacotes no `package-lock.json`; o projeto não declara uma engine própria no `package.json`.
- `npm start` e `npm run dev` executam `ng serve --host 0.0.0.0 --port 3000`; não validam nem instalam dependências.
- Em clone/restauração sem `node_modules`, execute `npm ci` manualmente antes de iniciar, testar, rodar lint ou compilar.
- `node server/server.mjs` é o entrypoint de produção presente no repositório. Ele compila o SSR se necessário, mas não instala dependências ausentes.
- As rotas Express que usam Firebase Admin precisam de Application Default Credentials para acessar dados reais. No Cloud Run, use a identidade de serviço do ambiente; localmente, use `gcloud auth application-default login` ou configure `GOOGLE_APPLICATION_CREDENTIALS` para um arquivo de credenciais mantido fora do repositório. Nunca versione chaves. Consulte a [documentação oficial do Firebase Admin SDK](https://firebase.google.com/docs/admin/setup).
- A sincronização do marketplace é iniciada após a primeira renderização no navegador para o SSR não aguardar credenciais/Firestore. Sem ADC, a tela inicial ainda renderiza, mas os dados reais das APIs administrativas não estarão disponíveis.
- npm run test:ci para executar testes sem watch.
- npm run lint para lint.
- npm run check para lint seguido de testes.
- npm run build para build Angular com configuração de produção.

O comando `npm start` usa a configuração development do `ng serve`. Registre o comando exato, data, ambiente e resultado de cada build.

## Inventário estático

Há specs no cliente Angular e no servidor Express, incluindo cenários de segurança, pedidos, pagamentos, rotas, offline, serviços do HQ e do Store OS. A presença dos arquivos não comprova aprovação; os resultados da execução desta revisão estão registrados acima.

## Wrapper do container `/app`

O `package.json` versionado por este checkout pertence ao app Angular/Express. Ele não representa o wrapper externo `/app/package.json` observado no ambiente que contém `/app/applet`, `/app/cloudsql` e `/app/control-plane-api`. O wrapper informado pelo usuário é:

```json
{
  "name": "3eatcru-root",
  "private": true,
  "scripts": {
    "build": "cd /app/applet && bun run build"
  }
}
```

Criá-lo com um comando de terminal dentro do container não o torna persistente após restauração. Ele precisa estar no filesystem/imagem persistente do ambiente ou ser criado por um entrypoint executado antes do `control-plane-api`. Este checkout não contém esse binário, Dockerfile, entrypoint ou configuração de lançamento; portanto, não pode instalar esse arquivo no caminho `/app` por conta própria. A correção ainda exige ligar o conteúdo acima ao mecanismo persistente do ambiente externo.

A documentação oficial do Google descreve edição no Code tab, sincronização bidirecional com GitHub e deploy pelo Cloud Run, mas não especifica a persistência de um arquivo no diretório pai `/app` fora da pasta do projeto. A camada que controla esse caminho permanece por identificar. Consulte [Build apps in Google AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-build-mode).

## Recuperação e confiabilidade pendentes de validação

Antes do lançamento, documentar e ensaiar:

1. Backup e restauração do Firestore, com responsáveis e metas de recuperação.
2. Recuperação de configuração, segredos e identidade do ambiente.
3. Reprocessamento idempotente de pedidos offline e conflitos de estoque.
4. Confirmação e conciliação de pagamentos com cada adquirente.
5. Comportamento sob múltiplas instâncias do servidor e limites de requisições compartilhados.
6. Procedimentos para incidente, indisponibilidade e retorno à operação.

Não declarar teste de carga, webhook de adquirente ou restauração de backup sem evidência de execução.
