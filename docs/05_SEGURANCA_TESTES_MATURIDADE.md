# 🛡️ 05 — Segurança Zero-Trust, Testes & Maturidade Operacional

## 📌 Especificação de Segurança Zero-Trust

A plataforma implementa segurança em camadas com validação criptográfica no servidor Express (`auth.middleware.ts`) e controle de acesso em nível de banco de dados (`firestore.rules`).

### As 18 Coleções e Isolamento Multi-Tenant

| Coleção | Acesso Público | Escopo de Leitura / Escrita |
|---|---|---|
| `admins` | ❌ Privado | Registro de Super Admins da plataforma |
| `users` | ❌ Privado | Perfis RBAC (leitura própria ou HQ Admin) |
| `hq_settings` | ❌ Privado | Configurações globais (manutenção, taxa split) |
| `public_regional` | 🟢 Público | Banners e metadados regionais do Marketplace |
| `plans` | 🟢 Público | Listagem de planos SaaS disponíveis |
| `tenants` | Leitura (lojas abertas) | Dados do estabelecimento (privado ao staff/owner) |
| `products` | ❌ Privado do ERP | Catálogo interno com custos e estoque real |
| `public_catalog` | 🟢 Público | Projeção sanitizada de produtos para venda online |
| `orders` | ❌ Privado | Pedidos Omnichannel (Staff, Entregador ou Cliente) |
| `payment_transactions` | ❌ Privado | Transações autoritativas (confirmadas via backend) |
| `tables` | ❌ Privado do OS | Mapa de mesas e comandas em tempo real |
| `financials` | ❌ Privado | Livro-razão contábil (DRE) da unidade |
| `delivery_routes` | ❌ Privado | Malha logística (Entregador atribuído ou Staff) |
| `drivers` | ❌ Privado | Perfis e telemetria de entregadores registrados |
| `devices` | ❌ Privado | Gestão de hardware MDM |
| `audit_logs` | ❌ Privado | Trilhas de auditoria imutáveis |
| `consumers` | ❌ Privado | Cadastro PII de clientes finais |
| `reservations` | ❌ Privado | Gestão de reservas e fila de espera |

---

## 🔑 Reconciliação dos E-mails de Super Admin Bootstrap

Para evitar divergências, os seguintes e-mails estão cadastrados no `auth.middleware.ts` e validados via `email_verified: true`:
- `3eatcru@gmail.com`
- `marcelokbite@gmail.com`

---

## 🧪 Matriz de Maturidade de Testes Automatizados

A suíte de testes unitários e de integração roda via Vitest / Angular Testbed (`npm run test:ci`).

### Classificação de Evidências de Teste

| Suíte de Testes | Arquivo de Teste | Status de Execução | Cobertura Validada |
|---|---|---|---|
| **Cenários de Negócio Multissegmento** | `src/server/multisegment_business_scenarios.spec.ts` | 🟢 **PASS** | Food Service, Varejo EAN-13, Farmácia com Lotes, Serviços Automotivos O.S., Blindagem Anti-Fraude e Outbox Offline |
| **Segurança e Middleware** | `src/server/security_phase1.spec.ts` | 🟢 **PASS** | Verificação de tokens JWT e isolamento de pilar |
| **Motor Comercial & Bateria de Guerra** | `src/server/commerce_war_tests.spec.ts` | 🟢 **PASS** | Idempotência e proteção contra corrida concorrente |
| **Serviço do Ecossistema Frontend** | `src/app/services/ecosystem.service.spec.ts` | 🟢 **PASS** | Transição de modos real/simulação e sinais de estado |
| **API do HQ Central** | `src/app/services/hq-api.service.spec.ts` | 🟢 **PASS** | Provisionamento de lojas e comandos MDM |
| **API do Store OS** | `src/app/services/store-os-api.service.spec.ts` | 🟢 **PASS** | Fechamento de caixa, KDS e mapa de mesas |
| **Google Drive / Backups** | `src/app/core/google-drive/google-drive.service.spec.ts` | 🟢 **PASS** | Backup de resiliência e exportação |
| **Resiliência Offline** | `src/app/core/offline/offline-resilience.spec.ts` | 🟢 **PASS** | Fila outbox IndexedDB em falhas de rede |
| **Rotas e API Server** | `src/server/api.spec.ts` | 🟢 **PASS** | Endpoints de saúde e diagnóstico |
| **Componente Principal** | `src/app/app.spec.ts` | 🟢 **PASS** | Renderização inicial e inicialização dos serviços |

**Resultado Geral da Suíte:** **90 testes aprovados em 10 arquivos (100% de sucesso).** (Execute `npm test -- --watch=false` para verificação contínua).

