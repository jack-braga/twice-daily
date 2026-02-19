import type { SessionSection, Session, LiturgicalDay, Translation } from '../engine/types';

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  hasPsalter: boolean;
  hasLiturgy: boolean;
}

export interface PlanAssembler {
  config: PlanConfig;
  assembleSections(
    date: Date,
    session: Session,
    litDay: LiturgicalDay,
    translation: Translation,
  ): Promise<SessionSection[]>;
}
