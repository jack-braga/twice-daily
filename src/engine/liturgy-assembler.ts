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
import { formatDateStr } from '../utils/date';
import { computePlanDay } from '../utils/plan-day';

function isSingleSession(sessions: readonly Session[]): boolean {
  return sessions.length === 1 && sessions[0] === 'daily';
}

/**
 * Assemble the complete office for a given date, session, plan, and translation.
 */
export async function assembleOffice(
  date: Date,
  session: Session,
  planId: PlanId,
  translation: Translation,
  planStartDate?: string,
): Promise<DailyPlan> {
  const litDay = resolveLiturgicalDay(date);
  const plan = getPlan(planId);

  // Compute plan day for sequential plans
  let planDay: number | undefined;
  if (plan.config.needsStartDate && planStartDate) {
    const dateStr = formatDateStr(date);
    planDay = computePlanDay(planStartDate, dateStr, plan.config.totalDays ?? Infinity) ?? undefined;
  }

  const sections = await plan.assembleSections(date, session, litDay, translation, planDay);

  const single = isSingleSession(plan.config.sessions);

  let sessionTitle: string;
  if (single) {
    sessionTitle = 'Daily Reading';
  } else if (plan.config.hasLiturgy) {
    sessionTitle = session === 'morning' ? 'Morning Prayer' : 'Evening Prayer';
  } else {
    sessionTitle = session === 'morning' ? 'Morning Readings' : 'Evening Readings';
  }

  const dailySession: DailySession = {
    id: `${planId}-${session}`,
    title: sessionTitle,
    timeOfDay: single ? 'any' : session,
    sections,
  };

  return {
    date: formatDateStr(date),
    planId,
    season: litDay.season,
    liturgicalDay: litDay,
    sessions: [dailySession],
    planDay,
    planTotalDays: plan.config.totalDays,
  };
}

/**
 * Assemble both morning and evening sessions.
 */
export async function assembleBothSessions(
  date: Date,
  planId: PlanId,
  translation: Translation,
  planStartDate?: string,
): Promise<DailyPlan> {
  const litDay = resolveLiturgicalDay(date);
  const plan = getPlan(planId);

  // Compute plan day for sequential plans
  let planDay: number | undefined;
  if (plan.config.needsStartDate && planStartDate) {
    const dateStr = formatDateStr(date);
    planDay = computePlanDay(planStartDate, dateStr, plan.config.totalDays ?? Infinity) ?? undefined;
  }

  const single = isSingleSession(plan.config.sessions);

  if (single) {
    const sections = await plan.assembleSections(date, 'daily', litDay, translation, planDay);
    return {
      date: formatDateStr(date),
      planId,
      season: litDay.season,
      liturgicalDay: litDay,
      sessions: [{
        id: `${planId}-daily`,
        title: 'Daily Reading',
        timeOfDay: 'any',
        sections,
      }],
      planDay,
      planTotalDays: plan.config.totalDays,
    };
  }

  const [morningSections, eveningSections] = await Promise.all([
    plan.assembleSections(date, 'morning', litDay, translation, planDay),
    plan.assembleSections(date, 'evening', litDay, translation, planDay),
  ]);

  const morningTitle = plan.config.hasLiturgy ? 'Morning Prayer' : 'Morning Readings';
  const eveningTitle = plan.config.hasLiturgy ? 'Evening Prayer' : 'Evening Readings';

  return {
    date: formatDateStr(date),
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
    planDay,
    planTotalDays: plan.config.totalDays,
  };
}
