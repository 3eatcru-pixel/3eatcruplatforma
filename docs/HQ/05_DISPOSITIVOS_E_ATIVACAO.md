# HQ Central — Inventário de Dispositivos

## Escopo atual

A tela de dispositivos mantém registros associados a tenants. O cadastro não confirma pareamento com hardware. Não foi localizado agente de dispositivo para enviar heartbeat, telemetria ou receber comandos remotos.

A coleção /devices pode conter cadastros legados com status e campos de telemetria. Sem agente que os atualize, esses valores não comprovam o estado atual do equipamento. A interface identifica estados como online como status cadastrado e não como conexão verificada.

## Endpoints

- GET /api/hq/devices lista registros e permite filtro por tenant.
- POST /api/hq/devices exige tenant, nome e serial; verifica a existência do tenant e a duplicidade exata do serial. Cria o registro com status unverified e sem inventar MAC, IP, versão ou bateria.
- POST /api/hq/devices/:id/lock altera o status salvo no registro. Não envia bloqueio ao hardware.
- POST /api/hq/devices/:id/restart registra uma solicitação em audit_logs e não reinicia o equipamento.
- A tela de motoristas mostra campos armazenados. O HQ não consulta GPS em tempo real; localização e bateria são campos informados pelo app. Novos cadastros não recebem horário de GPS nem aprovação documental automática.

Motoristas cadastrados pelas lojas são do tipo `private`. O lojista administra a operação e decide quanto pagar; o App do Entregador facilita o uso de rotas e a baixa das entregas, mas não processa pagamento. O tipo `platform` com `tenantId: marketplace` fica reservado para a futura frota da plataforma, cuja comissão está em breve. Gestores de loja não podem marcar seus motoristas como parte dessa rede.

## Limites

- O endpoint de registro não aplica devicesLimit.
- A duplicidade de serial no endpoint é comparada como texto exato; a auditoria estrutural também aponta duplicidades ignorando diferenças entre maiúsculas e minúsculas.
- O status locked é um valor do inventário. Não foi localizada leitura desse status pelo Store OS para interromper uma sessão.
- Não foi localizado canal para limpeza remota de cache, atualização de aplicativo, reboot, rastreamento GPS ou gerenciamento de firmware.
- Alterações no inventário e solicitações podem ser gravadas em audit_logs; isso não significa que um comando físico foi executado.

## Maturidade

| Recurso | Estado |
|---|---|
| Inventário de registros por tenant | Implementado |
| Validação de tenant no cadastro | Implementada |
| Verificação de serial duplicado exato | Implementada |
| Aplicação da cota de dispositivos no cadastro | Não implementada |
| Heartbeat e telemetria física | Não localizados |
| Bloqueio ou reinicialização remota | Não localizados |
| Agente MDM nativo | Não localizado |

Os testes de dispositivo não foram executados durante esta auditoria.
