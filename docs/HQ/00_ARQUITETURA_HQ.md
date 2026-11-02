# HQ Central — Arquitetura e Governança

## Escopo

O HQ Central (/hq) é a área administrativa da plataforma, reservada a usuários com papel `hq_admin` e pensada para desktop e tablet. A interface organiza as áreas em **Lojas e operação**, **Financeiro**, **Ecossistema** e **Governança**, com navegação lateral em desktop, faixa navegável em tablet e busca `Ctrl+K` para todas as áreas.

O HQ não é uma loja e não executa vendas de tenant. A autorização das rotas administrativas é aplicada no backend por requireHqAdmin.

## Módulos e limites atuais

| Módulo | Estado observado no código |
|---|---|
| Tenants | Consulta, provisionamento em trial, métricas históricas de pedidos, alteração administrativa de status/parâmetros e vínculo de conta existente e verificada como responsável. O provisionamento não cria a conta do proprietário. |
| Planos | Catálogo consultável e editável pelo HQ; `maxDevices` configura a cota inicial de novos tenants. Alterar o plano de um tenant existente não sincroniza sua cota nem inicia cobrança recorrente. |
| Visão geral | Conta pedidos reais elegíveis e soma o volume comercial geral. Seleciona os campos de métrica e processa os pedidos em fluxo, com memória limitada; ainda percorre o histórico completo. As métricas de comissão e entregadores da plataforma ficam indisponíveis enquanto o estado for `coming_soon`. Uptime é o tempo do processo Node, não disponibilidade percentual do serviço. |
| Comissão | A taxa de referência de 8% fica preparada, com estado padrão `coming_soon`. A configuração do HQ pode salvar ou restaurar esse estado; não há ação de ativação enquanto a rede e a inteligência não estiverem prontas. |
| Relatório de comissão | GET /api/hq/ledger, restrito a hq_admin, retorna `commissionStatus: coming_soon` e nenhuma linha. O cálculo futuro só será ativado com a rede própria e inteligência operacional prontas. |
| Dispositivos | Cadastro central de inventário; novos registros da loja respeitam a cota `devicesLimit`. A tela mostra somente registros de equipamentos; não consulta cadastros de motoristas ou rotas das lojas. Não foi localizado agente de hardware que reporte heartbeat ou receba comandos remotos. |
| Marketplace da plataforma | O HQ publica a configuração global em `/public_regional/default`: banner, avisos, praça, raio inicial de busca (1–30 km) e IDs de destaque. O raio é aplicado como valor inicial ao consumidor; depois de autorizar o GPS, ele pode ajustá-lo localmente. A análise geográfica do HQ usa somente lojas ativas com coordenadas cadastradas e não altera raio público nem área de entrega. O HQ não edita a vitrine `/p/:id`; cada loja gerencia seu conteúdo em Minha Loja. |
| Auditoria estrutural | Varredura sob demanda de tenants, produtos, pedidos e inventário de dispositivos. Não certifica todos os dados ou módulos do sistema. |
| Diretório de consumidores | GET /api/crm/consumers, restrito a hq_admin, retorna páginas de 50 registros com cursor. A projeção inclui somente nome, e-mail, telefone e atualização; endereço e CPF não são enviados. O cliente limpa páginas e cursor ao entrar no HQ ou trocar de ambiente, buscando novamente sob a sessão atual. GMV, frequência e auditoria individual não são calculados por esta tela. |
| Broadcast e manutenção | O HQ consegue carregar, publicar e remover o aviso global; o Store OS o lê no próximo sync público. A flag de manutenção mostra um bloqueio na interface do Store OS, sem bloquear APIs ou checkout. |
| Mensagens internas | As rotas de mensagens sociais exigem hq_admin e persistem registros internos; não há despacho para WhatsApp/SMS identificado. |

## Limites operacionais e de escala

