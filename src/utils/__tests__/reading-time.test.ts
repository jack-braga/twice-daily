import { describe, it, expect } from 'vitest';
import {
  countWords,
  countContentWords,
  countSessionWords,
  estimateReadingTime,
} from '../reading-time';
import type { SectionContent, SessionSection } from '../../engine/types';

describe('countWords', () => {
  it('counts words in a simple sentence', () => {
    expect(countWords('The Lord is my shepherd')).toBe(5);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('handles multiple spaces and newlines', () => {
    expect(countWords('  The   Lord \n is   ')).toBe(3);
  });

  it('handles single word', () => {
    expect(countWords('Amen')).toBe(1);
  });

  it('handles tabs and mixed whitespace', () => {
    expect(countWords('\tGlory\tbe\tto\tGod')).toBe(4);
  });
});

describe('countContentWords', () => {
  it('counts rubric text', () => {
    const block: SectionContent = { type: 'rubric', text: 'Then shall be said' };
    expect(countContentWords(block)).toBe(4);
  });

  it('counts static-text', () => {
    const block: SectionContent = { type: 'static-text', text: 'Our Father which art in heaven' };
    expect(countContentWords(block)).toBe(6);
  });

  it('counts heading', () => {
    const block: SectionContent = { type: 'heading', text: 'The Apostles Creed' };
    expect(countContentWords(block)).toBe(3);
  });

  it('counts versicle-response (leader + people)', () => {
    const block: SectionContent = {
      type: 'versicle-response',
      leader: 'O Lord open thou our lips',
      people: 'And our mouth shall shew forth thy praise',
    };
    // leader: 6 words + people: 8 words = 14
    expect(countContentWords(block)).toBe(14);
  });

  it('counts scripture verses', () => {
    const block: SectionContent = {
      type: 'scripture',
      reference: { book: 'Genesis', startChapter: 1, endChapter: 1 },
      verses: [
        { verse: 1, text: 'In the beginning God created the heaven and the earth' },
        { verse: 2, text: 'And the earth was without form and void' },
      ],
    };
    expect(countContentWords(block)).toBe(18);
  });

  it('returns 0 for scripture with empty verses', () => {
    const block: SectionContent = {
      type: 'scripture',
      reference: { book: 'Genesis', startChapter: 1, endChapter: 1 },
      verses: [],
    };
    expect(countContentWords(block)).toBe(0);
  });

  it('counts static-text with newlines', () => {
    const block: SectionContent = {
      type: 'static-text',
      text: 'Glory be to the Father,\nand to the Son :\nand to the Holy Ghost;',
    };
    // "Glory be to the Father," (5) + "and to the Son :" (5) + "and to the Holy Ghost;" (5) = 15
    expect(countContentWords(block)).toBe(15);
  });
});

describe('countSessionWords', () => {
  it('sums words across multiple sections', () => {
    const sections: SessionSection[] = [
      {
        id: 'prep',
        title: 'Preparation',
        content: [
          { type: 'rubric', text: 'Stand and say' },         // 3
          { type: 'static-text', text: 'Dearly beloved' },   // 2
        ],
        isCheckable: true,
      },
      {
        id: 'psalm',
        title: 'Psalms',
        content: [
          {
            type: 'scripture',
            reference: { book: 'Psalms', startChapter: 1, endChapter: 1 },
            verses: [{ verse: 1, text: 'Blessed is the man' }], // 4
          },
        ],
        isCheckable: true,
      },
    ];
    expect(countSessionWords(sections)).toBe(9);
  });

  it('returns 0 for empty sections array', () => {
    expect(countSessionWords([])).toBe(0);
  });

  it('handles sections with empty content arrays', () => {
    const sections: SessionSection[] = [
      { id: 'empty', title: 'Empty', content: [], isCheckable: false },
    ];
    expect(countSessionWords(sections)).toBe(0);
  });
});

describe('estimateReadingTime', () => {
  it('computes basic reading time', () => {
    // 1000 words / (200 WPM * 1.0 rate) = 5 min
    expect(estimateReadingTime(1000, 200, 1.0)).toBe(5);
  });

  it('rounds up to nearest minute', () => {
    // 201 words / (200 WPM * 1.0 rate) = 1.005 → ceil → 2
    expect(estimateReadingTime(201, 200, 1.0)).toBe(2);
  });

  it('applies comprehension rate', () => {
    // 1000 words / (200 * 0.5) = 1000 / 100 = 10
    expect(estimateReadingTime(1000, 200, 0.5)).toBe(10);
  });

  it('returns null for 0 WPM', () => {
    expect(estimateReadingTime(500, 0, 0.85)).toBeNull();
  });

  it('returns null for negative WPM', () => {
    expect(estimateReadingTime(500, -100, 0.85)).toBeNull();
  });

  it('returns null for 0 comprehension', () => {
    expect(estimateReadingTime(500, 200, 0)).toBeNull();
  });

  it('returns null for comprehension > 1', () => {
    expect(estimateReadingTime(500, 200, 1.5)).toBeNull();
  });

  it('returns 0 for 0 word count', () => {
    expect(estimateReadingTime(0, 200, 0.85)).toBe(0);
  });

  it('returns 1 for very short readings', () => {
    // 1 word / (200 * 1.0) = 0.005 → ceil → 1
    expect(estimateReadingTime(1, 200, 1.0)).toBe(1);
  });

  it('returns null for negative comprehension', () => {
    expect(estimateReadingTime(500, 200, -0.5)).toBeNull();
  });
});
