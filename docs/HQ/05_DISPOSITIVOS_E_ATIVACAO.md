# HQ Central — Inventário de Dispositivos

## Escopo atual

A tela de dispositivos mantém registros associados a tenants. O cadastro não confirma pareamento com hardware. Não foi localizado agente de dispositivo para enviar heartbeat, telemetria ou receber comandos remotos.

A coleção /devices pode conter cadastros legados com status e campos de telemetria. Sem agente que os atualize, esses valores não comprovam o estado atual do equipamento. A interface identifica estados como online como status cadastrado e não como conexão verificada.

## Endpoints

- GET /api/hq/devices lista registros e permite filtro por tenant.
- POST /api/hq/devices exige tenant, nome e serial; verifica a existência do tenant, a duplicidade exata do serial e a cota de registros do tenant dentro de uma transação. Cria o registro com status unverified e sem inventar MAC, IP, versão ou bateria. O inventário interno `hq` não consome cota de uma loja.
- POST /api/hq/devices/:id/lock altera o status salvo no registro. Não envia bloqueio ao hardware.
- POST /api/hq/devices/:id/restart registra uma solicitação em audit_logs e não reinicia o equipamento.
- A tela de motoristas mostra campos armazenados. O HQ não consulta GPS em tempo real; localização e bateria são campos informados pelo app. Novos cadastros não recebem horário de GPS nem aprovação documental automática.

Motoristas cadastrados pelas lojas são do tipo `private`. O lojista administra a operação e decide quanto pagar; o App do Entregador facilita o uso de rotas e a baixa das entregas, mas não processa pagamento. Novas lojas iniciam com entrega própria; valores legados de `deliveryFleetType` não ativam uma rede 3EAT. O tipo `platform` com `tenantId: marketplace` fica reservado para a futura frota da plataforma, cuja comissão está em breve. Gestores de loja não podem marcar seus motoristas como parte dessa rede.

## Limites

- A cota conta registros em `/devices`, não equipamentos fisicamente conectados. Ao atingir `devicesLimit`, o servidor rejeita novos registros da loja com `409 DEVICE_QUOTA_REACHED`; elevar ou reduzir o limite é uma ação administrativa. Se a cota for reduzida abaixo da quantidade atual, novos cadastros ficam bloqueados até o limite ser aumentado; não há rota de remoção de registros nesta API.
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
| Aplicação transacional da cota de registros no cadastro | Implementada; não valida conexão física |
| Heartbeat e telemetria física | Não localizados |
| Bloqueio ou reinicialização remota | Não localizados |
| Agente MDM nativo | Não localizado |

Não há teste dedicado da rota de inventário de dispositivos no conjunto atual. A suíte geral passou nesta revisão, mas não substitui testes específicos da rota nem integração com hardware real.
