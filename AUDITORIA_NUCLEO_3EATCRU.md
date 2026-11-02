# Auditoria do núcleo — arquivo histórico

Este arquivo substitui um relatório anterior que misturava inspeção de código com afirmações de produção e homologação não reproduzíveis neste checkout. Os números antigos de testes, a disponibilidade de Nginx/Cloud Run, o provisionamento de bancos e os estados de liquidação não devem ser usados como evidência atual.

Use as fontes canônicas para consultar o estado vigente:

- [Mapa de maturidade dos módulos](./MODULE_STATUS.md)
- [Índice da documentação](./docs/INDEX.md)
- [Arquitetura geral](./docs/00_ARQUITETURA_GERAL.md)
- [Testes e recuperação](./docs/INTEGRACAO/04_TESTES_E_RECUPERACAO.md)

O checkout atual continua em auditoria incremental. O código PostgreSQL/Drizzle está isolado e não participa dos fluxos de negócio; a persistência ativa descrita pelas rotas é Firebase/Firestore. O wrapper externo `/app/package.json` do ambiente que inicia `control-plane-api` também não está neste repositório; sua persistência depende da configuração do ambiente hospedeiro.
