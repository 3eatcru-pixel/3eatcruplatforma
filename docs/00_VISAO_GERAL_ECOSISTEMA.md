# 🌐 00 — Visão Geral do Ecossistema 3EATCRU

## 📌 1. Propósito e Fronteiras Arquiteturais

O ecossistema **3EATCRU** é uma plataforma comercial omnichannel SaaS desenhada para operar de forma híbrida (Web Desktop, Mobile PWA e Terminais Físicos de Ponto de Venda). A arquitetura é rigidamente segregada em **3 ambientes independentes**, garantindo que as responsabilidades operacionais e executivas jamais se sobreponham:

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AMBIENTE 1: HQ CENTRAL                                       │
│                                (Gabinete Executivo SaaS /hq)                                   │
│  Governança de Redes • Gestão de Tenants • Split de Taxas (8%) • Planos SaaS • MDM Global      │
└────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                         │ Contrato de Governança
                                         │ (Ativação, Licenças, Split & MDM)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  AMBIENTE 2: STORE OS LOJISTA                                  │
│                                 (Sistema Operacional /os, /pos)                                │
│  Desktop Multijanela • Catálogo de eApps Embutidos (PDV, KDS, Mesas, Estoque NFe, DRE Loja)    │
│  Operação com 100% de Autonomia Local (IndexedDB Outbox + Sync Determinístico)                 │
└────────────────────────────────────────┬───────────────────────────────────────────────────────┘
                                         │ Sincronização Operacional
                                         │ (Eventos de Cozinha, Despacho, Cardápio & Mesas)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           AMBIENTE 3: PÚBLICO, MARKETPLACE & AUXILIARES                        │
│                 (/marketplace, /loja/:slug, /waiter, /driver, /profile)                        │
│  Vitrine Consumidor • Checkout Pix/Cartão • App do Garçom (Comanda) • App do Entregador (GPS) │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏷️ 2. Distinção de Nomenclatura: Apps Externos vs eApps Embutidos

> 💡 **Regra de Arquitetura (Para Não Misturar Conceitos):**  
> No ecossistema 3EATCRU, o termo **"eApps" (Embedded OS Apps / Aplicativos Embutidos)** refere-se **exclusivamente aos módulos que rodam em janelas dentro do Store OS**. Eles recebem essa designação específica para que desenvolvedores, operadores e suporte técnico nunca os confundam com os **"Apps" Externos e Autônomos** do ecossistema.

| Nomenclatura | O que é | Onde roda | Exemplo de Telas |
|---|---|---|---|
| **Apps Externos / Móveis** | Aplicações web autônomas, instaláveis via PWA ou acessadas via URL direta em celulares e tablets. | Navegador mobile / PWA do colaborador ou consumidor. | **App do Garçom** (`/waiter`), **App do Entregador** (`/driver`), **App do Consumidor** (`/profile`, `/loja/:slug`), **Gabinete HQ** (`/hq`). |
| **eApps do Store OS** | Módulos embutidos que rodam como **janelas multitarefa** dentro do Desktop do Sistema Operacional da Loja (`/os`). | Desktop da Loja (`/os`, `/pos`) em monitores de balcão e totens. | **eApp PDV Caixa**, **eApp KDS Cozinha**, **eApp Mesas**, **eApp Estoque NFe**, **eApp DRE**, **eApp Hub Logística**. |

---

## 🧭 3. Taxonomia de Classificação de Maturidade

Cada funcionalidade, fluxo e contrato nesta documentação é classificado sob o padrão:

| Selo de Classificação | Significado Arquitetural | Critério de Validação |
|---|---|---|
| 🟢 **Implementado e comprovado** | Funcionalidade completa no código, persistência no banco e validada em testes automatizados. | Código localizado, transação ativa e asserção em teste passando. |
| 🟡 **Implementado parcialmente** | Interface ou fluxo implementado, porém com mock, validação em memória ou escopo simplificado. | Código existe no frontend/backend, mas depende de expansão. |
| 🔵 **Planejado, ainda não implementado** | Previsto no design ou modelo de dados, mas sem endpoint ou componente funcional. | Tipagem existe no modelo, mas falta rota ou interface. |
| ⚪ **Não localizado no código** | Mencionado em especificações externas, mas inexistente no repositório. | Ausência de arquivos, serviços ou menções no código. |
| 🔴 **Inconsistente ou com defeito** | Comportamento em desacordo com as regras de negócio ou com vulnerabilidade técnica. | Teste falha ou regra permite estado inválido. |

