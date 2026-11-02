import type { CompanyTenant } from '../../shared/models/ecosystem.model';
import { DEFAULT_PLAN_DEVICE_LIMITS } from '../../shared/constants/saas-plans';
import { adminDb } from '../firebase-admin';

export const DEFAULT_DEVICE_LIMITS: Record<CompanyTenant['plan'], number> = DEFAULT_PLAN_DEVICE_LIMITS;

export async function getPlanDeviceLimit(plan: CompanyTenant['plan']): Promise<number> {
  const planSnapshot = await adminDb.collection('plans').doc(plan).get();
  if (!planSnapshot.exists) return DEFAULT_DEVICE_LIMITS[plan];

  const configuredLimit = planSnapshot.data()?.['maxDevices'];
  if (configuredLimit === undefined) return DEFAULT_DEVICE_LIMITS[plan];
  if (typeof configuredLimit !== 'number' || !Number.isInteger(configuredLimit) || configuredLimit < 1 || configuredLimit > 999) {
    throw new Error(`Invalid maxDevices setting for plan ${plan}.`);
  }
  return configuredLimit;
}