- O inventário de dispositivos tem estados administrativos, não telemetria. A ação “reiniciar” só registra uma solicitação e “bloquear” só altera o status persistido.
- O overview e as métricas por loja percorrem o histórico completo em fluxo e selecionam somente os campos usados no cálculo. Isso limita a memória usada pelo servidor, mas não reduz a quantidade de documentos lidos nem o tempo total; não há janela de datas. Agregados materializados ainda exigem backfill consistente antes de substituir essa fonte.
- O diretório de consumidores usa cursor estável por ID e páginas de 50 registros. Não é uma tela de análise de coortes ou vendas.

## Segurança e dados

- As rotas privadas do HQ usam requireHqAdmin.
- O modo de execução é derivado de uma única fonte de verdade; atalhos de simulação e logout não deixam o indicador e os serviços em modos diferentes. Toda troca invalida consultas antigas e limpa o estado do HQ, marketplace, diretório de consumidores e tenants antes da nova carga. O cabeçalho global recarrega a área ativa ao voltar para real. O indicador representa o caminho selecionado, não uma prova de disponibilidade: cada módulo confirma a conexão nas próprias chamadas. No HQ, a simulação preserva `hq_admin`; ao voltar para real, a sessão Firebase é validada novamente. Uma conta sem papel `hq_admin` retorna ao login do HQ.
- A simulação só usa estado local nos fluxos que implementam esse caminho; ela não substitui integrações reais ausentes, não controla hardware e não é teste de carga. No modo real, persistência e disponibilidade dependem do endpoint/serviço específico. A emissão fiscal NF-e/NFC-e não foi localizada; o indicador de modo não representa essa capacidade.
- A tela de inventário do HQ não carrega motoristas, endereços de entrega nem rotas privadas das lojas. Os fluxos logísticos ficam no Store OS do tenant.
- As rotas de logística não autorizam `hq_admin` a ler ou operar a frota privada da loja. A futura frota `marketplace` fica indisponível enquanto `PLATFORM_DELIVERY_NETWORK_READY` for falso; a listagem de motoristas/rotas retorna `409 PLATFORM_DELIVERY_NETWORK_UNAVAILABLE` nesse estado.
- GET /api/hq/public-status é público e retorna apenas maintenanceMode e globalBroadcastMessage para sincronização dos terminais.
- /hq_settings/global e /plans são gravados pelo backend.
- /devices contém registros de inventário; seus status não devem ser interpretados como telemetria validada.
- /audit_logs recebe registros de operações administrativas. A persistência de alguns logs é best effort.
- O diretório de consumidores expõe dados pessoais apenas a hq_admin pelo endpoint do servidor; não é um CRM com métricas de vendas calculadas.

## Matriz de maturidade

| Capacidade | Situação |
|---|---|
| Proteção de rotas administrativas | Implementada no middleware do servidor |
| Provisionamento e vínculo de tenant | Provisionamento em trial implementado; vínculo do proprietário requer uma conta existente com e-mail verificado |
| Status da comissão futura da plataforma | `coming_soon` por padrão; HQ pode manter/desativar, ativação antecipada não está disponível |
| Comissão por entrega, histórico e payout da plataforma | Desativados; processo futuro ainda não implementado |
| Inventário e verificação de serial/tenant | Implementados |
| MDM físico, heartbeat e execução de comandos | Não localizado |
| Varredura estrutural sob demanda | Implementada no escopo descrito em Operações e Auditoria |
| Telemetria de infraestrutura, certificados e armazenamento | Não localizada |
| Cobrança recorrente de assinatura SaaS | Implementada no `billing.router.ts` com Mercado Pago/Stripe; credenciais, webhooks live e homologação externa pendentes |

## Validação

Este mapa foi elaborado por inspeção de código e documentação. No ciclo de 2026-11-01, `npm run test:ci` passou com 100/100 testes e `npm run build` compilou para produção; os testes usam mocks e não comprovam homologação do HQ contra um Firestore real.

Na continuação de 2026-11-02, `npm run check` passou com lint, 100/100 testes e build de produção. A leitura em fluxo compila e a suíte existente passa, mas não há homologação contra Firestore real nesta revisão.
