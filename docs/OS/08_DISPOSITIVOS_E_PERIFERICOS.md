# Store OS — 08: Dispositivos e periféricos

## Estado encontrado no PDV

| Recurso | Implementação | Limite |
|---|---|---|
| Leitor de código | Campo de entrada do PDV em src/app/components/eapps/pos/pos-scanner.ts | Leitores que enviam caracteres como teclado podem preencher o campo; não há driver HID dedicado encontrado. |
| Balança | Modal em src/app/components/eapps/pos/pos-scale-modal.ts | O operador informa produto e peso manualmente. Não há conexão com porta serial. |
| Impressão | src/app/components/eapps/pos/pos-receipt-modal.ts | Usa window.print para comprovante não fiscal. Não implementa protocolo ESC/POS direto. |
| Configuração de hardware | ID settings no registro do desktop | Placeholder; `eapp-settings.ts` não está integrada e informa que impressora e balança não estão configuradas. |
| Indicadores da barra do Store OS | src/app/components/os/taskbar.ts | Não monitora velocidade de rede nem conectividade da API. Impressora não configurada e alertas KDS não integrados. |

Web Serial, WebUSB, gaveta automática, integração TEF, emissão fiscal e conexão de impressora via rede não devem ser anunciadas como disponíveis com base no código atual.

## Validação

Esta documentação descreve a interface encontrada no código. Teste com equipamentos físicos não foi executado nesta revisão.
