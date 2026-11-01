# HQ Central — Arquitetura e Governança

## Escopo

O HQ Central (/hq) é a área administrativa da plataforma. É reservado a usuários com papel hq_admin e concentra governança de tenants, planos, catálogo de módulos, avisos globais, configuração regional, inventário de dispositivos e relatórios agregados.

O HQ não é uma loja e não executa vendas de tenant. A autorização das rotas administrativas é aplicada no backend por requireHqAdmin.

## Módulos e limites atuais

| Módulo | Estado observado no código |
|---|---|
| Tenants | Consulta, provisionamento em trial, métricas históricas de pedidos, alteração administrativa de status/parâmetros e vínculo de conta existente e verificada como responsável. O provisionamento não cria a conta do proprietário. |
| Planos | Catálogo consultável e editável pelo HQ; `maxDevices` configura a cota inicial de novos tenants. Alterar o plano de um tenant existente não sincroniza sua cota nem inicia cobrança recorrente. |
| Visão geral | Conta pedidos reais elegíveis e soma o volume comercial geral. As métricas de comissão e entregadores da plataforma ficam indisponíveis enquanto o estado for `coming_soon`. Uptime é o tempo do processo Node, não disponibilidade percentual do serviço. |
| Comissão | A taxa de referência de 8% fica preparada, com estado padrão `coming_soon`. A configuração do HQ pode salvar ou restaurar esse estado; não há ação de ativação enquanto a rede e a inteligência não estiverem prontas. |
| Relatório de comissão | GET /api/hq/ledger, restrito a hq_admin, retorna `commissionStatus: coming_soon` e nenhuma linha. O cálculo futuro só será ativado com a rede própria e inteligência operacional prontas. |
| Dispositivos | Cadastro central de inventário; novos registros da loja respeitam a cota `devicesLimit`. Não foi localizado agente de hardware que reporte heartbeat ou receba comandos remotos. |
| Auditoria estrutural | Varredura sob demanda de tenants, produtos, pedidos e inventário de dispositivos. Não certifica todos os dados ou módulos do sistema. |
| Diretório de consumidores | GET /api/crm/consumers, restrito a hq_admin, retorna até 100 perfis sem paginação. GMV, frequência e auditoria individual não são calculados por esta tela. |
| Broadcast e manutenção | Configurações persistidas pelo HQ; o Store OS as lê no próximo sync público. A manutenção mostra um bloqueio na interface do Store OS, sem bloquear APIs ou checkout. |
| Mensagens internas | As rotas de mensagens sociais exigem hq_admin e persistem registros internos; não há despacho para WhatsApp/SMS identificado. |

## Segurança e dados

- As rotas privadas do HQ usam requireHqAdmin.
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
| Cobrança recorrente de assinatura SaaS | Não localizada nesta auditoria |

## Validação

A auditoria atual foi feita por inspeção do código e da documentação. Testes automatizados e build não foram executados neste ciclo; portanto, este documento não afirma aprovação empírica de testes.
