# Auditoria do núcleo 3EATCRU — snapshot atual

Atualizado em 2026-11-01. Este arquivo resume achados; não é um certificado de produção. Nesta revisão, `npm run lint` passou, `npm run test:ci` passou com 90/90 testes e o build de produção passou com bundle inicial de 600,66 kB (126,50 kB estimados em transferência). Os testes usam mocks; implantação e homologação real continuam pendentes.

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
- O Store OS tem PDV em rota standalone, KDS integrado para avanço do preparo, Estoque para consulta/cadastro e Financeiro para consulta somente leitura; a maioria dos IDs de eApp ainda abre placeholder.
- O eApp Financeiro limita a consulta à unidade ativa e resume entradas/saídas liquidadas; não oferece DRE, conciliação nem criação de lançamentos.
- O eApp Estoque está conectado ao `InventoryService` para listar e cadastrar produtos; movimentos e ajustes auditáveis de saldo ainda não existem.
- As interfaces /waiter e /driver são rotas web. Não há comprovação de pacote Android nativo neste repositório.

## Bloqueios de consolidação

1. Homologar recebimento direto por loja: validação da chave Pix e confirmação verificável; conectar PSP de cartão por tenant; adicionar idempotência e conciliação.
2. Concluir configuração e runbook de implantação para desenvolvimento, homologação e produção.
3. Definir escopo de lançamento para os módulos integrados e os placeholders.
4. Integrar ou retirar da interface os serviços de RH e ordens de serviço sem rotas no servidor.
5. Consolidar os eApps de mesas e os movimentos de estoque; KDS já avança o preparo, Estoque permite consulta/cadastro e Financeiro já consulta lançamentos, mas estoque precisa de movimentos auditáveis antes de permitir ajuste de saldo.

Para o mapa detalhado, consulte [MODULE_STATUS.md](./MODULE_STATUS.md), [segurança e maturidade](./docs/05_SEGURANCA_TESTES_MATURIDADE.md) e [o índice canônico](./docs/INDEX.md).