---

## 🔍 4. As Quatro Perspectivas de Análise por Módulo

1. **O que deveria fazer (Responsabilidade Funcional):** Objetivo de negócio, atores envolvidos e expectativas do usuário.
2. **Como foi implementado (Realidade do Código):** Mapeamento preciso de arquivos `.ts`, componentes standalone Angular 21, rotas Express 5, coleções do Cloud Firestore e esquemas de dados.
3. **Como se conecta (Topologia de Integração):** Parâmetros de entrada, cabeçalhos (`Authorization`, `X-Idempotency-Key`), respostas HTTP, permissões RBAC (`ROLE_PERMISSION_MATRIX`) e dependências intermodulares.
4. **Como foi validado (Comprovação Empírica):** Cobertura por testes automatizados (`vitest`), testes de concorrência (`commerce_war_tests.spec.ts`), regras de segurança (`firestore.rules`) e pendências conhecidas.

---

## 🏗️ 5. Mapa Geral de Componentes e Diretórios

```text
/docs/
├── 00_VISAO_GERAL_ECOSISTEMA.md            <-- Este documento
├── HQ/                                      <-- Governança Executiva SaaS
│   ├── 00_ARQUITETURA_HQ.md
│   ├── 01_EMPRESAS_E_TENANTS.md
│   ├── 02_CONTAS_E_PERMISSOES.md
│   ├── 03_PLANOS_LICENCAS_E_ASSINATURAS.md
│   ├── 04_PAGAMENTOS_E_COBRANCA.md
│   ├── 05_DISPOSITIVOS_E_ATIVACAO.md
│   └── 06_OPERACOES_E_AUDITORIA.md
├── OS/                                      <-- Sistema Operacional da Loja & eApps
│   ├── 00_ARQUITETURA_OS.md
│   ├── 01_IDENTIDADE_E_ACESSOS.md
│   ├── 02_EMPRESAS_E_FILIAIS.md
│   ├── 03_APLICATIVOS_E_MODULOS.md          <-- Catálogo de eApps Embutidos
│   ├── 04_PDV_E_OPERACOES.md
│   ├── 05_ESTOQUE_E_PRODUTOS.md
│   ├── 06_FINANCEIRO.md
│   ├── 07_PEDIDOS_E_ATENDIMENTO.md
│   ├── 08_DISPOSITIVOS_E_PERIFERICOS.md
│   └── 09_PERSISTENCIA_E_SINCRONIZACAO.md
├── PUBLICO/                                 <-- Espaços Públicos, Marketplace & Autoatendimento
│   ├── 00_ARQUITETURA_PUBLICO.md
│   ├── 01_MARKETPLACE_REGIONAL.md
│   ├── 02_VITRINE_LOJA_E_CARDAPIO.md
│   ├── 03_AUTOATENDIMENTO_E_QR_MESA.md
│   ├── 04_CHECKOUT_PAGAMENTO_E_PIX.md
│   └── 05_PERFIL_CONSUMIDOR_E_RESERVAS.md
├── APPS_MOBILE/                             <-- Aplicações Móveis Android & PWA Nativo
│   ├── 00_ARQUITETURA_MOBILE_ANDROID.md
│   ├── 01_APP_MOTORISTA_ENTREGADOR.md
│   ├── 02_APP_GARCOM_E_SALAO.md
│   └── 03_APP_CONSUMIDOR_MARKETPLACE.md
└── INTEGRACAO/                              <-- Contratos, Segurança e Concorrência
    ├── 00_CONTRATO_HQ_OS.md
    ├── 01_MODELO_DE_DADOS.md
    ├── 02_API_E_EVENTOS.md
    ├── 03_SEGURANCA_MULTITENANT.md
    └── 04_TESTES_E_RECUPERACAO.md
```
