export const PLATFORM_DELIVERY_NETWORK_READY = false;
export const PLATFORM_DELIVERY_INTELLIGENCE_READY = false;

export function isPlatformDeliveryTenantUnavailable(tenantId: unknown): boolean {
  return !PLATFORM_DELIVERY_NETWORK_READY && String(tenantId ?? '').trim() === 'marketplace';
}

const PLATFORM_DELIVERY_COMMISSION_READY =
  PLATFORM_DELIVERY_NETWORK_READY && PLATFORM_DELIVERY_INTELLIGENCE_READY;

export type PlatformDeliveryCommissionStatus = 'coming_soon' | 'active';

export function resolvePlatformDeliveryCommissionStatus(
  savedStatus: unknown
): PlatformDeliveryCommissionStatus {
  if (!PLATFORM_DELIVERY_COMMISSION_READY) return 'coming_soon';
  return savedStatus === 'active' ? 'active' : 'coming_soon';
}
