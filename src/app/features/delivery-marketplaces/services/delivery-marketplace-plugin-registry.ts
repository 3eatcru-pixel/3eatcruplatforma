import { DeliveryMarketplacePlugin } from '../types/delivery-marketplace-plugin.model';
import { IFOOD_DELIVERY_PLUGIN } from '../providers/ifood.plugin';
import { NINETY_NINE_FOOD_PLUGIN } from '../providers/99food.plugin';
import { RAPPI_DELIVERY_PLUGIN } from '../providers/rappi.plugin';

/** Provider plugins describe integration requirements; they do not imply a live connection. */
export const DELIVERY_MARKETPLACE_PLUGINS: readonly DeliveryMarketplacePlugin[] = [
  IFOOD_DELIVERY_PLUGIN,
  NINETY_NINE_FOOD_PLUGIN,
  RAPPI_DELIVERY_PLUGIN
];
