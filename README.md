# 3EATCRU — Ecossistema Comercial Omnichannel, ERP, POS & HQ Central

Plataforma Comercial SaaS Multi-Tenant para o Ecossistema Gastronômico e Varejo organizada em **3 Grandes Ambientes de Produto**, **Módulos Auxiliares Especializados (PWAs)** e **Infraestrutura Transacional Compartilhada**.

---

## 🏛️ Os 3 Ambientes de Produto & Módulos Auxiliares

1. **Ambiente 1 — HQ Central (`/hq`)**: Gabinete executivo do Dono da Plataforma (`hq_admin`), planos SaaS, comissão de 8%, gestão de lojas e frota MDM.
2. **Ambiente 2 — Store OS Lojista (`/os`, `/pos`)**: Terminal de UMA unidade física (PDV Balcão, KDS, Mesas, Estoque NFe e DRE).
3. **Ambiente 3 — Público & Marketplace (`/home`, `/p/:id`)**: Portal de compras do consumidor regional, vitrines individuais e checkout.
4. **Módulos Auxiliares Especializados (PWAs)**:
   - **App do Garçom (`/waiter`)**: Operação de salão e comanda volante.
   - **App do Entregador (`/driver`)**: Logística de entregas e navegação GPS.
   - **Autoatendimento QR Code (`/p/:id?table=X`)**: Comanda de mesa via smartphone.

---

## 📚 Documentação Técnica por Módulo (`/docs/`)

- 📖 [**📑 ÍNDICE GERAL DE DOCUMENTAÇÃO**](./docs/00_INDICE_DOCUMENTACAO.md) (Navegue pelos manuais técnicos reais)
- 🏛️ [**01 — HQ Central (Governança SaaS)**](./docs/HQ/00_ARQUITETURA_HQ.md)
- 🏬 [**02 — Store OS Lojista (Desktop ERP & POS)**](./docs/OS/00_ARQUITETURA_OS.md)
- 🔗 [**03 — Integração & Contrato HQ <> OS**](./docs/INTEGRACAO/00_CONTRATO_HQ_OS.md)
- 🛡️ [**04 — Segurança, Testes & Maturidade (90 Testes Passando)**](./docs/05_SEGURANCA_TESTES_MATURIDADE.md)

---

## 🚀 Status do Projeto: **Multissegmento Ready**

Atualmente a plataforma suporta e valida nativamente os seguintes verticais de negócio:
- 🍕 **Food Service** (Mesas, KDS, Cardápio Digital)
- 📦 **Varejo Geral** (Leitor de Código de Barras, Estoque EAN-13)
- 💊 **Farmácia & Saúde** (Controle de Lotes e Validade)
- 🛠️ **Serviços Automotivos** (Ordem de Serviço e Placa de Veículo)

---

## 🛠️ Comandos de Desenvolvimento e Verificação

```bash
# Servidor unificado Angular 21 SSR + Express API na porta 3000
npm start

# Suíte completa de testes automatizados (90 testes aprovados em 10 arquivos)
npm test -- --watch=false

# Análise estática ESLint (0 erros)
npm run lint

# Verificação completa (lint + testes)
npm run check
```
