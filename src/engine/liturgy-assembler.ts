/**
 * Liturgy Assembler
 *
 * Top-level orchestrator that wires together:
 *   calendar → plan → lectionary → psalter → Bible loader → assembled output.
 *
 * Returns a DailyPlan ready for rendering.
 */

import type { DailyPlan, DailySession, Session, PlanId, Translation } from './types';
import { resolveLiturgicalDay } from './calendar';
import { getPlan } from '../plans';

/**
 * Assemble the complete office for a given date, session, plan, and translation.
 */
export async function assembleOffice(
  date: Date,
  session: Session,
  planId: PlanId,
  translation: Translation,
): Promise<DailyPlan> {
  const litDay = resolveLiturgicalDay(date);
  const plan = getPlan(planId);
  const sections = await plan.assembleSections(date, session, litDay, translation);

  const sessionTitle = plan.config.hasLiturgy
    ? (session === 'morning' ? 'Morning Prayer' : 'Evening Prayer')
    : (session === 'morning' ? 'Morning Readings' : 'Evening Readings');

  const dailySession: DailySession = {
    id: `${planId}-${session}`,
    title: sessionTitle,
    timeOfDay: session,
    sections,
  };

  return {
    date: date.toISOString().split('T')[0]!,
    planId,
    season: litDay.season,
    liturgicalDay: litDay,
    sessions: [dailySession],
  };
}

/**
 * Assemble both morning and evening sessions.
 */
export async function assembleBothSessions(
  date: Date,
  planId: PlanId,
  translation: Translation,
): Promise<DailyPlan> {
  const litDay = resolveLiturgicalDay(date);
  const plan = getPlan(planId);

  const [morningSections, eveningSections] = await Promise.all([
    plan.assembleSections(date, 'morning', litDay, translation),
    plan.assembleSections(date, 'evening', litDay, translation),
  ]);

  const morningTitle = plan.config.hasLiturgy ? 'Morning Prayer' : 'Morning Readings';
  const eveningTitle = plan.config.hasLiturgy ? 'Evening Prayer' : 'Evening Readings';

  return {
    date: date.toISOString().split('T')[0]!,
    planId,
    season: litDay.season,
    liturgicalDay: litDay,
    sessions: [
      {
        id: `${planId}-morning`,
        title: morningTitle,
        timeOfDay: 'morning',
        sections: morningSections,
      },
      {
        id: `${planId}-evening`,
        title: eveningTitle,
        timeOfDay: 'evening',
        sections: eveningSections,
      },
    ],
  };
}
