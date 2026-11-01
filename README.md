# 3EATCRU — Plataforma comercial multiempresa

Este repositório contém a implementação web do ecossistema 3EATCRU. O estado dos módulos e seus limites estão no [mapa de maturidade](./MODULE_STATUS.md).

> **Estado em 2026-11-01:** auditoria documental e correções em andamento. Build, testes e homologação operacional não foram executados nesta revisão.

## Arquitetura implementada

- Frontend Angular 21 com SSR.
- API Express 5 integrada ao servidor SSR.
- Firebase Authentication, Firebase Admin SDK e Cloud Firestore.
- Modelos compartilhados em src/shared.

A stack descrita acima é a que está implementada neste checkout. O repositório não está estruturado como Next.js/React.

## Ambientes e rotas

- **HQ Central:** /hq. Governança de lojas, responsáveis, catálogo de planos e configurações da plataforma.
- **Store OS Lojista:** /os. Desktop da unidade; o PDV operacional está na rota protegida /pos. A maioria dos atalhos do desktop ainda mostra interface não integrada.
- **Público e Marketplace:** /home e /p/:id. Descoberta regional, vitrine e jornada de pedidos.
- **Rotas web auxiliares:** /waiter e /driver. São interfaces web; este repositório não comprova APK, PWA instalado ou rastreamento nativo em segundo plano.

A lista completa e o estado por módulo estão em [Aplicativos e módulos](./docs/OS/03_APLICATIVOS_E_MODULOS.md).

## Regras do modelo de negócio

- A loja administra sua frota própria e decide quanto paga aos seus motoristas.
- A assinatura contratada no HQ dá acesso ao Store OS e à cota de dispositivos do plano; a oferta deverá atender também lojas sem frota própria com entregadores da plataforma quando estiver pronta. O catálogo e o bloqueio de novas ativações por cota existem, mas cobrança recorrente e regras/preços do acesso à frota ainda não estão integrados.
- Os pagamentos de pedidos do marketplace pertencem à loja e devem cair na conta de pagamento dela. O PIX usa a chave cadastrada no tenant e a confirmação é manual; cartão real está bloqueado até conectar uma conta de adquirência por loja. Não há recebimento central pelo HQ.
- A comissão de referência de 8% permanece em coming_soon e se aplica somente ao futuro processo de entregas executadas pela rede própria da plataforma. É separada da assinatura e dos pagamentos de pedidos, e não incide sobre entregas feitas pelos motoristas da loja.

## Documentação

O índice canônico é [docs/INDEX.md](./docs/INDEX.md). O arquivo [docs/00_INDICE_DOCUMENTACAO.md](./docs/00_INDICE_DOCUMENTACAO.md) foi mantido como atalho para o índice principal.

- [Arquitetura geral](./docs/00_ARQUITETURA_GERAL.md)
- [HQ Central](./docs/HQ/00_ARQUITETURA_HQ.md)
- [Store OS e mapa de módulos](./docs/OS/03_APLICATIVOS_E_MODULOS.md)
- [Contrato HQ e Store OS](./docs/INTEGRACAO/00_CONTRATO_HQ_OS.md)
- [Segurança, testes e maturidade](./docs/05_SEGURANCA_TESTES_MATURIDADE.md)
- [Auditoria de mapeamento](./docs/AUDITORIA_MAPEAMENTO_TRABALHO.md)

## Comandos disponíveis

- npm start: servidor de desenvolvimento na porta 3000.
- npm run lint: lint configurado no projeto.
- npm run test:ci: testes configurados para execução sem watch.
- npm run build: build Angular com configuração de produção.

A existência de scripts ou arquivos de teste não representa aprovação atual. Consulte o status da última execução antes de considerar uma entrega homologada.
