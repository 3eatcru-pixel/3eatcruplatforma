# Reconciliação Arquitetural e Técnica — 3EATCRU Plataforma

Este plano detalha a rodada de correções direcionadas para unificar a documentação com o código real, consolidar a hierarquia de produto e resolver as inconsistências técnicas em pagamentos e segurança apontadas na auditoria.

### Decisões Críticas e Revisão do Usuário

> [!IMPORTANT] As escolhas abaixo foram confirmadas via Phase 1 e regem as correções técnicas deste turno.

- **Classificação PIX**: O PIX será classificado como `live` caso existam chaves de provedores (Stripe/MP) configuradas, operando em modo de confirmação manual autoritativa.
- **Fluxo de Confirmação**: A conclusão do pedido e o lançamento financeiro permanecerão como processos subsequentes à confirmação do pagamento, permitindo reconciliação assíncrona.
- **Fonte da Verdade Super Admin**: A lista de e-mails será restrita a `3eatcru@gmail.com` e `marcelokbite@gmail.com`.
- **Reconciliação de Documentos**: Os documentos serão atualizados para refletir as regras e coleções atuais do Firestore, garantindo precisão técnica imediata.

---

## 1. Visão Geral e Conceito Core

- **O que faz**: Consolida a plataforma 3EATCRU em uma hierarquia de **3 Ambientes de Produto** (HQ Central, Store OS e Marketplace Público), suportados por módulos auxiliares resilientes.
- **Valor Chave**: Elimina a dívida técnica de documentação e garante que o sistema de pagamentos diferencie corretamente chaves de teste (`sk_test_`) de produção (`sk_live_`), protegendo a integridade financeira do DRE.

---

## 2. Experiência do Usuário e Design Visual

### Hierarquia de Ambientes
O guia `PILAR_E_MODO_GUIA.md` será totalmente reescrito para abandonar a visão de "7 pilares independentes" em favor de:
1. **Ambiente 1: HQ Central (`/hq`)** - Governança SaaS.
2. **Ambiente 2: Store OS (`/os`, `/pos`)** - Operação de Unidade.
3. **Ambiente 3: Público (`/home`, `/p/:id`)** - Experiência do Consumidor.
4. **Módulos Auxiliares** - PWAs especializadas (Garçom e Entregador).

### Correção de Rotas e Navegação
- `ARCHITECTURE.md` será atualizado para listar rotas reais (`/home`, `/p/:id`, `/os`, `/hq`) e remover aliases históricos que não existem no `app.routes.ts`.

---

## 3. Principais Decisões de Produto e Trade-offs

- **Diferenciação de Chaves Stripe**:
    - *Abordagem*: O `payments.router.ts` verificará o prefixo `sk_live_` para determinar o modo real.
    - *Por que*: Evita que uma chave de teste configurada por engano contamine o ambiente de produção.
- **Reconciliação de Coleções**:
    - *Abordagem*: Sincronizar `docs/05_SEGURANCA_TESTES_MATURIDADE.md` com as 18 coleções reais presentes em `firestore.rules`.
    - *Por que*: Documentação técnica mentirosa é um risco de segurança e manutenção.

---

## 4. Arquitetura Técnica e Estratégia de Dados

### Diagrama de Fluxo de Pagamento (Revisado)

```text
┌──────────────┐      ┌────────────────┐      ┌─────────────────────┐
│ Interface UI │ ───> │ Payment Proxy  │ ───> │ Firestore Tx (Atom) │
└──────────────┘      │ (API Express)  │      │ (Pago & Tx Status)  │
                      └───────┬────────┘      └──────────┬──────────┘
                              │                          │
                              │                  ┌───────▼──────────┐
                              └────────────────> │ Processamento POS│
                                                 │ (Assíncrono/Final)│
                                                 └──────────────────┘
```

### Mudanças em Arquivos e Lógica

1.  **Segurança**:
    - Atualizar `BOOTSTRAPPED_SUPER_ADMIN_EMAILS` em `auth.middleware.ts` com o novo par de e-mails.
    - Sincronizar `security_spec.md` com a nova realidade.
2.  **Pagamentos**:
    - Refinar `getActivePspProvider()` para validar prefixos de chaves.
    - Garantir que `pm_card_visa` seja usado apenas em `sandbox`.
3.  **Documentação**:
    - Corrigir referências quebradas (ex: de `store-os.router.ts` para os roteadores específicos de domínio).
    - Renomear referências de testes para `store-os-api.service.spec.ts`.

---

## 5. Verificação e Qualidade

- **Build & Lint**: Execução de `npm run check` para garantir zero regressões.
- **Testes**: Execução de `npm run test:ci` para validar os 79 testes.
- **Relatório**: Os resultados reais serão registrados no documento de maturidade para comprovação de auditoria.
