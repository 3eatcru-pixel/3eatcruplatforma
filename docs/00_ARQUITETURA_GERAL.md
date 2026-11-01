# 🏛️ 00 — Arquitetura Geral do Ecossistema 3EATCRU

## 🌐 Visão Global da Plataforma

A plataforma **3EATCRU** é um ecossistema comercial multi-tenant com frontend Angular e APIs Express/Firebase. Esta visão descreve os domínios do produto; inventário de módulos, eApps conectados e limites de execução estão nas fontes consolidadas de [Store OS](./OS/03_APLICATIVOS_E_MODULOS.md) e [Aplicações Auxiliares](./04_APLICACOES_AUXILIARES.md).

---

## 🏗️ As 3 Camadas de Produto & Módulos Auxiliares

Em nível de produto, a plataforma se organiza em **3 ambientes**, complementados por **rotas web auxiliares** e suportados pela **infraestrutura transacional compartilhada**. O diagrama é um mapa de domínios, não uma declaração de que todos os módulos estão integrados:

```text
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                      1. HQ CENTRAL (GABINETE EXEC-SAAS)                         │
 │ Rota: /hq | Role: hq_admin                                                      │
 │ • Governança SaaS Multi-Tenant        • Taxa de Split de 8% da Franqueadora    │
 │ • Planos Pro / Enterprise             • Gestão de Frota MDM & Terminais Hardware │
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
 │ INFRAESTRUTURA TRANSACIONAL & SEGURANÇA ZERO-TRUST                              │
 │ • Backend Express 5 (/api/*)         • Contratos Compartilhados (src/shared/)   │
 │ • Cloud Firestore Live (18 coleções) • Outbox Offline & Sincronização           │
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
- **HQ Central (`/hq`)**: Gestão SaaS, Auditoria Master, Split de Taxas.
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

## 🛡️ Segurança & Auditoria Zero-Trust

A plataforma opera sob um modelo de **Confiança Zero**:
- **HQ Admin** tem visão global, mas não pode operar mesas de uma loja sem auditoria.
- **Tenant Staff** é restrito ao seu `tenantId` e não pode ver dados da HQ ou de outras lojas.
Qualquer tentativa de cruzamento de dados (Cross-Tenant) é bloqueada tanto pelas `firestore.rules` quanto pela validação no `commerce.engine.ts`.

---

## 📚 Mapa da Documentação Técnica Profunda (5 Núcleos & 28 Manuais)

Para uma análise detalhada baseada no código real com as 4 perspectivas (Responsabilidade Funcional, Implementação Real, Conexões e Validação Empírica), consulte os manuais modulares:

| Núcleo de Documentação | Diretório | Escopo Principal |
|---|---|---|
| **1. HQ Central — Governança** | [`docs/HQ/`](./HQ/) | 7 manuais (`00_ARQUITETURA_HQ.md` a `06_OPERACOES_E_AUDITORIA.md`) cobrindo governança de tenants, planos, split 8%, MDM e auditoria. |
| **2. Store OS — Operação da Loja** | [`docs/OS/`](./OS/) | 10 manuais (`00_ARQUITETURA_OS.md` a `09_PERSISTENCIA_E_SINCRONIZACAO.md`); consulte `03_APLICATIVOS_E_MODULOS.md` para o estado verificado dos eApps. |
| **3. Espaços Públicos & Marketplace** | [`docs/PUBLICO/`](./PUBLICO/) | 6 manuais (`00_ARQUITETURA_PUBLICO.md` a `05_PERFIL_CONSUMIDOR_E_RESERVAS.md`) cobrindo praça regional, vitrine, takeout sem taxa, QR Mesa e Pix. |
| **4. Aplicações auxiliares** | [`docs/APPS_MOBILE/`](./APPS_MOBILE/) | Os documentos 00–02 apontam para as fontes consolidadas; não declaram instalação PWA, empacotamento nativo, câmera ou GPS em segundo plano sem evidência no código. |
| **5. Contrato e Integração Transversal** | [`docs/INTEGRACAO/`](./INTEGRACAO/) | 5 manuais (`00_CONTRATO_HQ_OS.md` a `04_TESTES_E_RECUPERACAO.md`) cobrindo regras de dados, 17 coleções Firestore, 12 rotas Express e suíte de testes de estresse. |

