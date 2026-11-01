# 📖 Índice de Documentação — 3EATCRU

Bem-vindo à central de documentação do ecossistema 3EATCRU. Este documento serve como o mapa principal para navegar pelos mais de 50 manuais técnicos e funcionais da plataforma.

---

## 🗺️ 1. Visão Geral e Arquitetura do Ecossistema
Documentos fundamentais que explicam a visão macro, o modelo de negócio e a topologia técnica.

- 🏛️ [00 — Arquitetura Geral do Ecossistema](./00_ARQUITETURA_GERAL.md)
- 🌐 [Visão Geral do Ecossistema](./00_VISAO_GERAL_ECOSISTEMA.md)
- 📜 [06 — Histórico de Decisões Técnicas & Migrações](./06_HISTORICO_E_DECISOES.md)
- 🏗️ [Auditoria de Mapeamento de Trabalho](./AUDITORIA_MAPEAMENTO_TRABALHO.md)

---

## 🏢 2. Pilar 1: HQ Central (Governança SaaS)
Documentação focada no gabinete executivo, gestão de tenants, planos e faturamento.

- 🏗️ [Pilar 1 — Documentação Geral](./PILAR_1_HQ_CENTRAL.md)
- 🏢 [00 — Arquitetura do HQ](./HQ/00_ARQUITETURA_HQ.md)
- 🏬 [01 — Empresas e Tenants](./HQ/01_EMPRESAS_E_TENANTS.md)
- 🔑 [02 — Contas e Permissões](./HQ/02_CONTAS_E_PERMISSOES.md)
- 💳 [03 — Planos, Licenças e Assinaturas](./HQ/03_PLANOS_LICENCAS_E_ASSINATURAS.md)
- 💰 [04 — Pagamentos e Cobrança](./HQ/04_PAGAMENTOS_E_COBRANCA.md)
- 📱 [05 — Dispositivos e Ativação](./HQ/05_DISPOSITIVOS_E_ATIVACAO.md)
- 🕵️ [06 — Operações e Auditoria](./HQ/06_OPERACOES_E_AUDITORIA.md)

---

## 🏬 3. Pilar 2: Store OS Lojista (ERP & POS)
Documentação profunda sobre o sistema operacional das lojas, módulos multissegmento e operação.

- 🏗️ [Pilar 2 — Documentação Geral](./PILAR_2_STORE_OS_LOJISTA.md)
- 🏬 [00 — Arquitetura do OS](./OS/00_ARQUITETURA_OS.md)
- 👤 [01 — Identidade e Acessos (PIN 6 Dígitos)](./OS/01_IDENTIDADE_E_ACESSOS.md)
- 🏢 [02 — Empresas e Filiais](./OS/02_EMPRESAS_E_FILIAIS.md)
- 🧩 [03 — Aplicativos e Módulos](./OS/03_APLICATIVOS_E_MODULOS.md)
- 🛒 [04 — PDV e Operações](./OS/04_PDV_E_OPERACOES.md)
- 📦 [05 — Estoque e Produtos](./OS/05_ESTOQUE_E_PRODUTOS.md)
- 📊 [06 — Financeiro e DRE](./OS/06_FINANCEIRO.md)
- 🍽️ [07 — Pedidos e Atendimento](./OS/07_PEDIDOS_E_ATENDIMENTO.md)
- 🖨️ [08 — Dispositivos e Periféricos](./OS/08_DISPOSITIVOS_E_PERIFERICOS.md)
- 🔄 [09 — Persistência e Sincronização](./OS/09_PERSISTENCIA_E_SINCRONIZACAO.md)

---

## 🛍️ 4. Pilar 3: Público & Marketplace
Vitrinas regionais, checkout omnichannel e experiência do consumidor final.

- 🏗️ [Pilar 3 — Marketplace Regional](./PILAR_3_MARKETPLACE_REGIONAL.md)
- 🛍️ [Pilar 4 — Vitrine Pública e Autoatendimento](./PILAR_4_VITRINE_PUBLICA_E_AUTOATENDIMENTO.md)
- 🛍️ [00 — Arquitetura do Público](./PUBLICO/00_ARQUITETURA_PUBLICO.md)
- 📍 [01 — Marketplace Regional](./PUBLICO/01_MARKETPLACE_REGIONAL.md)
- 📖 [02 — Vitrine de Loja e Cardápio](./PUBLICO/02_VITRINE_LOJA_E_CARDAPIO.md)
- 📱 [03 — Autoatendimento e QR Mesa](./PUBLICO/03_AUTOATENDIMENTO_E_QR_MESA.md)
- 💳 [04 — Checkout, Pagamento e Pix](./PUBLICO/04_CHECKOUT_PAGAMENTO_E_PIX.md)
- 👤 [05 — Perfil do Consumidor e Reservas](./PUBLICO/05_PERFIL_CONSUMIDOR_E_RESERVAS.md)

---

## 📱 5. Pilar 4: Aplicações auxiliares
A documentação consolidada do Garçom e Entregador está em `04_APLICACOES_AUXILIARES.md`; o mapa dos eApps do desktop está em `OS/03_APLICATIVOS_E_MODULOS.md`. Os documentos 00–02 abaixo são atalhos para essas fontes; o documento 03 cobre o consumidor.

- 📱 [00 — Arquitetura Mobile Android](./APPS_MOBILE/00_ARQUITETURA_MOBILE_ANDROID.md)
- 🛵 [01 — App Motorista e Entregador](./APPS_MOBILE/01_APP_MOTORISTA_ENTREGADOR.md)
- 🍽️ [02 — App Garçom e Salão](./APPS_MOBILE/02_APP_GARCOM_E_SALAO.md)
- 🛍️ [03 — App Consumidor Marketplace](./APPS_MOBILE/03_APP_CONSUMIDOR_MARKETPLACE.md)

---

## 🛡️ 6. Integração, Segurança e Testes
Contratos de comunicação, segurança Zero-Trust e resiliência offline.

- 🛡️ [05 — Segurança Zero-Trust, Testes & Maturidade](./05_SEGURANCA_TESTES_MATURIDADE.md)
- 🔄 [00 — Contrato de Comunicação HQ-OS](./INTEGRACAO/00_CONTRATO_HQ_OS.md)
- 💾 [01 — Modelo de Dados](./INTEGRACAO/01_MODELO_DE_DADOS.md)
- 📡 [02 — API e Eventos](./INTEGRACAO/02_API_E_EVENTOS.md)
- 🛡️ [03 — Segurança Multi-Tenant](./INTEGRACAO/03_SEGURANCA_MULTITENANT.md)
- 🧪 [04 — Testes e Recuperação](./INTEGRACAO/04_TESTES_E_RECUPERACAO.md)
- ☁️ [Pilar 7 — Núcleo Backend, Offline e Segurança](./PILAR_7_NUCLEO_BACKEND_OFFLINE_E_SEGURANCA.md)

---

## 📖 7. Manuais de Operação
Os manuais dos apps de entregador e garçom apontam para as fontes consolidadas e não repetem especificações antigas.

- 🛍️ [Manual do Consumidor](./MANUAL_APP_CONSUMIDOR.md)
- 🛵 [Manual do App do Entregador](./MANUAL_APP_ENTREGADOR.md)
- 🍽️ [Manual do App do Garçom](./MANUAL_APP_GARCOM.md)
- 💡 [Guia de Pilares e Matriz Real vs Simulação](../PILAR_E_MODO_GUIA.md)
