# 🏛️ 00 — Arquitetura Geral do Ecossistema 3EATCRU

## 🌐 Visão Global da Plataforma

A plataforma **3EATCRU** é um ecossistema comercial multi-tenant com frontend Angular e APIs Express/Firebase. Esta visão descreve os domínios do produto; inventário de módulos, eApps conectados e limites de execução estão nas fontes consolidadas de [Store OS](./OS/03_APLICATIVOS_E_MODULOS.md) e [Aplicações Auxiliares](./04_APLICACOES_AUXILIARES.md).

---

## 🏗️ As 3 Camadas de Produto & Módulos Auxiliares

Em nível de produto, a plataforma se organiza em **3 ambientes**, complementados por **rotas web auxiliares** e suportados pela **infraestrutura transacional compartilhada**. O diagrama é um mapa de domínios, não uma declaração de que todos os módulos estão integrados:

```text
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                              1. HQ CENTRAL                                      │
 │ Rota: /hq | Role: hq_admin                                                      │
 │ • Governança de tenants e planos     • Comissão de entregas em breve        │
 │ • Inventário de dispositivos         • Configuração regional e auditoria     │
 └──────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
 ┌───────────▼─────────────────────────┐               ┌───────────▼─────────────────────────┐
 │ 2. STORE OS LOJISTA                 │               │ 3. PÚBLICO & MARKETPLACE            │
 │ Rota: /os, /pos | Role: tenant_staff│               │ Rota: /home, /p/:id | Role: consumer│
 │ • PDV Balcão & Frente de Caixa      │               │ • Marketplace Regional de Lojas     │
 │ • IDs de módulos; estado no mapa OS │               │ • Vitrine Individual & QR Mesa      │
 │ • Estoque NFe & DRE Financeiro      │               │ • Checkout Delivery & Takeout       │
 └───────────┬─────────────────────────┘               └───────────┬─────────────────────────┘
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        │
 ┌──────────────────────────────────────▼──────────────────────────────────────────┐
 │ ROTAS WEB AUXILIARES                                                            │
 │ • App do Garçom (/waiter) — Mesas, registro de pedidos e consulta de status     │
 │ • App do Entregador (/driver) — Rotas, baixa e prévia visual na simulação       │
 └──────────────────────────────────────┬──────────────────────────────────────────┘
                                        │
 ┌──────────────────────────────────────▼──────────────────────────────────────────┐
 │ BACKEND, PERSISTÊNCIA E CONTROLES DE ACESSO                                     │
 │ • API Express (/api/*)              • Contratos Compartilhados (src/shared/)   │
 │ • Firestore e fluxos de sincronização por módulo                                │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Contratos Compartilhados (`src/shared/`)

Toda a tipagem e modelos de dados transacionais residem em `src/shared/models/ecosystem.model.ts`, permitindo que o frontend Angular e o backend Express utilizem os mesmos contratos sem duplicar interfaces:

- `OrderTransaction`: Estrutura canônica do pedido (itens, impostos, canal, modo real vs simulação, geolocalização e entregador atribuído).
- `PaymentTransactionRecord`: Registro de transações financeiras com `environment: 'live' | 'sandbox'` e `mode: 'real' | 'simulation'`.
- `FinancialRecord`: Livro-razão contábil do DRE com classificação estrita de modo real vs simulação.
- `CompanyTenant`: Cadastro do estabelecimento com plano, limites e chave PIX.

---

## ⚡ Fluxo de Liquidação Financeira: Confirmação vs Lançamento

A plataforma separa rigorosamente a **Autorização de Pagamento** do **Lançamento no Livro-Razão (DRE)**. Este processo ocorre em 4 estágios autoritativos:

1.  **Iniciação de Pagamento (`Initiation`)**: Ocorre no `payments.router.ts`. Um `PaymentTransactionRecord` é gerado como `pending_pix` ou enviado para o gateway (Stripe/MP). O pedido (`OrderTransaction`) recebe o ID desta transação, mas permanece com `paymentStatus: 'pending'`.
2.  **Aprovação do Gateway/Operador (`Approval`)**: O gateway confirma o sucesso (Live) ou o operador do PDV/HQ confirma o recebimento físico (Cash/Pix). A transação passa para `status: 'approved'`.
3.  **Transição de Status do Pedido (`Order Transition`)**: Uma vez aprovado o pagamento, o motor comercial (`commerce.engine.ts`) transiciona o status do pedido para `completed` (ou `dispatched` em delivery).
4.  **Assentamento Financeiro (`Financial Settlement`)**: **APENAS** quando o pedido atinge o status `completed`, o sistema gera automaticamente um `FinancialRecord` na coleção `financials`. Este registro é a base do DRE e é marcado permanentemente com o `mode` herdado do pedido (Real vs Simulação).

---

## 🏛️ Matriz de Ambientes vs Modos de Execução

É CRITICAL não confundir **Ambientes de Produto** com **Modos de Execução**.

### 1. Ambientes de Produto (Onde você está)
- **HQ Central (`/hq`)**: Governança de tenants e planos, configuração “Em breve” para a futura comissão da rede de entregadores, inventário e auditoria estrutural.
- **Store OS (`/os`, `/pos`)**: Operação da Loja (Caixa, Cozinha, Estoque).
- **Marketplace & Público (`/home`, `/p/:id`)**: Descoberta, Cardápio e Compra pelo Consumidor.

### 2. Modos de Execução (Como os dados são tratados)
- **🟢 MODO REAL**: Conecta ao Firestore Produção, usa Firebase Auth real e Gateways Live.
- **🧪 MODO SIMULAÇÃO**: Usa dados em memória, Auth simulado e Simulador de Pagamentos.

| Dimensão | 🟢 MODO REAL (PRODUÇÃO) | 🧪 MODO SIMULAÇÃO (SANDBOX) |
|---|---|---|
| **Persistência** | Google Cloud Firestore Live | Memória volátil e `sessionStorage` |
| **Autenticação** | Firebase Auth (Tokens JWT verificados) | Sessão mock injetada (`simulated-token`) |
| **Pagamentos** | Adquirente Live (Stripe/MP) ou Caixa Conferido | Simulador TEF/Sandbox com aviso explicativo |
| **Finanças (DRE)** | Entradas contábeis definitivas (`isSimulated: false`) | Lançamentos de teste (`isSimulated: true`) |
| **Badge na Tela** | `[🟢 MODO REAL (PRODUÇÃO)]` verde | `[🧪 MODO SIMULAÇÃO (SANDBOX)]` âmbar |

---

## Segurança e autorização

A autorização é aplicada por rota no servidor, com Firebase ID Tokens, middlewares de papel/tenant e regras de acesso do Firestore. As garantias variam por endpoint e coleção; este documento não afirma isolamento universal nem certificação integral. Consulte os manuais de segurança e valide cada fluxo nas fontes correspondentes.

---

## 📚 Mapa da documentação por módulo (5 núcleos, 32 arquivos)

Consulte os manuais modulares para responsabilidades, fontes de implementação, integrações e limites observados. Cada documento identifica sua própria situação de validação:

| Núcleo de Documentação | Diretório | Escopo Principal |
|---|---|---|
| **1. HQ Central — Governança** | [`docs/HQ/`](./HQ/) | 7 manuais sobre tenants, identidade, planos cadastrados, futura comissão da plataforma, inventário e operações do HQ. |
| **2. Store OS — Operação da Loja** | [`docs/OS/`](./OS/) | 10 manuais (`00_ARQUITETURA_OS.md` a `09_PERSISTENCIA_E_SINCRONIZACAO.md`) sobre as superfícies e dados do lojista. |
| **3. Espaços Públicos & Marketplace** | [`docs/PUBLICO/`](./PUBLICO/) | 6 manuais (`00_ARQUITETURA_PUBLICO.md` a `05_PERFIL_CONSUMIDOR_E_RESERVAS.md`) sobre marketplace, vitrines e jornadas públicas. |
| **4. Aplicações auxiliares** | [`docs/APPS_MOBILE/`](./APPS_MOBILE/) | 4 manuais sobre escopo e fluxos móveis. A existência de um manual não comprova pacote nativo ou integração de sensores. |
| **5. Contrato e Integração Transversal** | [`docs/INTEGRACAO/`](./INTEGRACAO/) | 5 manuais sobre modelo de dados, APIs, segurança multitenant e recuperação. Os números de coleções, rotas e cenários devem ser conferidos no código atual. |

