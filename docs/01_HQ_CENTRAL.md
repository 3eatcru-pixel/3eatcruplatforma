# 🏛️ 01 — Ambiente 1: HQ Central (Gabinete Executivo SaaS)

## 📌 Visão Geral & Escopo

O **HQ Central (`/hq`)** é o gabinete executivo da franqueadora SaaS. É a superfície master da plataforma, voltada exclusivamente para o **Super Administrador (`hq_admin`)**.

> 🚨 **FRONTEIRA ESTRITA DE PRODUTO:**
> O HQ Central **NÃO É UMA LOJA**! Ele não possui frente de caixa (PDV), não opera mesas de restaurante, não recebe pedidos de delivery e não faz lançamentos de cozinha. Sua única função é a **governança executiva do ecossistema SaaS**.

---

## 🛠️ Principais Responsabilidades & Recursos

1. **Gestão de Tenants (Lojas)**:
   - Aprovação, bloqueio e suspensão de estabelecimentos franqueados.
   - Configuração do plano SaaS (Trial, Pro, Enterprise) e limites operacionais.
   - Provisionamento de novas lojas com status inicial fechado/trial.

2. **Split Contábil & Receita SaaS**:
   - Auditoria da comissão de **8%** retida pela plataforma em pedidos online.
   - Acompanhamento do Faturamento Bruto Acumulado (GMV) de toda a rede.

3. **Gestão de Frota & Hardware MDM**:
   - Monitoramento de dispositivos registrados (PDVs físicos, KDSs, Totens).
   - Envio de comandos remotos (ping, limpeza de cache, reinicialização).

4. **Simulador de Dispositivos e Homologação**:
   - Componente visual de emulação para testes rápidos de experiência em telas móveis e terminais.

---

## 🔒 Segurança e Permissões

- **Rota Primária**: `/hq`
- **Guarda de Rota**: `hqAdminGuard`
- **Permissão Exigida**: `hq:governance`
- **Mapeamento Backend**: `src/server/routes/hq.router.ts`
- **Acesso Restrito**: Exige e-mail verificado (`email_verified: true`) pertencente aos e-mails de bootstrap ou claim de `hq_admin`.
