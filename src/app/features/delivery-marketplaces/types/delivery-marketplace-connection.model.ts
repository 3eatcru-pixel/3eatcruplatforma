import { DeliveryMarketplaceProviderId } from './delivery-marketplace-plugin.model';

export type DeliveryMarketplaceConnectionStatus =
  | 'pending_authorization'
  | 'active'
  | 'error'
  | 'suspended';

export interface DeliveryMarketplaceConnectionSummary {
  provider: DeliveryMarketplaceProviderId;
  status: DeliveryMarketplaceConnectionStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  externalMerchantId?: string;
}
