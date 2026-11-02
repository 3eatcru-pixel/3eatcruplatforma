# Ambiente 1 — HQ Central

## Escopo

O HQ Central (/hq) é o painel de governança SaaS reservado a hq_admin. Não opera PDV, mesas, cozinha ou pedidos de uma loja.

## Responsabilidades disponíveis

1. Consultar e administrar tenants, incluindo provisionamento inicial em trial.
2. Consultar e alterar o catálogo de planos.
3. Consultar os agregados comerciais. A comissão das entregas da plataforma está marcada como “Em breve”.
4. Manter o inventário de dispositivos e consultar os registros existentes.
5. Carregar, publicar ou remover o aviso global e configurar a flag visual de manutenção consumida pelo Store OS.
6. Consultar o catálogo de módulos e gerenciar o marketplace público da plataforma: banner, avisos, praça, raio padrão e curadoria de lojas em destaque. O HQ não edita a página individual da loja.
7. Consultar o diretório de consumidores em páginas de 50 perfis; cada página pode ser carregada sob demanda.

## Navegação do console

- **Lojas e operação:** portfólio de lojas e inventário de dispositivos.
- **Financeiro:** planos e preços SaaS, cobranças recorrentes e comissão futura da rede própria da plataforma.
- **Ecossistema:** catálogo informativo de módulos, prévia simulada de aplicativos, marketplace da plataforma e diretório de consumidores.
- **Governança:** configurações globais e auditoria estrutural.

Em desktop, essas áreas ficam em uma navegação lateral. Em tablet, a faixa de áreas pode ser percorrida horizontalmente. `Ctrl+K` abre uma busca filtrável que lista as mesmas 11 áreas. No portfólio, estados `trial`, `active` e `suspended` aparecem separadamente; a busca cobre nome, razão social, CNPJ, cidade, estado e bairro. “Inspecionar OS” abre o Store OS da unidade, sem controle remoto do hardware. O inventário do HQ não inclui cadastro de motoristas nem monitoramento das rotas privadas das lojas.

O alternador do console mantém o papel `hq_admin` no ambiente simulado, limpa métricas, planos, inventário, auditoria e páginas do diretório da sessão anterior e volta à lista de lojas. O modo é derivado de uma única fonte; atalhos de simulação e logout mantêm o indicador e os serviços alinhados. Trocas manuais e restauração automática da sessão invalidam respostas antigas e limpam o estado do HQ, marketplace e diretório. Ao retornar ao modo real, restaura a sessão Firebase e recarrega a área ativa; se a conta não for `hq_admin`, direciona para a entrada do HQ. O indicador mostra o caminho selecionado, não disponibilidade confirmada do Firestore.

O modo real não ativa automaticamente integrações ausentes: checkout SaaS exige credenciais e webhooks configurados, os pagamentos dos pedidos usam o fluxo específico da loja e emissão NF-e/NFC-e não está implementada. A simulação cobre somente recursos com caminho local explícito; não representa teste de carga ou homologação externa.

## Limites observados

- O provisionamento do HQ valida CNPJ e cria a loja em trial e fechada. O proprietário não é vinculado automaticamente.
- A comissão de 8% está desativada com estado `coming_soon`. Motoristas da loja são administrados e pagos pelo lojista; a comissão só será ativada para uma rede própria da plataforma após o processo de inteligência estar pronto.
- Os registros de dispositivos não provam conexão física. Não foi localizado agente de hardware para heartbeat, bloqueio ou reinicialização remota.
- A flag de manutenção afeta o shell do Store OS após sincronização. Ela não bloqueia rotas de API ou checkout.
- A varredura de auditoria é estrutural e cobre apenas tenants, produtos, pedidos e dispositivos.
- O diretório de consumidores é restrito a hq_admin e não calcula GMV, frequência de pedidos ou auditoria individual.

Consulte docs/HQ/00_ARQUITETURA_HQ.md para a matriz de maturidade e os limites de cada módulo.
