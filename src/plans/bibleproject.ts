/**
 * BibleProject "One Story That Leads to Jesus" Reading Plan
 *
 * 358-day whole-Bible plan. Single daily session (no morning/evening split).
 * Each day has a main Bible reading (chapters) and a Psalm.
 */

import type { PlanAssembler } from './types';
import type { SessionSection, Session, LiturgicalDay, Translation, SectionContent } from '../engine/types';
import { resolveReadings } from '../engine/lectionary-resolver';
import { loadReading, formatRef } from '../services/bible-loader';

export const bibleprojectPlan: PlanAssembler = {
  config: {
    id: 'bibleproject',
    name: 'BibleProject: One Story',
    description: 'Read through the whole Bible in 358 days — the one story that leads to Jesus.',
    hasPsalter: false,
    hasLiturgy: false,
    sessions: ['daily'],
    totalDays: 358,
    needsStartDate: true,
  },

  async assembleSections(
    date: Date,
    session: Session,
    litDay: LiturgicalDay,
    translation: Translation,
    planDay?: number,
  ): Promise<SessionSection[]> {
    if (planDay == null) return [];

    const readings = await resolveReadings(date, session, 'bibleproject', litDay, planDay);
    const sections: SessionSection[] = [];

    // Main reading (may have multiple refs, e.g., "2 John 1" + "3 John 1")
    if (readings.first.length > 0) {
      const label = readings.first.map(formatRef).join('; ');
      const content: SectionContent[] = [];

      for (const ref of readings.first) {
        const result = await loadReading(translation, ref);
        if (result && result.verses.length > 0) {
          content.push({ type: 'scripture', reference: ref, verses: result.verses });
        } else {
          content.push({ type: 'rubric', text: `${formatRef(ref)} — text not available` });
        }
      }

      sections.push({
        id: 'bibleproject-reading',
        title: 'Reading',
        subtitle: label,
        content,
        isCheckable: true,
      });
    }

    // Psalm
    if (readings.second.length > 0) {
      const ref = readings.second[0]!;
      const label = formatRef(ref);
      const content: SectionContent[] = [];

      const result = await loadReading(translation, ref);
      if (result && result.verses.length > 0) {
        if (result.superscription) {
          content.push({ type: 'rubric', text: result.superscription });
        }
        content.push({ type: 'scripture', reference: ref, verses: result.verses });
      } else {
        content.push({ type: 'rubric', text: `${label} — text not available` });
      }

      sections.push({
        id: 'bibleproject-psalm',
        title: 'Psalm',
        subtitle: label,
        content,
        isCheckable: true,
      });
    }

    return sections;
  },
};
