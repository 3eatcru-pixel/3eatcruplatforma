# 🛍️ Público & Marketplace — 01: Marketplace Regional e Descoberta Georreferenciada

## 📌 1. Visão Geral da Praça de Estabelecimentos

O **Marketplace Regional (`/marketplace`)** é o portal público de compras e serviços da plataforma. Ele opera sob o conceito de **"Praça Regional"**, conectando os consumidores aos estabelecimentos comerciais de seu bairro ou cidade com base na localização geográfica e curadoria editorial do HQ Central.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      MARKETPLACE REGIONAL (/marketplace)               │
├────────────────────────────────────────────────────────────────────────┤
│  1. CURADORIA EDITORIAL DO HQ                                          │
│     Banner Hero da Região Ativa (ex: 'Grande São Paulo')               │
│     Destaques da Semana e Fichas Homologadas                           │
│                                                                        │
│  2. SISTEMA DE DESCOBERTA GEODÉSICA (GPS)                              │
│     Cálculo de Distância Euclidiana/Haversine em km ao Usuário         │
│     Filtro por Raio de Cobertura do Estabelecimento (deliveryRadiusKm) │
│                                                                        │
│  3. TRÊS MODOS DE VISUALIZAÇÃO INTERATIVA                              │
│     • Modo Fichário: Cards visuais modernos com fotos e tags           │
│     • Modo Livro-Razão: Tabela compacta para consulta ágil de cardápios│
│     • Modo Mesa Cartográfica: Mapa interativo Leaflet com pins de lojas│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 2. Análise Sob as Quatro Perspectivas

### Perspectiva 1: O que deveria fazer (Responsabilidade Funcional)
- Exibir exclusivamente lojas ativas e em situação regular (`status === 'active'`). Lojas suspensas ou em teste não aparecem para o público.
- Ordenar os estabelecimentos por proximidade geográfica do usuário, melhor avaliação ou menor taxa de entrega.
- Fornecer busca textual por nome do prato, produto ou nome da loja.
- Integrar mapa interativo com marcadores clicáveis que direcionam o cliente diretamente para a página do estabelecimento (`/loja/:slug`).
- Exibir badge com o tempo médio de entrega e taxa de frete calculada.

### Perspectiva 2: Como foi implementado (Realidade do Código)
- **Componentes de Frontend:**
  - `src/app/components/regional-marketplace.ts`:
    - Signal `viewMode = signal<CatalogViewMode>('fichario')` controlando alternância entre `'fichario'`, `'livro-razao'` e `'mesa-cartografica'`.
    - Signal `sortBy = signal<SortOption>('rating')` suportando ordenação por avaliação, distância, nome e taxa de entrega.
    - Signal `selectedCategory = signal<string>('all')` para filtros de segmento (`restaurant`, `retail`, `services`, etc.).
  - Integração com biblioteca **Leaflet 1.9.4**:
    - Inicialização via `afterNextRender` com renderização de camada OpenStreetMap, marcadores customizados para cada loja e popups interativos.
  - `src/app/components/marketplace/regional-marketplace-mobile.ts`:
    - Layout mobile-first otimizado para navegação por toque em smartphones.
- **Roteamento Backend:**
  - `src/server/routes/tenants.router.ts:23` (`GET /api/tenants/public`):
    - Retorna a lista de estabelecimentos públicos sanitizados.
  - `src/server/routes/hq.router.ts:524` (`GET /api/hq/regional`):
    - Retorna a configuração editorial da praça (`heroTitle`, `heroBannerImage`, `activeRegionName`).
- **Serviço de Dados Angular:**
  - `src/app/services/ecosystem.service.ts`:
    - Mantém os signals reativos `tenants`, `regionalConfig`, `userLocation` e a função matemática `calculateDistanceToUser(lat, lng)`.

### Perspectiva 3: Como se conecta (Topologia de Integração)
- **Entrada:** Consumidor acessa a raiz ou rota `/marketplace`.
- **Comunicação com o HQ:** O HQ Central configura o banner e os textos da praça via `POST /api/hq/regional`. O Marketplace reage instantaneamente sem necessidade de novo deploy.
- **Transição para a Loja:** O clique no card da loja invoca `router.navigate(['/loja', tenant.storeSlug || tenant.id])`.

### Perspectiva 4: Como foi validado (Comprovação Empírica)
- **Testes Automatizados:**
  - `src/app/services/ecosystem.service.spec.ts`: Validação de busca de estabelecimentos públicos e cálculo de distâncias geodésicas.
  - `src/server/api.spec.ts`: Validação do contrato do endpoint público `/api/tenants/public`.
- **Resultado:** 100% aprovado.

---

## 📊 3. Matriz de Classificação de Maturidade

| Funcionalidade do Marketplace | Classificação | Arquivo de Evidência | Observações |
|---|---|---|---|
| Listagem Pública de Estabelecimentos | 🟢 **Implementado e comprovado** | `src/server/routes/tenants.router.ts:23` | Filtro em Firestore `status == 'active'` e sanitização. |
| Banner Hero Regional Curado pelo HQ | 🟢 **Implementado e comprovado** | `src/server/routes/hq.router.ts:524` | Configuração persistida em `/public_regional/default`. |
| Modo Fichário (Cards Visuais) | 🟢 **Implementado e comprovado** | `src/app/components/regional-marketplace.ts:108` | Exibição de logo, capa, distância e tags. |
| Modo Livro-Razão (Tabela Compacta) | 🟢 **Implementado e comprovado** | `src/app/components/regional-marketplace.ts:180` | Modo analítico rápido para comparação de preços. |
| Modo Mesa Cartográfica (Mapa Leaflet) | 🟢 **Implementado e comprovado** | `src/app/components/regional-marketplace.ts:250` | Renderização Leaflet com coordenadas reais das lojas. |
| Projeção Mobile Dedicada PWA | 🟢 **Implementado e comprovado** | `src/app/components/marketplace/regional-marketplace-mobile.ts` | Navegação mobile com drawer e cards touch. |
| Filtro de Raio Máximo de Entrega (Geofencing) | 🟢 **Implementado e comprovado** | `src/app/services/ecosystem.service.ts` | Alerta se o usuário estiver além do `deliveryRadiusKm`. |
| Agrupamento de Lojas por Praça Dinâmica (Multi-Region Selector) | 🟡 **Implementado parcialmente** | `src/shared/models/ecosystem.model.ts` | O modelo prevê múltiplas praças; atualmente consome a praça padrão ativa configurada pelo HQ. |
