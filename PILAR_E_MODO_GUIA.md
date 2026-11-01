# Guia do produto e critérios de maturidade — 3EATCRU

Este guia registra as fronteiras atuais do produto e os critérios para descrever uma função como pronta. A implementação e o estado detalhado ficam no [mapa de maturidade](./MODULE_STATUS.md) e no [índice documental](./docs/INDEX.md).

## Stack efetivamente implementada

O checkout atual usa Angular 21 com SSR, Express 5, Firebase Authentication, Firebase Admin SDK e Cloud Firestore. A documentação não deve descrever Next.js/React como stack implementada neste projeto.

## Ambientes do produto

| Ambiente | Rotas | Limite |
|---|---|---|
| HQ Central | /hq | Administra tenants, responsáveis, catálogo de planos e configurações. A cobrança recorrente da assinatura ainda não está integrada. |
| Store OS | /os, /pos | O desktop existe; o PDV é uma rota standalone. Consulte o mapa antes de descrever outros IDs como eApps integrados. |
| Público | /home, /p/:id | Marketplace regional, vitrines e pedidos. |
| Interfaces auxiliares | /waiter, /driver | Rotas web separadas. Não declarar APK, PWA instalado ou recursos nativos sem evidência de build e integração. |

## Regra de entregas e receita

1. A loja é responsável pelos seus motoristas, pela operação e pelo valor que decide pagar a cada um.
2. O lojista contrata no HQ a assinatura para usar o Store OS e a cota de dispositivos do plano. O catálogo e a validação de cota existem; a cobrança recorrente ainda não está integrada.
3. A oferta deverá atender também lojas sem frota própria com entregadores da plataforma quando estiver pronta. As regras para incluir esse acesso no plano, preços e cobrança ainda não estão implementados; o serviço fica em coming_soon.
4. A comissão de referência de 8% é futura e aplica-se apenas às entregas executadas pela rede própria da plataforma. É separada da assinatura e dos pagamentos de pedidos.
5. A receita dos pedidos do marketplace pertence à loja. O PIX usa a chave da loja; cartão real só poderá ser habilitado depois de conectar uma conta de pagamento por tenant. O HQ não recebe nem repassa esse dinheiro.

## Real, simulado e homologado

- **Fluxo integrado:** há caminho de código ligado a serviços e/ou API; isso não prova que todos os cenários estejam homologados.
- **Simulação:** estado ou resultado demonstrativo não representa persistência ou liquidação financeira real.
- **Placeholder:** o identificador aparece na interface, mas não há janela funcional conectada.
- **Homologação:** só declarar após registrar a execução dos testes e a validação operacional correspondentes.

Build, testes e homologação precisam ser reportados com data e resultado da execução. Verifique o estado por módulo em [MODULE_STATUS.md](./MODULE_STATUS.md).
