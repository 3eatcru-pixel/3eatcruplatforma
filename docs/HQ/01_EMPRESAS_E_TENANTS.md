# HQ Central — Empresas e Tenants

## Ciclo de vida

O HQ pode consultar tenants, provisioná-los e alterar parâmetros administrativos. O cadastro público de lojista e o provisionamento manual pelo HQ são fluxos diferentes.

### Cadastro iniciado pelo HQ

POST /api/tenants é restrito a hq_admin. Exige nome e CNPJ válido com 14 dígitos verificadores; verifica duplicidade antes de gravar. A consulta de duplicidade não é uma operação atômica com a gravação, portanto não constitui garantia de unicidade contra requisições simultâneas.

O novo tenant começa em status trial, com isOpen false, cota igual ao `maxDevices` cadastrado para o plano, activeDevicesCount igual a zero, sem proprietário e sem equipe. Se não houver cota salva, são usados os padrões Starter: 2, Professional: 5, Enterprise: 20. A API ignora `ownerUid` e `staffUids` recebidos no payload de criação; a identidade não pode ser vinculada sem validação. Razão social, contato, endereço e coordenadas não são inventados: quando ausentes, o perfil fica incompleto e deve ser completado antes da operação. Se a configuração do plano não puder ser carregada, a API responde `503 PLAN_CONFIGURATION_UNAVAILABLE` e não cria o tenant.

### Vínculo do responsável

`GET /api/tenants/:id/owner` é restrito a `hq_admin` e consulta o e-mail atual da conta vinculada no Firebase Auth. `POST /api/tenants/:id/owner` recebe o e-mail de uma conta Firebase já existente. O servidor exige e-mail confirmado, impede vincular uma conta HQ, impede transferir um responsável existente por essa rota e rejeita contas já vinculadas a outro tenant. A operação registra `ownerUid`, inclui o UID na equipe, sincroniza o documento `/users/{uid}` e as claims `tenant_owner`/`tenantId`, preservando outras claims. O responsável precisa obter um ID Token novo (por exemplo, entrar novamente) para refletir o papel.

O vínculo entre Firestore e Firebase Auth usa gravações separadas; se a atualização das claims falhar, a API tenta restaurar as claims anteriores e reverter a reserva no Firestore. Se alguma reversão automática falhar, retorna `OWNER_LINK_ROLLBACK_INCOMPLETE` para revisão manual no HQ.

### Cadastro iniciado pelo lojista

POST /api/auth/register-merchant valida CNPJ e exige os campos de endereço especificados pelo fluxo de onboarding. A loja começa em trial e fechada, usando a cota atual do plano Starter. Verifique auth.router.ts para a validação vigente do formulário.

### Governança

PATCH /api/tenants/:id aplica autorização por tenant. `ownerUid` e `staffUids` são removidos do payload para todos os papéis e só podem ser atualizados pelos fluxos próprios de identidade. Usuários que não são hq_admin também não podem alterar status, plano, cota ou CNPJ. Alterações administrativas do HQ são registradas em `audit_logs` depois da atualização do tenant; o registro é best effort.

Na ficha do HQ, `deliveryFee` é o valor fixo de entrega definido para a loja; pode ser zero. O campo legado `serviceFeePercent` é ignorado e não entra no checkout. Novas lojas operam com motoristas próprios; o campo legado `deliveryFleetType` não ativa entregadores 3EAT. A comissão futura de 8% pertence a outro processo e só se aplica às entregas da rede própria da plataforma, quando ativada. A loja administra seus motoristas e define quanto paga a eles. A ficha mostra contagem e volume histórico dos pedidos elegíveis do tenant, sem paginação e sem conciliação com adquirentes. O campo isOpen controla se a loja está aberta para pedidos, não a visibilidade da vitrine.

`GET /api/hq/tenants/:id/metrics` exige `hq_admin` e busca pedidos pelo `tenantId` exato. Inclui pedidos não simulados, não cancelados, com pagamento aprovado ou status concluído e total finito não negativo. A resposta contém contagem, soma de `total` e horário da consulta; o resumo não representa comissão da plataforma nem fechamento financeiro.

Tenants que não estão ativos não aparecem na listagem pública. O backend comercial rejeita operações comerciais para tenant inativo.

## Limites e validação

- O backend valida os dígitos verificadores do CNPJ pelo helper isValidCnpj.
- Coordenadas e endereço são dados fornecidos no cadastro; a tela do HQ não geocodifica automaticamente o endereço.
- O painel não comprova a titularidade fiscal dos dados.
- Nesta revisão, `npm run test:ci` passou com 94/94 testes. A suíte usa mocks e não valida criação ou alteração de tenant contra um Firestore real.
