import type { SessionSection, Session, LiturgicalDay, Translation } from '../engine/types';

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  hasPsalter: boolean;
  hasLiturgy: boolean;
  sessions: readonly Session[];  // e.g., ['morning', 'evening'] or ['daily']
  totalDays?: number;            // for sequential plans (358, 365)
  needsStartDate: boolean;       // true for plans that use date anchoring
}

export interface PlanAssembler {
  config: PlanConfig;
  assembleSections(
    date: Date,
    session: Session,
    litDay: LiturgicalDay,
    translation: Translation,
    planDay?: number,
  ): Promise<SessionSection[]>;
}
