# Arquitetura geral do ecossistema 3EATCRU

Atualizado em 2026-11-01 por leitura estática. A implementação deste repositório usa Angular 21 com SSR, Express 5, Firebase Authentication, Firebase Admin SDK e Cloud Firestore. O mapa de módulos está em [MODULE_STATUS.md](../MODULE_STATUS.md).

## Ambientes de produto

- **HQ Central — /hq:** governança de tenants, responsáveis, planos cadastrados, configurações e auditoria.
- **Store OS — /os e /pos:** desktop do lojista e PDV em rota standalone. Consulte o mapa antes de considerar os demais IDs como eApps integrados.
- **Público — /home e /p/:id:** marketplace regional e vitrine pública.
- **Rotas auxiliares — /waiter e /driver:** interfaces web separadas do desktop; não comprovam APK, PWA instalado ou recursos nativos.

## Integração

A API Express é montada em src/server/api.ts sob /api. O cliente e o servidor compartilham modelos em src/shared. As rotas que usam Firebase Admin SDK precisam aplicar autorização no servidor; as regras Firestore não restringem o Admin SDK.

O código PostgreSQL/Drizzle em `src/db/` é um scaffold isolado: nenhuma rota ou serviço da aplicação o importa. A persistência dos fluxos ativos continua no Firestore. Este checkout não comprova uma instância SQL disponível nem uma migração aplicada.

A página pública inicia a sincronização de dados depois da primeira renderização no navegador. Firebase Auth também é carregado após essa renderização para restaurar a sessão; o Firestore só é carregado sob demanda por telas que abrem assinaturas em tempo real. Não há consulta automática de conectividade ao abrir o app. A busca de credenciais do Firebase Admin não bloqueia o SSR. Dados reais nas rotas Express dependem de Application Default Credentials no ambiente do servidor; consulte [testes e recuperação](./INTEGRACAO/04_TESTES_E_RECUPERACAO.md) para a configuração local.

## Regras de receita e entrega

A loja administra seus motoristas próprios e decide quanto pagar a eles. A assinatura paga ao HQ pelo uso do Store OS e pela cota de dispositivos do plano tem checkout recorrente via Mercado Pago/Stripe, com status e faturas atualizados por webhooks assinados. O acesso à rede de entregadores da plataforma está em `coming_soon`; quando ativado, haverá comissão de 8% por entrega elegível, separada da assinatura e do caixa da loja.

## Pagamentos

O roteador atual expõe POST /api/payments/process, POST /api/payments/:id/confirm e GET /api/payments/:id. O PIX usa a chave configurada no tenant e confirmação manual; cartão real está bloqueado até integrar uma conta de pagamento por loja. Não há recebimento central do HQ nem webhook de adquirente. Consulte [Checkout e pagamentos](./PUBLICO/04_CHECKOUT_PAGAMENTO_E_PIX.md).

## Estado de validação

Esta arquitetura registra caminhos presentes no código; não declara build, testes, produção ou homologação aprovados. Consulte [testes e recuperação](./INTEGRACAO/04_TESTES_E_RECUPERACAO.md).
