/**
 * Psalter Generator
 *
 * Outputs the 30-day psalter cycle as a JSON file for the app to consume.
 * The data is already defined in src/engine/psalter.ts — this script
 * re-exports it in the public/data format for consistency.
 *
 * Output: public/data/psalter/30-day-cycle.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data', 'psalter');

// The 30-day psalter cycle from the 1662 BCP.
// Each day has morning and evening psalm numbers.
// This is duplicated from src/engine/psalter.ts to avoid importing app code in build scripts.
const PSALTER_30_DAY = [
  { day: 1, morning: [1, 2, 3, 4, 5], evening: [6, 7, 8] },
  { day: 2, morning: [9, 10, 11], evening: [12, 13, 14] },
  { day: 3, morning: [15, 16, 17], evening: [18] },
  { day: 4, morning: [19, 20, 21], evening: [22, 23] },
  { day: 5, morning: [24, 25, 26], evening: [27, 28, 29] },
  { day: 6, morning: [30, 31], evening: [32, 33, 34] },
  { day: 7, morning: [35, 36], evening: [37] },
  { day: 8, morning: [38, 39, 40], evening: [41, 42, 43] },
  { day: 9, morning: [44, 45, 46], evening: [47, 48, 49] },
  { day: 10, morning: [50, 51, 52], evening: [53, 54, 55] },
  { day: 11, morning: [56, 57, 58], evening: [59, 60, 61] },
  { day: 12, morning: [62, 63, 64], evening: [65, 66, 67] },
  { day: 13, morning: [68], evening: [69, 70] },
  { day: 14, morning: [71, 72], evening: [73, 74] },
  { day: 15, morning: [75, 76, 77], evening: [78] },
  { day: 16, morning: [79, 80, 81], evening: [82, 83, 84, 85] },
  { day: 17, morning: [86, 87, 88], evening: [89] },
  { day: 18, morning: [90, 91, 92], evening: [93, 94] },
  { day: 19, morning: [95, 96, 97], evening: [98, 99, 100, 101] },
  { day: 20, morning: [102, 103], evening: [104] },
  { day: 21, morning: [105], evening: [106] },
  { day: 22, morning: [107], evening: [108, 109] },
  { day: 23, morning: [110, 111, 112, 113], evening: [114, 115] },
  { day: 24, morning: [116, 117, 118], evening: [119, { start: 1, end: 32, section: 'Aleph-Daleth' }] },
  { day: 25, morning: [{ psalm: 119, start: 33, end: 72, section: 'He-Teth' }], evening: [{ psalm: 119, start: 73, end: 104, section: 'Yodh-Nun' }] },
  { day: 26, morning: [{ psalm: 119, start: 105, end: 144, section: 'Samekh-Resh' }], evening: [{ psalm: 119, start: 145, end: 176, section: 'Shin-Tav' }] },
  { day: 27, morning: [120, 121, 122, 123, 124, 125], evening: [126, 127, 128, 129, 130, 131] },
  { day: 28, morning: [132, 133, 134, 135], evening: [136, 137, 138] },
  { day: 29, morning: [139, 140, 141], evening: [142, 143] },
  { day: 30, morning: [144, 145, 146], evening: [147, 148, 149, 150] },
];

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputFile = path.join(OUTPUT_DIR, '30-day-cycle.json');
  fs.writeFileSync(outputFile, JSON.stringify(PSALTER_30_DAY, null, 0));

  console.log(`Psalter: ${PSALTER_30_DAY.length} days generated`);
}

main();
