# Integrações de pedidos de marketplaces de delivery

Atualizado em 2026-11-02 por leitura do Store OS e das documentações oficiais disponíveis. Este documento separa o catálogo de plugins da integração real com os provedores.

## Objetivo do módulo

O eApp **Pedidos de Marketplaces** centraliza a fila de pedidos originados em plataformas externas. iFood, 99Food e Rappi são plugins independentes dentro desse módulo; iFood deixa de ser um eApp próprio. A integração pretendida é de entrada de pedidos na loja para facilitar a operação no Store OS. Este escopo não incorpora marketplace de consumidores da 3EAT, entregadores da plataforma, pagamento, catálogo ou sincronização de cardápio.

## Estado implementado

- `src/app/features/delivery-marketplaces/` contém o eApp, o contrato de metadados e os manifests de iFood, 99Food e Rappi.
- A janela lista requisitos e documentação oficial. A aba de pedidos lê `GET /api/marketplace-delivery/orders`; o servidor busca a subcoleção da unidade vinculada à sessão, e a tela confere novamente o `tenantId` ativo. Proprietário e operador podem consultar; os demais papéis não recebem dados de cliente.
- `GET /api/marketplace-delivery/connections` retorna apenas provedor, estado e horários da conexão da unidade. A projeção não expõe IDs de segredo, tokens ou payloads de autorização.
- O backend tem `ingestVerifiedMarketplaceOrder`, um serviço interno de persistência idempotente. Ele valida tenant ativo, vínculo ativo entre merchant e loja e o formato normalizado; o adapter futuro terá de autenticar o evento antes de chamá-lo. O serviço registra o recibo sem salvar o payload bruto. Ainda não há adapter que chame esse serviço.
- A interface não inventa pedidos nem mostra conexão ativa. Não há credenciais, OAuth de provedor, webhook, polling, endpoint HTTP de ingestão, confirmação ou sincronização de status implementados.
- Segredos de provedores não devem ser digitados ou persistidos no navegador. O onboarding deve ser associado ao tenant e processado por serviços seguros no servidor.
- O componente antigo `eapp-ifood.ts` foi removido: seus pedidos estáticos e botão de confirmação local não representavam uma integração.

## Evidência e pré-requisitos por provedor

| Plugin | Entrada de pedidos documentada | Dependências antes de produção |
|---|---|---|
| iFood | API oficial recebe eventos por polling ou webhook. Eventos de polling precisam de acknowledgment e deduplicação; pedidos têm ações e prazos específicos. | Cadastro do app, CNPJ e módulos adequados, loja de teste, autorização do merchant, integração funcional e homologação oficial. [Portal e guias](https://developer.ifood.com.br/pt-BR/docs/guides), [eventos](https://developer.ifood.com.br/en-US/docs/food/guides/modules/events/intro), [homologação](https://developer.ifood.com.br/en-US/docs/food/guides/modules/order/homologation). |
| 99Food | Portal oficial oferece API de pedidos, catálogo e logística. O perfil verificado no Open Delivery informa webhook e polling para receber eventos de pedidos. | Criar e certificar um aplicativo, testar no sandbox, concluir autorização da loja e confirmar os termos de cooperação exigidos para integrador terceiro. [Portal de desenvolvedores](https://developer-food.99app.com/pt-BR/home), [perfil Open Delivery](https://aderentes.opendelivery.com.br/companies/68f696345e89f79a1563008a). |
| Rappi | A documentação para parceiros descreve pedidos recebidos diretamente no POS e uma API para integrações; os detalhes técnicos dependem do acesso concedido. | Contato com a Rappi ou gerente de conta, acesso ao portal técnico, credenciais liberadas e validação da integração. [Integração POS](https://merchants.rappi.com/pt-br/o-que-ofrecemos/sistema-pos), [portal técnico](https://dev-portal.rappi.com). |

## Contrato de entrada que falta implementar

1. Registrar uma integração por `tenantId` e provedor; OAuth, client secrets e tokens ficam no servidor.
2. Receber eventos autenticados. O adapter futuro deve validar assinatura antes de ler/processar dados, aplicar rate limits e registrar tentativas sem guardar dados sensíveis além do necessário.
3. Deduplicar por `provider + externalEventId` e por `provider + externalOrderId`; acknowledgments só depois da persistência durável do evento.
4. Normalizar itens, cliente, endereço, valores, meio de pagamento, modalidade, descontos e estado original para um pedido externo associado ao tenant correto.
5. Aplicar uma política explícita de vínculo entre SKU externo e produto local antes de mexer em estoque ou KDS. Não reutilizar o checkout do consumidor sem adaptação: ele recalcula preços e pagamento para a venda própria da loja.
6. Expor no Store OS a origem e o status externo. Confirmação, rejeição, preparo e despacho só podem ser oferecidos quando o provedor suportar a ação e o conector correspondente estiver homologado.
7. Operar retries, polling de reconciliação, logs redigidos e alertas para eventos não processados ou não reconhecidos.

### Persistência já preparada

- `tenants/{tenantId}/marketplace_delivery_orders/{internalOrderId}` guarda o pedido externo normalizado para a fila da loja.
- `marketplace_delivery_connections/{providerMerchantHash}` é a associação server-side do merchant externo ao `tenantId`, provedor e status. O hash usa provedor e ID do merchant; segredos ficam fora deste documento.
- `marketplace_delivery_event_receipts/{eventHash}` deduplica `provider + merchantId + eventId` e aponta para o pedido processado. Eventos repetidos retornam o pedido existente sem duplicar a fila.
- `GET /api/marketplace-delivery/orders` exige proprietário/operador e deriva o tenant do token da sessão. Não aceita `tenantId` do cliente.
- `GET /api/marketplace-delivery/connections` também deriva o tenant da sessão e retorna uma projeção segura; ainda não existe tela/endpoint de autorização que crie essas associações.
- A rota não cria um pedido em `/orders`, não baixa estoque e não marca o pagamento. A ligação a KDS/produtos exige política de mapeamento e reconciliação de preço/estoque por provedor.

Pedidos externos continuam pertencendo à plataforma de origem para pagamento, taxas e responsabilidade de entrega. Os 8% de comissão da futura rede própria 3EATCRU não incidem sobre pedidos do iFood, 99Food ou Rappi.

## Próxima etapa para conexão real

Concluir o cadastro e a homologação do aplicativo integrador e obter o acesso oficial por provedor. Com essa autorização, implementar primeiro um conector de sandbox e o fluxo de idempotência/normalização; depois conectar a fila ao KDS e implementar ações de status aprovadas por cada API.
