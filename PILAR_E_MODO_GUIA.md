# 🏛️ 3EATCRU — GUIA DEFINITIVO DE AMBIENTES & MATRIZ REAL VS SIMULAÇÃO

Este documento estabelece as **diretrizes inquebráveis** de separação arquitetural e modos de execução da plataforma 3EATCRU. Nenhuma implementação, modificação ou resposta de IA pode violar ou misturar estes conceitos.

---

## ⚡ SEÇÃO 1: MATRIZ DE EXECUÇÃO — MODO REAL vs MODO SIMULAÇÃO

| Critério | 🟢 MODO REAL (PRODUÇÃO & LIVE) | 🧪 MODO SIMULAÇÃO (SANDBOX & DEMO) |
|---|---|---|
| **Base de Dados** | **Google Cloud Firestore Live** | Memória volátil + `sessionStorage` temporário |
| **Autenticação** | **Firebase Auth** (JWT real validado no servidor) | Sessão mock injetada (`simulated-token`) |
| **Pagamentos** | Gateways Live (Stripe sk_live_ / MP APP_USR-) | Simuladores TEF e PIX Sandbox |
| **DRE Financeiro** | Lançamentos reais (`isSimulated: false`) | Lançamentos de teste (`isSimulated: true`) |
| **Indicação Visual**| **Badge verde [🟢 MODO REAL]** | **Badge âmbar [🧪 MODO SIMULAÇÃO]** |

---

## 🏛️ SEÇÃO 2: HIERARQUIA DE PRODUTO (OS 3 AMBIENTES)

A plataforma 3EATCRU é organizada em **3 Ambientes Principais**, suportados por **Módulos Auxiliares** e uma **Infraestrutura Transacional**.

```text
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                      AMBIENTE 1: HQ CENTRAL (GABINETE SAAS)                     │
 │ Rota: /hq | Role: hq_admin                                                      │
 │ • Governança SaaS Multi-Tenant        • Taxa de Split de 8% da Franqueadora     │
 │ • Planos Pro / Enterprise             • Gestão de Frota MDM & Auditoria Master  │
 └──────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
 ┌───────────▼─────────────────────────┐               ┌───────────▼─────────────────────────┐
 │ AMBIENTE 2: STORE OS LOJISTA        │               │ AMBIENTE 3: PÚBLICO & MARKETPLACE   │
 │ Rota: /os, /pos | Role: tenant_staff│               │ Rota: /home, /p/:id | Role: consumer│
 │ • PDV Balcão & Frente de Caixa      │               │ • Marketplace Regional de Lojas     │
 │ • KDS Cozinha & Mapa de Mesas       │               │ • Vitrine Individual & QR Mesa      │
 │ • Estoque NFe & DRE Financeiro      │               │ • Checkout Delivery & Takeout       │
 └───────────┬─────────────────────────┘               └─────────────────────────────────────┘
             │
 ┌───────────▼─────────────────────────────────────────────────────────────────────┐
 │ MÓDULOS AUXILIARES ESPECIALIZADOS (PWAs Web Mobile)                             │
 │ • App do Garçom (/waiter) — Operação de Salão & Comandas nos 3 Tempos           │
 │ • App do Entregador (/driver) — Logística, Aceite de Rotas & Baixa de Entregas  │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

### Tabela Comparativa Estrita

| Ambiente | Rota Primária | Público-Alvo | O QUE FAZ (Responsabilidades) | ❌ O QUE NÃO FAZ (Fronteiras) |
|---|---|---|---|---|
| **HQ Central** | `/hq` | Franqueador | Governa o ecossistema SaaS global. | **NÃO É UMA LOJA!** Não vende produtos nem opera mesas. |
| **Store OS** | `/os`, `/pos` | Lojista | Operação desktop de **UMA unidade**. | **NÃO É O HQ CENTRAL!** Não altera taxas globais. |
| **Público** | `/home`, `/p/:id` | Consumidor | Compra regional e cardápio digital. | **NÃO É PAINEL DO LOJISTA!** Não vê lucros nem estoque. |
| **Auxiliares** | `/waiter`, `/driver` | Staff Móvel | Atendimento de mesa e logística. | **LIMITAÇÃO DE ESCOPO!** Sem acesso a financials. |

---

## 🎯 RESUMO DE OURO

1. **Governança SaaS, auditoria e split?** 👉 **HQ Central (`/hq`)**.
2. **Caixa, cozinha, mesas e DRE da loja?** 👉 **Store OS (`/os`)** ou **PDV (`/pos`)**.
3. **Comprar, pedir delivery ou ver cardápio?** 👉 **Marketplace (`/home`)** ou **Vitrine (`/p/:id`)**.
4. **Staff em campo (salão/rua)?** 👉 **Apps Auxiliares (`/waiter`, `/driver`)**.
