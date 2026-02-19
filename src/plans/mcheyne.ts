/**
 * M'Cheyne Reading Plan
 *
 * Pure scripture reading — no liturgical wrapper, no psalms cycle, no canticles.
 * 2 readings per session (Family → morning, Secret → evening).
 */

import type { PlanAssembler } from './types';
import type { SessionSection, Session, LiturgicalDay, Translation, SectionContent } from '../engine/types';
import { resolveReadings } from '../engine/lectionary-resolver';
import { loadReading, formatRef } from '../services/bible-loader';

const APOCRYPHAL_BOOKS = new Set([
  'Ecclesiasticus', 'Wisdom', 'Tobit', 'Baruch',
  '1 Maccabees', '2 Maccabees', 'Prayer of Manasses',
  'Song of Three Children', 'Judith', 'Susanna',
  'Bel and the Dragon', '2 Esdras', '1 Esdras',
]);

export const mcheynePlan: PlanAssembler = {
  config: {
    id: 'mcheyne',
    name: "M'Cheyne",
    description: "Robert Murray M'Cheyne's Bible reading plan — read through the whole Bible in a year.",
    hasPsalter: false,
    hasLiturgy: false,
  },

  async assembleSections(
    date: Date,
    session: Session,
    litDay: LiturgicalDay,
    translation: Translation,
  ): Promise<SessionSection[]> {
    const readings = await resolveReadings(date, session, 'mcheyne', litDay);
    const sections: SessionSection[] = [];

    // First reading
    if (readings.first.length > 0) {
      const ref = readings.first[0]!;
      const label = formatRef(ref);
      const content: SectionContent[] = [];

      if (APOCRYPHAL_BOOKS.has(ref.book)) {
        content.push({ type: 'rubric', text: `${label} (Apocrypha — reference only)` });
      } else {
        const result = await loadReading(translation, ref);
        if (result && result.verses.length > 0) {
          content.push({ type: 'scripture', reference: ref, verses: result.verses });
        } else {
          content.push({ type: 'rubric', text: `${label} — text not available` });
        }
      }

      sections.push({
        id: `mcheyne-reading-1`,
        title: 'Reading 1',
        subtitle: label,
        content,
        isCheckable: true,
      });
    }

    // Second reading
    if (readings.second.length > 0) {
      const ref = readings.second[0]!;
      const label = formatRef(ref);
      const content: SectionContent[] = [];

      if (APOCRYPHAL_BOOKS.has(ref.book)) {
        content.push({ type: 'rubric', text: `${label} (Apocrypha — reference only)` });
      } else {
        const result = await loadReading(translation, ref);
        if (result && result.verses.length > 0) {
          content.push({ type: 'scripture', reference: ref, verses: result.verses });
        } else {
          content.push({ type: 'rubric', text: `${label} — text not available` });
        }
      }

      sections.push({
        id: `mcheyne-reading-2`,
        title: 'Reading 2',
        subtitle: label,
        content,
        isCheckable: true,
      });
    }

    return sections;
  },
};
