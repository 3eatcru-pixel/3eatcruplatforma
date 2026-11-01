# HQ Central — Operações e Auditoria Estrutural

## Varredura estrutural sob demanda

POST /api/hq/audit/run é protegido por requireHqAdmin e lê as coleções tenants, products, orders e devices. A leitura é completa e sem paginação; a operação é acionada manualmente e não é monitoramento contínuo.

A varredura verifica:

- CNPJ válido e cota de registros de dispositivos por tenant;
- referência de tenant e preço finito positivo nos produtos;
- subtotal, taxas, desconto e total finitos, não negativos e matematicamente consistentes nos pedidos;
- vínculo de tenant e serial presente e não duplicado no inventário.

O relatório inclui a quantidade de registros inspecionados, apontamentos e consistência dos totais dos pedidos. Status passed significa apenas que não houve apontamento nas verificações executadas. Não certifica todos os documentos do banco, pagamentos externos, regras fiscais, usuários, segurança completa ou infraestrutura. Também não compara o status financeiro dos pedidos com extratos de adquirentes.

## Avisos e manutenção

- POST /api/hq/system/broadcast salva texto no documento global do HQ. O conteúdo fica disponível no endpoint público GET /api/hq/public-status, junto com a flag de manutenção.
- POST /api/hq/system/platform-delivery-commission salva `coming_soon` e registra auditoria. A rota não permite ativar a comissão antes da implantação da rede e da inteligência operacional.
- O Store OS lê essa configuração durante sincronização. O aviso aparece após o próximo sync; não há entrega push imediata.
- A flag de manutenção apresenta o overlay no shell do Store OS após sincronização. Ela não bloqueia endpoints de API ou checkout.
- A rota POST /api/hq/communications/messages exige hq_admin e salva mensagem interna. Não foi localizado conector de WhatsApp, SMS ou outro canal externo.
- POST /api/auth/assign-role registra a atribuição de papel em audit_logs como best effort. A coleção não é imutável e a claim atualizada depende de um ID Token novo no cliente.
- POST /api/tenants/:id/owner registra o vínculo do responsável em audit_logs como best effort. Se a atualização das claims falhar, a rota tenta restaurar as claims e reverter a reserva Firestore, retornando um código específico se alguma reversão falhar.

## Configuração regional

As rotas de configuração regional persistem dados usados pela interface de marketplace. Elas não são métricas de infraestrutura nem comprovam disponibilidade de lojas.

## Validação desta auditoria

Nesta revisão, `npm run test:ci` passou com 90/90 testes e `npm run build -- --stats-json` compilou para produção. O bundle inicial ficou em 600,66 kB brutos (126,50 kB estimados em transferência), sem aviso de limite inicial. Firebase Auth carrega depois da primeira renderização e Firestore apenas quando uma assinatura em tempo real é solicitada; avisos CommonJS de Leaflet e gRPC continuam. Os testes incluem mocks e não substituem a validação da varredura contra um Firestore de homologação.

| Capacidade | Estado atual |
|---|---|
| Varredura estrutural manual | Implementada no escopo acima |
| Auditoria de 100% dos registros/sistemas | Não implementada |
| Agendamento automático ou monitoramento contínuo | Não localizado |
| Broadcast persistido e consumido no sync do Store OS | Implementado |
| Bloqueio de APIs e checkout por modo manutenção | Não implementado |
| Notificação por canal externo | Não localizada |
| Métricas de latência, armazenamento, tráfego ou certificados | Não localizadas |
