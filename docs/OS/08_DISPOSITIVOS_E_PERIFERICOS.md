# Store OS — 08: Dispositivos e periféricos

## Estado encontrado no PDV

| Recurso | Implementação | Limite |
|---|---|---|
| Leitor de código | Campo de entrada do PDV em src/app/components/eapps/pos/pos-scanner.ts | Leitores que enviam caracteres como teclado podem preencher o campo; não há driver HID dedicado encontrado. |
| Balança | Modal em src/app/components/eapps/pos/pos-scale-modal.ts | O operador informa produto e peso manualmente. Não há conexão com porta serial. |
| Impressora | `PosPrintService` + diálogo de impressão do navegador | Gera comprovante não fiscal e página de teste em janela própria; o navegador permite escolher impressoras instaladas no sistema. O nome e papel de 58/80 mm ficam salvos localmente por usuário/loja. Não há descoberta automática, driver próprio nem protocolo ESC/POS direto. |
| Maquininha externa | Configuração privada `tenants/{tenantId}.externalPaymentTerminals` + fluxo manual do PDV | Proprietário/operador cadastra nome, marca/modelo, métodos PIX/crédito/débito e disponibilidade; perfis são compartilhados pela loja. O PDV envia o ID do perfil e método, e o servidor valida ambos antes de registrar a confirmação manual. Não há pareamento, chamada de adquirente ou confirmação eletrônica da transação. |
| Configuração de hardware | eApp `settings` integrado | A loja controla seus perfis de maquininhas; o HQ não pode alterá-los. Preferências da impressora pertencem ao caixa/navegador local. Configuração da largura de papel não confirma que a impressora instalada aceite aquele formato. |
| Indicadores da barra do Store OS | src/app/components/os/taskbar.ts | Não monitora velocidade de rede, conectividade da API ou estado da impressora. Alertas KDS não integrados. |

## Operação da impressora

- A página de teste e o comprovante abrem uma janela de impressão dedicada com o formato configurado (58 ou 80 mm).
- No diálogo do navegador, o operador escolhe a impressora já instalada no computador. Impressoras USB, de rede ou Bluetooth funcionam somente se o sistema operacional e o navegador as disponibilizarem como destino de impressão.
- A configuração salva um rótulo local e largura de papel; não descobre, seleciona ou monitora o dispositivo automaticamente. Se uma janela for bloqueada pelo navegador, permita pop-ups para o Store OS.

## Operação da maquininha

- Cadastros de até 8 perfis por loja são persistidos pelo servidor e compartilhados com os caixas autenticados do mesmo tenant. O proprietário/operador ativa ou desativa cada perfil e define os métodos aceitos.
- O PDV só apresenta os métodos habilitados em ao menos uma maquininha ativa. Havendo mais de uma, o operador escolhe qual foi utilizada.
- O operador confere o pagamento fora do Store OS e marca a confirmação no PDV. Pedido, transação e financeiro ficam ligados ao perfil selecionado; o sistema não conversa com TEF/PSP.
- A loja não deve armazenar senha, token do adquirente, número de cartão, validade ou CVV no cadastro. O perfil guarda somente identificação e métodos aceitos.

Web Serial, WebUSB, gaveta automática, integração TEF, emissão fiscal, descoberta automática e controle de impressora pela rede não devem ser anunciados como disponíveis com base no código atual.

## Validação

Lint, build de produção e verificação de diff validam a implementação; teste com equipamento, instalação de driver e impressão física não foram executados nesta revisão.
