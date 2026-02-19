import type { PlanAssembler } from './types';
import type { PlanId } from '../engine/types';
import { bcp1662OriginalPlan, bcp1662RevisedPlan } from './bcp-1662';
import { mcheynePlan } from './mcheyne';
import { bibleprojectPlan } from './bibleproject';

export const PLANS: Record<PlanId, PlanAssembler> = {
  '1662-original': bcp1662OriginalPlan,
  '1662-revised': bcp1662RevisedPlan,
  'mcheyne': mcheynePlan,
  'bibleproject': bibleprojectPlan,
};

export function getPlan(planId: PlanId): PlanAssembler {
  return PLANS[planId];
}

export { type PlanAssembler } from './types';
