# Público — 05: Perfil do consumidor e reservas

Atualizado em 2026-11-01 por leitura estática. Este documento separa interfaces, rotas e limites sem declarar homologação.

## Perfil e dados do consumidor

A tela de perfil está em src/app/components/consumer-profile.ts. A coleção consumers possui regras de acesso para o titular; leituras de pedidos também dependem da identidade do consumidor e das regras aplicáveis.

A existência do componente não comprova que todos os fluxos de histórico, endereço, fidelidade ou acompanhamento foram homologados. O código e o estado dos recursos devem ser revisados antes de anunciar essas funções como prontas.

## Reservas

O servidor expõe rotas públicas e autenticadas em /api/reservations. O roteador valida o tenant e as regras de reserva e sincroniza estados de mesa nas operações cobertas pela implementação. A tela eapp-reservations.ts exibida no catálogo do Store OS é demonstrativa e não está integrada como janela desktop; consulte [Aplicativos e módulos](../OS/03_APLICATIVOS_E_MODULOS.md).

## Estado da validação

O build de produção passou e a suíte geral passou com 90/90 testes. Não houve teste ponta a ponta específico de perfil e reservas nem homologação com Firebase real.
