# HQ Central — Inventário de Dispositivos

## Escopo atual

A tela de dispositivos mantém registros associados a tenants. O cadastro não confirma pareamento com hardware. Não foi localizado agente de dispositivo para enviar heartbeat, telemetria ou receber comandos remotos.

Os perfis de maquininhas externas e preferências de impressora não pertencem ao inventário MDM do HQ. O proprietário/operador configura os métodos de pagamento em Configurações do Store OS; o HQ não pode editar esses perfis. A configuração da impressora fica no navegador/computador do caixa. A presença de um registro na loja ou no HQ não comprova conexão física.

A coleção /devices pode conter cadastros legados com status e campos de telemetria. Sem agente que os atualize, esses valores não comprovam o estado atual do equipamento. A interface identifica estados como online como status cadastrado e não como conexão verificada.

## Endpoints

- GET /api/hq/devices lista registros e permite filtro por tenant.
- POST /api/hq/devices exige tenant, nome e serial; verifica a existência do tenant, a duplicidade exata do serial e a cota de registros do tenant dentro de uma transação. Cria o registro com status unverified e sem inventar MAC, IP, versão ou bateria. O inventário interno `hq` não consome cota de uma loja.
- POST /api/hq/devices/:id/lock altera o status salvo no registro. Não envia bloqueio ao hardware.
- POST /api/hq/devices/:id/restart registra uma solicitação em audit_logs e não reinicia o equipamento.
- `PATCH /api/tenants/:id` não permite que `hq_admin` edite `externalPaymentTerminals`; essa configuração exige proprietário/operador da própria unidade. O cadastro não contém credenciais de adquirente e não aciona o terminal.
- O inventário do HQ contém apenas registros de dispositivos. Ele não carrega nomes, telefones, documentos, coordenadas, precisão, rotas ou pings dos motoristas das lojas. Motoristas, rotas e GPS ficam no Store OS da própria unidade. A API de logística limita o HQ à futura frota `marketplace`; enquanto ela estiver em `coming_soon`, as consultas administrativas de frota/rotas respondem `409 PLATFORM_DELIVERY_NETWORK_UNAVAILABLE`.
- Ações de reinício e bloqueio alteram registros administrativos: reinício grava uma solicitação de auditoria e bloqueio troca o status persistido no inventário. Nenhuma das ações opera o equipamento físico sem agente conectado.

Motoristas cadastrados pelas lojas são do tipo `private`. O lojista administra a operação e decide quanto pagar; o App do Entregador facilita o uso de rotas e a baixa das entregas, mas não processa pagamento. Novas lojas iniciam com entrega própria; valores legados de `deliveryFleetType` não ativam uma rede 3EAT. O tipo `platform` com `tenantId: marketplace` fica reservado para a futura frota da plataforma. Enquanto a rede estiver em breve, a API rejeita cadastros e rotas da frota `marketplace`, conversão e atribuição de motoristas da plataforma e transições de rotas legadas dessa frota. Gestores de loja não podem marcar seus motoristas como parte dessa rede.

O perfil do App do Entregador usa nome, tipo de veículo, placa e estado de conferência registrados no cadastro. Entregas e rotas concluídas são agregadas das rotas carregadas. A tela não apresenta avaliações fictícias nem atesta documentos sem conferência registrada; o sistema ainda não possui fonte de avaliações.

O App Entregador usa o estilo vetorial OpenFreeMap/MapLibre. O GPS do aparelho só é compartilhado após ação explícita do motorista autenticado, durante rota atribuída e em primeiro plano; a posição mais recente é exibida ao gestor da unidade e removida ao parar ou concluir a entrega. O mapa do HQ não mostra posições da frota. Endereços não são geocodificados e não existe navegação calculada. A loja pode informar distância, duração e janela ao criar a rota; esses valores são exibidos como dados informados, sem cálculo ou verificação por GPS. Quando omitidos, distância e duração ficam como não informadas, e a janela aparece como `Sem janela definida`; a API não inventa estimativas padrão.

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

Não há teste dedicado da rota de inventário de dispositivos no conjunto atual. Nesta etapa, lint e build passaram; os testes automatizados não foram executados. Isso não substitui teste específico da rota nem integração com hardware real.
