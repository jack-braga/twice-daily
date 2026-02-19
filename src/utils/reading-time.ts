import type { SectionContent, SessionSection } from '../engine/types';

/**
 * Count words in a string by splitting on whitespace.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(t => t.length > 0).length;
}

/**
 * Count all visible words in a single content block.
 * Exhaustively handles all SectionContent variants.
 */
export function countContentWords(content: SectionContent): number {
  switch (content.type) {
    case 'rubric':
    case 'static-text':
    case 'heading':
      return countWords(content.text);
    case 'versicle-response':
      return countWords(content.leader) + countWords(content.people);
    case 'scripture':
      return content.verses.reduce((sum, v) => sum + countWords(v.text), 0);
  }
}

/**
 * Count all words across all sections in a session.
 */
export function countSessionWords(sections: SessionSection[]): number {
  let total = 0;
  for (const section of sections) {
    for (const block of section.content) {
      total += countContentWords(block);
    }
  }
  return total;
}

/**
 * Estimate reading time in minutes, rounded up to the nearest minute.
 *
 * Formula: ceil(wordCount / (wpm * comprehensionRate))
 *
 * Returns null if inputs are invalid (wpm <= 0, rate <= 0, or rate > 1).
 * Returns 0 if wordCount <= 0 (nothing to read).
 */
export function estimateReadingTime(
  wordCount: number,
  wpm: number,
  comprehensionRate: number,
): number | null {
  if (wpm <= 0 || comprehensionRate <= 0 || comprehensionRate > 1) return null;
  if (wordCount <= 0) return 0;
  const effectiveWpm = wpm * comprehensionRate;
  return Math.ceil(wordCount / effectiveWpm);
}
