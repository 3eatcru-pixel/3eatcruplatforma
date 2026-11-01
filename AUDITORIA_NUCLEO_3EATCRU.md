# Auditoria do núcleo 3EATCRU — snapshot atual

Atualizado em 2026-11-01 por leitura estática. Este arquivo resume achados; não é um certificado de produção. Build, testes, implantação e homologação não foram executados nesta revisão.

## Arquitetura encontrada

- Frontend Angular 21 com SSR.
- API Express 5 montada sob /api.
- Firebase Authentication, Firebase Admin SDK e Cloud Firestore.
- Contratos compartilhados em src/shared.
- Rotas de negócio verificam autenticação, papel e escopo conforme cada domínio.

As regras Firestore restringem o acesso pelo Client SDK. Rotas que usam Admin SDK precisam aplicar as próprias verificações no servidor.

## Modelo operacional confirmado

- A loja administra e remunera seus próprios motoristas.
- A cobrança recorrente dos planos SaaS não está integrada.
- A comissão de referência de 8% da plataforma permanece em coming_soon e é exclusiva do futuro processo da rede própria da plataforma.
- O Store OS tem um PDV em rota standalone; a maioria dos IDs de eApp ainda abre placeholder.
- As interfaces /waiter e /driver são rotas web. Não há comprovação de pacote Android nativo neste repositório.

## Bloqueios de consolidação

1. Homologar recebimento direto por loja: validação da chave Pix e confirmação verificável; conectar PSP de cartão por tenant; adicionar idempotência e conciliação.
2. Concluir configuração e runbook de implantação para desenvolvimento, homologação e produção.
3. Definir escopo de lançamento para os módulos integrados e os placeholders.
4. Integrar ou retirar da interface os serviços de RH e ordens de serviço sem rotas no servidor.
5. Executar lint, testes e build de produção e registrar resultados datados.

Para o mapa detalhado, consulte [MODULE_STATUS.md](./MODULE_STATUS.md), [segurança e maturidade](./docs/05_SEGURANCA_TESTES_MATURIDADE.md) e [o índice canônico](./docs/INDEX.md).
