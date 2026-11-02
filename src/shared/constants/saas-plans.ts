import type { LicensePlan } from '../models/ecosystem.model';

export const DEFAULT_PLAN_DEVICE_LIMITS = {
  Starter: 2,
  Professional: 5,
  Enterprise: 20
} as const;

/** All SaaS plans grant access to the Store OS; device quota is the plan limit. */
export const DEFAULT_SAAS_PLANS: LicensePlan[] = [
  {
    id: 'Starter',
    name: 'Starter',
    priceMonthly: 149,
    maxDevices: DEFAULT_PLAN_DEVICE_LIMITS.Starter,
    includedModules: ['Acesso completo ao Store OS'],
    description: 'Ideal para pequenos comércios.'
  },
  {
    id: 'Professional',
    name: 'Professional',
    priceMonthly: 299,
    maxDevices: DEFAULT_PLAN_DEVICE_LIMITS.Professional,
    includedModules: ['Acesso completo ao Store OS'],
    description: 'Perfeito para restaurantes.'
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    priceMonthly: 599,
    maxDevices: DEFAULT_PLAN_DEVICE_LIMITS.Enterprise,
    includedModules: ['Acesso completo ao Store OS'],
    description: 'Para redes de lojas.'
  }
];
