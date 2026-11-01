# 🏛️ 3EATCRU — Arquitetura Consolidada da Plataforma (V8.0)

> 🚨 **DIRETRIZ MESTRE OBRIGATÓRIA — HIERARQUIA & LIMITES DE PRODUTO:**
> Consulte o [**Guia Definitivo dos Pilares & Matriz Real vs Simulação (PILAR_E_MODO_GUIA.md)**](./PILAR_E_MODO_GUIA.md).
>
> 1. **OS 3 GRANDES AMBIENTES DO PRODUTO**:
>    - **Ambiente 1 — HQ Central (`/hq`)**: Gabinete executivo da franqueadora SaaS. Governa todas as lojas, split de 8% e planos. NÃO é loja e NÃO opera PDV.
>    - **Ambiente 2 — Store OS Lojista (`/os`, `/pos`)**: Terminal de UMA unidade física (PDV Balcão, KDS, Mesas, Estoque NFe, DRE). NÃO é HQ e NÃO é Marketplace.
>    - **Ambiente 3 — Público & Marketplace (`/home`, `/p/:id`)**: Portal de compras e cardápios para clientes consumidores. NÃO é painel de lojista.
>
> 2. **MÓDULOS AUXILIARES ESPECIALIZADOS (PWAs Web Mobile)**:
>    - **App do Garçom (`/waiter`)**: Operação de salão e comanda em 3 tempos.
>    - **App do Entregador (`/driver`)**: Logística de entrega e navegação GPS.
>    - **Autoatendimento QR Code (`/p/:id?table=X`)**: Comanda de mesa no smartphone do cliente.
>
> 3. **INFRAESTRUTURA TRANSACIONAL COMPARTILHADA**:
>    - **Express 5 Backend (`/api/*`)**, Cloud Firestore Live (18 coleções Zero-Trust) e Outbox Offline.

---

## 📚 Documentação Técnica por Módulo (`/docs/`)

- 🏛️ [**00 — Arquitetura Geral do Ecossistema**](./docs/00_ARQUITETURA_GERAL.md)
- 🏢 [**01 — HQ Central (Gabinete Executivo SaaS)**](./docs/01_HQ_CENTRAL.md)
- 🏬 [**02 — Store OS Lojista (PDV, KDS & ERP)**](./docs/02_STORE_OS_LOJISTA.md)
- 🛍️ [**03 — Público & Marketplace Regional**](./docs/03_PUBLICO_E_MARKETPLACE.md)
- 📱 [**04 — Aplicações & Módulos Auxiliares (PWAs)**](./docs/04_APLICACOES_AUXILIARES.md)
- 🛡️ [**05 — Segurança Zero-Trust, Testes & Maturidade**](./docs/05_SEGURANCA_TESTES_MATURIDADE.md)
- 📜 [**06 — Histórico de Decisões Técnicas & Migrações**](./docs/06_HISTORICO_E_DECISOES.md)

---

## 🗺️ Mapeamento Canônico das Rotas Reais

| Ambiente / Módulo | Rota Real | Alias Implementado | Função Principal |
|---|---|---|---|
| **Público (Marketplace)** | `/home` | `/marketplace` | Descoberta geográfica de lojas e carrinho |
| **Público (Vitrine da Loja)** | `/p/:id` | — | Cardápio individual e autoatendimento QR |
| **Público (Login Consumidor)**| `/consumer/login` | — | Autenticação do cliente final |
| **Store OS (Lojista)** | `/os` | — | Painel de controle do estabelecimento |
| **Store OS (PDV Balcão)** | `/pos` | — | Frente de caixa e vendas presenciais |
| **HQ Central (Franqueador)** | `/hq` | — | Gabinete executivo da rede SaaS |
| **App Auxiliar Garçom** | `/waiter` | — | PWA para atendimento de mesa |
| **App Auxiliar Entregador** | `/driver` | — | PWA para aceite de corridas e GPS |

---

## ⚡ Matriz de Execução: Modo Real vs Modo Simulação

```text
               ┌────────────────────────────────────────────────────────┐
               │           SELETOR DE MODO DE EXECUÇÃO                  │
               └───────────────────────────┬────────────────────────────┘
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             │                                                           │
 ┌───────────▼──────────────────────────┐    ┌───────────────────────────▼───────────┐
 │ 🟢 MODO REAL (PRODUÇÃO & LIVE)       │    │ 🧪 MODO SIMULAÇÃO (SANDBOX DEMO)      │
 │ • Banco: Google Cloud Firestore Live │    │ • Banco: Memória Volátil / Session    │
 │ • Auth: Firebase Auth JWT Cripto     │    │ • Auth: Sessão Injetada ('sim-token') │
 │ • PSP: Stripe Live / Caixa Conferido │    │ • PSP: Simulador TEF Explicativo      │
 │ • DRE: isSimulated = false           │    │ • DRE: isSimulated = true             │
 └──────────────────────────────────────┘    └───────────────────────────────────────┘
```
