# 📜 06 — Histórico de Decisões Técnicas, Correções & Migrações

## 📌 Finalidade deste Documento

Este arquivo preserva o **histórico de evolução técnica e correções de bugs** realizadas ao longo do desenvolvimento do projeto 3EATCRU.

> 🚨 **AVISO DE USO:**
> Este documento representa um **registro histórico de auditoria**. O estado atual e vigência arquitetural da aplicação devem ser consultados nos documentos `00_ARQUITETURA_GERAL.md` a `05_SEGURANCA_TESTES_MATURIDADE.md`.

---

## 🛠️ Histórico de Bugs Relevantes Solucionados

### 1. Prevenção de Contaminação Financeira em Pagamentos de Simulação
- **Problema**: Transações processadas em modo sandbox ou simulador TEF corriam o risco de gerar lançamentos financeiros não marcados como simulados no DRE.
- **Solução**: Atualizado o `payments.router.ts` e o `commerce.engine.ts` para que transações em sandbox forcem estritamente a atualização de `order.isSimulated = true` e `order.mode = 'simulation'`, garantindo que os lançamentos contábeis sejam classificados como simulação.

### 2. Confirmação Atômica de Transações
- **Problema**: A confirmação de transações pendentes (`POST /api/payments/:id/confirm`) atualizava o registro de pagamento e o pedido em chamadas separadas.
- **Solução**: Agrupada a atualização em uma transação atômica do Firestore (`adminDb.runTransaction`), impedindo estados inconsistentes onde o pagamento ficava aprovado mas o pedido permanecia pendente.

### 3. Redirecionamento da Rota de Marketplace
- **Problema**: Documentos antigos apontavam para `/marketplace` como rota primária.
- **Solução**: Estabelecido `/home` como a rota oficial do Marketplace Regional, mantendo o redirecionamento automático de `/marketplace` para `/home`.

### 4. Criação e Reconciliação dos Documentos do Ecossistema
- **Problema**: Links apontavam para arquivos markdown inexistentes dentro do diretório `/docs/`.
- **Solução**: Reorganizada toda a estrutura documental em 6 guias principais estruturados (`00_ARQUITETURA_GERAL` até `05_SEGURANCA_TESTES_MATURIDADE`), criando alias simbólicos para compatibilidade com links legados.
