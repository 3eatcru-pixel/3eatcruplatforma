# HQ Central — Empresas e Tenants

## Ciclo de vida

O HQ pode consultar tenants, provisioná-los e alterar parâmetros administrativos. O cadastro público de lojista e o provisionamento manual pelo HQ são fluxos diferentes.

### Cadastro iniciado pelo HQ

POST /api/tenants é restrito a hq_admin. Exige nome e CNPJ válido com 14 dígitos verificadores; verifica duplicidade antes de gravar. A consulta de duplicidade não é uma operação atômica com a gravação, portanto não constitui garantia de unicidade contra requisições simultâneas.

O novo tenant começa em status trial, com isOpen false, cota inicial determinada pelo plano e activeDevicesCount igual a zero. Razão social, contato, endereço, coordenadas e proprietário não são inventados: quando ausentes, o perfil fica incompleto e deve ser completado ou vinculado antes da operação. O provisionamento pelo HQ não cria usuário proprietário automaticamente.

### Cadastro iniciado pelo lojista

POST /api/auth/register-merchant valida CNPJ e exige os campos de endereço especificados pelo fluxo de onboarding. A loja começa em trial e fechada. Verifique auth.router.ts para a validação vigente do formulário.

### Governança

PATCH /api/tenants/:id aplica autorização por tenant. Usuários que não são hq_admin não podem alterar campos protegidos como status, plano, cota, CNPJ ou vínculos de equipe. Alterações do HQ são registradas em audit_logs após a atualização do tenant; o registro de auditoria é best effort.

Na ficha do HQ, serviceFeePercent representa a taxa de serviço aplicada no checkout de delivery; não é a comissão futura da plataforma, que está em breve. A loja administra seus motoristas e define quanto paga a eles. A ficha não carrega pedidos por tenant nem calcula seu GMV. O campo isOpen controla se a loja está aberta para pedidos, não a visibilidade da vitrine.

Tenants que não estão ativos não aparecem na listagem pública. O backend comercial rejeita operações comerciais para tenant inativo.

## Limites e validação

- O backend valida os dígitos verificadores do CNPJ pelo helper isValidCnpj.
- Coordenadas e endereço são dados fornecidos no cadastro; a tela do HQ não geocodifica automaticamente o endereço.
- O painel não comprova a titularidade fiscal dos dados.
- A inspeção atual não executou testes automatizados.
