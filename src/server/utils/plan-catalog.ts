import type { LicensePlan } from '../../shared/models/ecosystem.model';

function validPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validDeviceLimit(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 999;
}

export function normalizePlanCatalogEntry(
  basePlan: LicensePlan,
  savedPlan?: Record<string, unknown>
): LicensePlan {
  const savedPrice = savedPlan?.['priceMonthly'];
  const savedDeviceLimit = savedPlan?.['maxDevices'];
  return {
    ...basePlan,
    priceMonthly: validPrice(savedPrice) ? savedPrice : basePlan.priceMonthly,
    maxDevices: validDeviceLimit(savedDeviceLimit) ? savedDeviceLimit : basePlan.maxDevices
  };
}

export function hasValidPlanCatalogValues(savedPlan?: Record<string, unknown>): boolean {
  return validPrice(savedPlan?.['priceMonthly']) || validDeviceLimit(savedPlan?.['maxDevices']);
}

export function hasCompletePlanCatalogValues(savedPlan?: Record<string, unknown>): boolean {
  return validPrice(savedPlan?.['priceMonthly']) && validDeviceLimit(savedPlan?.['maxDevices']);
}
