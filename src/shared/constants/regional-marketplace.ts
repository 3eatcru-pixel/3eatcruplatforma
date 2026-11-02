import { RegionalMarketplaceConfig } from '../models/ecosystem.model';

export const DEFAULT_REGIONAL_MARKETPLACE_CONFIG: RegionalMarketplaceConfig = {
  heroTitle: 'Ecossistema 3eatcru',
  heroSubtitle: 'Explore lojistas locais',
  heroTag: 'DIRETÓRIO REGIONAL',
  heroBannerImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
  heroCtaText: 'Explorar',
  heroAnnouncement: 'Boas-vindas!',
  showHeroAnnouncement: true,
  featuredTenantIds: [],
  defaultSearchRadiusKm: 15,
  activeRegionName: 'Região não configurada'
};

export function normalizeRegionalMarketplaceConfig(
  value: Partial<RegionalMarketplaceConfig> | null | undefined
): RegionalMarketplaceConfig {
  const config = { ...DEFAULT_REGIONAL_MARKETPLACE_CONFIG, ...(value ?? {}) };
  const requestedRadius = Number(config.defaultSearchRadiusKm);

  return {
    ...config,
    featuredTenantIds: Array.isArray(config.featuredTenantIds)
      ? config.featuredTenantIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [],
    defaultSearchRadiusKm: Number.isFinite(requestedRadius)
      ? Math.min(30, Math.max(1, Math.round(requestedRadius)))
      : DEFAULT_REGIONAL_MARKETPLACE_CONFIG.defaultSearchRadiusKm
  };
}
