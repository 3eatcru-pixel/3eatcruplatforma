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

No portfólio do HQ, `trial`, `active` e `suspended` são apresentados como estados diferentes. A busca contempla nome, razão social, CNPJ, cidade, estado e bairro, aceitando CNPJ com ou sem pontuação. A ação de status ativa lojas em trial/suspensas ou suspende lojas ativas; o botão “Inspecionar OS” navega para o Store OS da unidade e não representa controle remoto de hardware.

O HQ mantém a camada geral do marketplace público em `/public_regional/default`: banner, avisos, praça, raio padrão e curadoria dos IDs de lojas em destaque. O conteúdo da vitrine individual (`/p/:id`) fica no tenant e é editado pela loja em Minha Loja. No HQ, o botão da ficha apenas abre uma pré-visualização; a governança ainda pode alterar status e parâmetros operacionais da conta.

Na configuração da loja, `deliveryFee` é a parte fixa cobrada do cliente e pode ser zero; `storeDeliveryContribution` é o complemento que a loja combina pagar ao seu entregador. O pedido registra a soma como remuneração combinada, mas não efetua o pagamento. O campo legado `serviceFeePercent` é ignorado e não entra no checkout. Novas lojas operam com motoristas próprios; o campo legado `deliveryFleetType` não ativa entregadores 3EAT. A comissão futura de 8% pertence a outro processo e só se aplica às entregas da rede própria da plataforma, quando ativada. A loja administra seus motoristas e decide os valores. A ficha mostra contagem e volume histórico dos pedidos elegíveis do tenant, sem paginação e sem conciliação com adquirentes. A consulta agora processa os documentos em fluxo para limitar memória, mas ainda lê todo o histórico. O campo isOpen controla se a loja está aberta para pedidos, não a visibilidade da vitrine.

`GET /api/hq/tenants/:id/metrics` exige `hq_admin` e busca pedidos pelo `tenantId` exato. Inclui pedidos não simulados, não cancelados, com pagamento aprovado ou status concluído e total finito não negativo. A resposta contém contagem, soma de `total` e horário da consulta; o resumo não representa comissão da plataforma nem fechamento financeiro.

Tenants que não estão ativos não aparecem na listagem pública. O backend comercial rejeita operações comerciais para tenant inativo.

## Limites e validação

- O backend valida os dígitos verificadores do CNPJ pelo helper isValidCnpj.
- Coordenadas e endereço são dados fornecidos no cadastro; a tela do HQ não geocodifica automaticamente o endereço.
- O painel não comprova a titularidade fiscal dos dados.
- Nesta revisão, `npm run test:ci` passou com 100/100 testes. A suíte usa mocks e não valida criação ou alteração de tenant contra um Firestore real.
