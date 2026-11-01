# Ambiente 1 — HQ Central

## Escopo

O HQ Central (/hq) é o painel de governança SaaS reservado a hq_admin. Não opera PDV, mesas, cozinha ou pedidos de uma loja.

## Responsabilidades disponíveis

1. Consultar e administrar tenants, incluindo provisionamento inicial em trial.
2. Consultar e alterar o catálogo de planos.
3. Consultar os agregados comerciais. A comissão das entregas da plataforma está marcada como “Em breve”.
4. Manter o inventário de dispositivos e consultar os registros existentes.
5. Publicar aviso global e configurar a flag visual de manutenção consumida pelo Store OS.
6. Consultar o catálogo de módulos e configurações regionais.
7. Consultar o diretório de consumidores, limitado a 100 perfis por requisição.

## Limites observados

- O provisionamento do HQ valida CNPJ e cria a loja em trial e fechada. O proprietário não é vinculado automaticamente.
- A comissão de 8% está desativada com estado `coming_soon`. Motoristas da loja são administrados e pagos pelo lojista; a comissão só será ativada para uma rede própria da plataforma após o processo de inteligência estar pronto.
- Os registros de dispositivos não provam conexão física. Não foi localizado agente de hardware para heartbeat, bloqueio ou reinicialização remota.
- A flag de manutenção afeta o shell do Store OS após sincronização. Ela não bloqueia rotas de API ou checkout.
- A varredura de auditoria é estrutural e cobre apenas tenants, produtos, pedidos e dispositivos.
- O diretório de consumidores é restrito a hq_admin e não calcula GMV, frequência de pedidos ou auditoria individual.

Consulte docs/HQ/00_ARQUITETURA_HQ.md para a matriz de maturidade e os limites de cada módulo.
