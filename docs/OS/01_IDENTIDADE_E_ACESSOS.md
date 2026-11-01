# 🏬 Store OS — 01: Identidade, Acessos, Sessões e PIN de Segurança

## 📌 1. Visão Geral da Identidade no Ponto de Atendimento

Na unidade física da loja, os terminais de atendimento (PDVs e KDSs) são frequentemente operados por diferentes funcionários durante o expediente (caixas, estoquistas, garçons e gerentes). O Store OS combina a **autenticação primária de sessão empresarial (Firebase Auth + Token JWT)** com um **mecanismo de bloqueio operacional por PIN numérico na tela (Lock Screen)**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   1. SESSÃO MESTRE DO TERMINAL                         │
│   Autenticação via /api/auth/register-merchant ou login lojista        │
│   Token anexado nas requisições HTTP: Bearer <ID_TOKEN>                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 2. BLOQUEIO OPERACIONAL POR INATIVIDADE                │
│   Botão 'Bloquear' na Taskbar ou Timeout de Ociosidade                 │
│   Exibe componente app-os-lock-screen em tela cheia                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   3. DESBLOQUEIO RÁPIDO VIA PIN                        │
│   Operador digita o código numérico no teclado touchscreen             │
│   Validação do PIN -> Liberação imediata do Workspace                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Permitir que cada loja cadastre seus funcionários internos (gerentes, caixas, garçons e estoquistas) com cargos e permissões específicas.
- Permitir que um terminal fique permanentemente autenticado no escopo da loja, mas protegido por uma tela de bloqueio quando o operador se ausenta.
- Suportar um PIN de 6 dígitos para troca rápida de operador de caixa, identificando no comprovante de venda quem realizou o atendimento.
- Impedir que operadores de salão (ex: garçons) abram janelas restritas como o DRE Financeiro ou configurações fiscais.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Gestão de Equipe e Papéis no Servidor:**
  - Endpoint `POST /api/auth/assign-role` (`src/server/routes/auth.router.ts:306`).
  - Permite ao gestor da loja (`isTenantManagerRole(caller.role)`) atribuir os papéis `'operator'`, `'waiter'` e `'driver'` exclusivamente para usuários de sua própria unidade (`requestedTenantId === caller.tenantId`).
  - O `targetUid` é anexado ao array `staffUids` do tenant no Firestore.
- **Controle de Acesso:**
  - As janelas de Finanças e Admin Hub não estão integradas ao desktop; seus IDs mostram placeholder (ver `03_APLICATIVOS_E_MODULOS.md`). Endpoints financeiros aplicam autorização no servidor.
  - Garçons acessam o aplicativo de salão pela rota separada `/waiter`.
- **Tela de Bloqueio por PIN:**
  - Componente: `src/app/components/os/lock-screen.ts`.
  - Exibe relógio digital, data, nome da loja e o nome do operador ativo.
  - Possui teclado numérico virtual com botões de 0 a 9, botão Limpar e botão Desbloquear.
  - Implementação atual no código:
    ```typescript
    appendPin(digit: number) {
      if (this.pin().length < 4) {
        this.pin.update(p => p + digit);
        if (this.pin().length === 4) {
          this.submitPin();
        }
      }
    }
    ```
    O código atual valida 4 dígitos numéricos (com valor de demonstração '1234') e emite o evento `unlocked` para o desktop pai.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Operador clica no ícone de cadeado na barra de tarefas (`src/app/components/os/taskbar.ts`) ou aciona atalho de bloqueio.
- **Comunicação com o Backend:**
  - As vendas realizadas no PDV carregam o operador logado no campo `operatorName` ou `createdByUid`.
  - Na rota `/api/financials`, caso um garçom tente registrar movimentação financeira avulsa, o servidor responde com `403 Forbidden`.

### Perspectiva 4: Validação

Este documento descreve o código encontrado. A suíte de testes não foi executada nesta revisão, portanto não há resultado de homologação declarado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Recurso de Identidade / Sessão | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Autenticação Lojista via Bearer Token | 🟢 **Implementado e comprovado** | `src/app/interceptors/auth.interceptor.ts` | Anexa ID Token em 100% das chamadas HTTP. |
| Cadastro de Funcionários da Loja (`assign-role`) | 🟢 **Implementado e comprovado** | `src/server/routes/auth.router.ts:306` | Gestor associa operadores ao seu `staffUids`. |
| Bloqueio Visual do Desktop (`app-os-lock-screen`) | 🟢 **Implementado e comprovado** | `src/app/components/os/lock-screen.ts` | Oculta a área de trabalho e exige inserção de código numérico. |
| Teclado Virtual Numérico Integrado | 🟢 **Implementado e comprovado** | `src/app/components/os/lock-screen.ts:60` | Compatível com monitores touchscreen e mouse. |
| Validação visual de PIN de 4 dígitos | 🔵 **Demonstração local** | `src/app/components/os/lock-screen.ts` | A tela valida o valor de demonstração `1234`; não é autenticação forte nem PIN persistido por usuário. |
| Armazenamento de PIN Criptografado por Operador no Firestore | 🔵 **Planejado, ainda não implementado** | `src/shared/models/ecosystem.model.ts` | O PIN atual é validado no componente de interface; hash seguro de PIN por colaborador está desenhado no backlog. |
