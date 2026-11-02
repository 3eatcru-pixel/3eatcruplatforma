import { DeliveryMarketplaceProviderId } from '../../../models/ecosystem.model';

export type { DeliveryMarketplaceProviderId };

export interface DeliveryMarketplacePlugin {
  id: DeliveryMarketplaceProviderId;
  name: string;
  iconLabel: string;
  icon: string;
  colorClass: string;
  summary: string;
  intakeMethods: string[];
  prerequisites: string[];
  documentationUrl: string;
}
