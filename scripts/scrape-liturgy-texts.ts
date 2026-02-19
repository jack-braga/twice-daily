/**
 * Liturgical Texts Scraper
 *
 * Parses the Morning Prayer, Evening Prayer, and Prayers HTML files
 * from eskimo.com (1987 Cambridge "Final Standard Text" edition of 1662 BCP)
 * into structured JSON for the app.
 *
 * Input:  scripts/data/liturgy-raw/*.html
 * Output: public/data/liturgy/morning-prayer.json
 *         public/data/liturgy/evening-prayer.json
 *         public/data/liturgy/prayers.json
 *         public/data/liturgy/collects.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const RAW_DIR = path.resolve(import.meta.dirname, 'data', 'liturgy-raw');
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data', 'liturgy');

// ─── HTML cleaning utilities ────────────────────────────────────────────────

const BR_PLACEHOLDER = '\u0000BR\u0000';
const P_PLACEHOLDER = '\u0000PP\u0000';

/** Strip all HTML tags and decode common entities. */
function stripHtml(html: string): string {
  return html
    .replace(/<IMG[^>]*ALT="([^"]*)"[^>]*>/gi, '$1')  // Replace decorative initials with their ALT text
    .replace(/<BR\s*\/?>/gi, BR_PLACEHOLDER)            // BR → placeholder
    .replace(/<P\s*\/?>/gi, P_PLACEHOLDER)              // P → placeholder
    .replace(/<[^>]+>/g, '')                             // Strip remaining tags
    .replace(/&#160;/g, ' ')                             // Non-breaking space
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/gi, '')                           // Any remaining entities
    .replace(/[\r\n]+/g, ' ')                            // Collapse source newlines → spaces
    .replace(new RegExp(P_PLACEHOLDER, 'g'), '\n')       // Restore paragraph breaks
    .replace(new RegExp(BR_PLACEHOLDER, 'g'), '\n')      // Restore line breaks
    .replace(/[ \t]+/g, ' ')                             // Collapse horizontal whitespace
    .replace(/\n[ \t]+/g, '\n')                          // Trim leading whitespace on lines
    .replace(/[ \t]+\n/g, '\n')                          // Trim trailing whitespace on lines
    .replace(/\n{3,}/g, '\n\n')                          // Max 2 consecutive newlines
    .trim();
}

/** Extract initial capital from decorative IMG + following STRONG text. */
function reconstructInitialCap(html: string): string {
  // Pattern: <STRONG><IMG ... ALT="X">REST</STRONG>
  // e.g., <STRONG><IMG ALT="O"> COME</STRONG> → "O COME"
  // e.g., <STRONG><IMG ALT="A">LMIGHTY</STRONG> → "ALMIGHTY"
  return html.replace(
    /<STRONG><IMG[^>]*ALT="([^"]*)"[^>]*>([\s\S]*?)<\/STRONG>/gi,
    (_, alt, rest) => {
      const restText = rest.replace(/<[^>]+>/g, '');
      // If rest starts with a space (like " COME"), keep it: "O COME"
      // If rest starts with a letter (like "LMIGHTY"), join directly: "ALMIGHTY"
      return alt + restText;
    }
  );
}

/** Check if a chunk is a rubric (red text / italic instruction). */
function isRubric(html: string): boolean {
  return /<FONT\s+COLOR\s*=\s*"Red"/i.test(html) || /^<EM>/i.test(html.trim());
}

/** Extract rubric text from a rubric chunk. */
function extractRubricText(html: string): string {
  // Remove anchor tags but keep text
  let text = html.replace(/<A[^>]*>/gi, '').replace(/<\/A>/gi, '');
  return stripHtml(text).trim();
}

// ─── Section-level types ────────────────────────────────────────────────────

interface LiturgyPiece {
  type: 'rubric' | 'text' | 'versicle' | 'canticle-ref' | 'heading';
  content: string;
  response?: string;     // For versicle-response pairs
  speaker?: string;      // "Priest" | "Minister" | "Answer"
  id?: string;           // Anchor name for linking (e.g., "Venite", "TeDeum")
  latin?: string;        // Latin name (e.g., "Te Deum Laudamus")
  reference?: string;    // Scripture reference (e.g., "Psalm xcv")
}

interface LiturgySection {
  id: string;
  title: string;
  pieces: LiturgyPiece[];
}

// ─── Morning/Evening Prayer parser ─────────────────────────────────────────

function parseOfficeHtml(html: string, session: 'morning' | 'evening'): LiturgySection[] {
  const sections: LiturgySection[] = [];

  // Clean up the HTML slightly
  html = html
    .replace(/<!--[\s\S]*?-->/g, '')     // Strip comments
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // ─── Opening Sentences ────────────────────────────────────────────
  // Find the block between the rubric's </FONT> and the Exhortation's <STRONG><IMG ALT="D">
  const sentencesMatch = html.match(
    /<\/FONT>\s*<P>\s*([\s\S]*?)<STRONG><IMG[^>]*ALT="D"[^>]*>/i
  );
  if (sentencesMatch) {
    const sentencesHtml = sentencesMatch[1]!;
    const lines = sentencesHtml.split(/<BR\s*\/?>/i).map(l => stripHtml(l).trim()).filter(Boolean);
    const sentences: LiturgyPiece[] = [
      { type: 'rubric', content: 'At the beginning of ' + (session === 'morning' ? 'Morning' : 'Evening') + ' Prayer the Minister shall read with a loud voice some one or more of these Sentences of the Scriptures that follow. And then he shall say that which is written after the said Sentences.' },
    ];
    for (const line of lines) {
      if (line) {
        sentences.push({ type: 'text', content: line });
      }
    }
    sections.push({
      id: 'opening-sentences',
      title: 'Opening Sentences',
      pieces: sentences,
    });
  }

  // ─── Exhortation ──────────────────────────────────────────────────
  const exhortMatch = html.match(
    /<STRONG><IMG[^>]*ALT="D"[^>]*>\s*EARLY<\/STRONG>([\s\S]*?)<CENTER>/i
  );
  if (exhortMatch) {
    const text = 'DEARLY ' + stripHtml(exhortMatch[1]!).trim();
    sections.push({
      id: 'exhortation',
      title: 'Exhortation',
      pieces: [{ type: 'text', content: text }],
    });
  }

  // ─── General Confession ───────────────────────────────────────────
  const confessionMatch = html.match(
    /GeneralConfession[\s\S]*?<\/CENTER>\s*([\s\S]*?)<FONT\s+COLOR\s*=\s*"Red"/i
  );
  if (confessionMatch) {
    // Reconstruct text (starts with decorative A)
    const confText = reconstructInitialCap(confessionMatch[1]!.trim());
    const rubricMatch = html.match(/GeneralConfession[^>]*>([\s\S]*?)<\/FONT>\s*<\/CENTER>/i);
    const rubric = rubricMatch ? extractRubricText(rubricMatch[1]!) : '';

    const pieces: LiturgyPiece[] = [];
    if (rubric) pieces.push({ type: 'rubric', content: rubric });
    pieces.push({ type: 'text', content: stripHtml(confText) });

    sections.push({
      id: 'general-confession',
      title: 'A General Confession',
      pieces,
    });
  }

  // ─── Absolution ───────────────────────────────────────────────────
  const absMatch = html.match(
    /<A\s+NAME\s*=\s*"Absolution"[^>]*>[\s\S]*?<\/FONT>\s*(?:<\/CENTER>\s*)?(?:<BR\s*\/?>)?\s*(<STRONG><IMG[\s\S]*?)<(?:P|CENTER|FONT)/i
  );
  if (absMatch) {
    // Get rubric
    const rubricMatch = html.match(/Absolution[^>]*>([\s\S]*?)<\/FONT>/i);
    const rubric = rubricMatch ? extractRubricText(rubricMatch[1]!) : '';
    const bodyText = stripHtml(reconstructInitialCap(absMatch[1]!));

    const pieces: LiturgyPiece[] = [];
    if (rubric) pieces.push({ type: 'rubric', content: rubric });
    if (bodyText) pieces.push({ type: 'text', content: bodyText });

    sections.push({
      id: 'absolution',
      title: 'The Absolution',
      pieces,
    });
  }

  // ─── Lord's Prayer (first occurrence) ─────────────────────────────
  const lpMatch = html.match(
    /OurFather"[^>]*>Lord's Prayer[\s\S]*?<\/FONT>\s*(?:<\/CENTER>\s*)?<BR\s*\/?>\s*([\s\S]*?)<P/i
  );
  if (!lpMatch) {
    // Try alternative pattern
    const lpAlt = html.match(
      /OurFather[\s\S]*?<STRONG><IMG[^>]*ALT="O"[^>]*>UR<\/STRONG>([\s\S]*?)<P/i
    );
    if (lpAlt) {
      const text = 'OUR' + stripHtml(lpAlt[1]!);
      sections.push({
        id: 'lords-prayer',
        title: "The Lord's Prayer",
        pieces: [{ type: 'text', content: text }],
      });
    }
  } else {
    const text = stripHtml(reconstructInitialCap(lpMatch[1]!));
    sections.push({
      id: 'lords-prayer',
      title: "The Lord's Prayer",
      pieces: [{ type: 'text', content: text }],
    });
  }

  // ─── Versicles & Responses (O Lord, open thou our lips...) ────────
  const versiclesMatch = html.match(
    /O Lord, open thou our lips\.([\s\S]*?)(?:Praise ye|PraiseYe)([\s\S]*?)(?:<P|<FONT\s+COLOR)/i
  );
  if (versiclesMatch) {
    // Parse the versicle-response block
    const fullBlock = 'O Lord, open thou our lips.' + versiclesMatch[1]! + 'Praise ye' + versiclesMatch[2]!;
    const versicles = parseVersicleBlock(fullBlock);
    sections.push({
      id: 'versicles',
      title: 'Versicles and Responses',
      pieces: versicles,
    });
  }

  // ─── Venite (Morning only) ────────────────────────────────────────
  if (session === 'morning') {
    const veniteMatch = html.match(
      /<A NAME\s*=\s*"Venite"[^>]*>[^<]*<\/A>[\s\S]*?<\/CENTER>\s*([\s\S]*?)<FONT\s+COLOR\s*=\s*"Red"><EM>Then shall follow/i
    );
    if (veniteMatch) {
      const text = stripHtml(reconstructInitialCap(veniteMatch[1]!));
      const pieces: LiturgyPiece[] = [];
      pieces.push({ type: 'rubric', content: 'Then shall be said or sung this Psalm following; Except on Easter Day, upon which another Anthem is appointed; and on the nineteenth day of every month it is not to be read here, but in the ordinary course of the Psalms.' });
      pieces.push({ type: 'text', content: text, id: 'Venite', latin: 'Venite, exultemus Domino', reference: 'Psalm 95' });
      sections.push({
        id: 'venite',
        title: 'Venite, exultemus Domino',
        pieces,
      });
    }
  }

  // ─── Psalms placeholder ───────────────────────────────────────────
  sections.push({
    id: 'psalms',
    title: 'The Psalms Appointed',
    pieces: [
      { type: 'rubric', content: 'Then shall follow the Psalms in order as they be appointed.' },
      { type: 'rubric', content: 'And at the end of every Psalm throughout the year shall be repeated,' },
      { type: 'text', content: 'Glory be to the Father, and to the Son : and to the Holy Ghost;\nAs it was in the beginning, is now, and ever shall be : world without end. Amen.' },
    ],
  });

  // ─── First Lesson placeholder ─────────────────────────────────────
  sections.push({
    id: 'first-lesson',
    title: 'The First Lesson',
    pieces: [
      { type: 'rubric', content: session === 'morning'
        ? 'Then shall be read distinctly with an audible voice the First Lesson, taken out of the Old Testament, as is appointed in the Calendar.'
        : 'Then a Lesson of the Old Testament, as is appointed.' },
    ],
  });

  // ─── Te Deum / Magnificat (Canticle 1) ────────────────────────────
  if (session === 'morning') {
    // Te Deum
    const teDeum = extractCanticle(html, 'TeDeum', 'Te Deum Laudamus', 'W');
    // Benedicite
    const benedicite = extractCanticle(html, 'Benedicite', 'Benedicite, omnia opera', 'O');

    sections.push({
      id: 'canticle-1',
      title: 'Te Deum Laudamus',
      pieces: [
        { type: 'rubric', content: 'And after that, shall be said or sung, in English, the Hymn called Te Deum Laudamus, daily throughout the Year.' },
        ...(teDeum ? [{ type: 'text' as const, content: teDeum, id: 'TeDeum', latin: 'Te Deum Laudamus' }] : []),
        { type: 'rubric', content: 'Or this Canticle,' },
        ...(benedicite ? [{ type: 'text' as const, content: benedicite, id: 'Benedicite', latin: 'Benedicite, omnia opera' }] : []),
      ],
    });
  } else {
    // Magnificat
    const magnificat = extractCanticle(html, 'Magnificat', 'Magnificat', 'M');
    // Cantate Domino
    const cantate = extractCanticle(html, 'CantateDomino', 'Cantate Domino', 'O');

    sections.push({
      id: 'canticle-1',
      title: 'Magnificat',
      pieces: [
        ...(magnificat ? [{ type: 'text' as const, content: magnificat, id: 'Magnificat', latin: 'Magnificat', reference: 'St. Luke 1' }] : []),
        { type: 'rubric', content: 'Or else this Psalm; except it be on the nineteenth day of the month, when it is read in the ordinary course of the Psalms.' },
        ...(cantate ? [{ type: 'text' as const, content: cantate, id: 'CantateDomino', latin: 'Cantate Domino', reference: 'Psalm 98' }] : []),
      ],
    });
  }

  // ─── Second Lesson placeholder ────────────────────────────────────
  sections.push({
    id: 'second-lesson',
    title: 'The Second Lesson',
    pieces: [
      { type: 'rubric', content: session === 'morning'
        ? 'Then shall be read in like manner the Second Lesson, taken out of the New Testament.'
        : 'Then a Lesson of the New Testament, as it is appointed.' },
    ],
  });

  // ─── Benedictus / Nunc Dimittis (Canticle 2) ──────────────────────
  if (session === 'morning') {
    const benedictus = extractCanticle(html, 'Benedictus', 'Benedictus', 'B');
    const jubilate = extractCanticle(html, 'JubilateDeo', 'Jubilate Deo', 'O');

    sections.push({
      id: 'canticle-2',
      title: 'Benedictus',
      pieces: [
        ...(benedictus ? [{ type: 'text' as const, content: benedictus, id: 'Benedictus', latin: 'Benedictus', reference: 'St. Luke 1:68' }] : []),
        { type: 'rubric', content: 'Or this Psalm,' },
        ...(jubilate ? [{ type: 'text' as const, content: jubilate, id: 'JubilateDeo', latin: 'Jubilate Deo', reference: 'Psalm 100' }] : []),
      ],
    });
  } else {
    const nuncDimittis = extractCanticle(html, 'NuncDimittis', 'Nunc dimittis', 'L');
    const deusMisereatur = extractCanticle(html, 'DeusMisereatur', 'Deus misereatur', 'G');

    sections.push({
      id: 'canticle-2',
      title: 'Nunc Dimittis',
      pieces: [
        ...(nuncDimittis ? [{ type: 'text' as const, content: nuncDimittis, id: 'NuncDimittis', latin: 'Nunc dimittis', reference: 'St. Luke 2:29' }] : []),
        { type: 'rubric', content: 'Or else this Psalm: Except it be on the twelfth day of the month.' },
        ...(deusMisereatur ? [{ type: 'text' as const, content: deusMisereatur, id: 'DeusMisereatur', latin: 'Deus misereatur', reference: 'Psalm 67' }] : []),
      ],
    });
  }

  // ─── Apostles' Creed ──────────────────────────────────────────────
  const creedMatch = html.match(
    /ApostlesCreed[\s\S]*?<\/FONT>\s*(?:<\/CENTER>\s*)?<BR\s*\/?>\s*<STRONG><IMG[^>]*ALT="I"[^>]*>\s*BELIEVE<\/STRONG>([\s\S]*?)<P/i
  );
  if (creedMatch) {
    const text = 'I BELIEVE ' + stripHtml(creedMatch[1]!).trim();
    const rubricMatch = html.match(/ApostlesCreed[^>]*>([\s\S]*?)<\/FONT>/i);
    const pieces: LiturgyPiece[] = [];
    if (rubricMatch) pieces.push({ type: 'rubric', content: extractRubricText(rubricMatch[1]!) });
    pieces.push({ type: 'text', content: text });

    sections.push({
      id: 'apostles-creed',
      title: "The Apostles' Creed",
      pieces,
    });
  }

  // ─── Prayers section (Lord be with you, Kyrie, etc.) ──────────────
  const prayersIntro = html.match(
    /these Prayers following[\s\S]*?The Lord be with you\.\s*<BR>([\s\S]*?)Lord, have mercy upon us\.\s*<P/i
  );
  if (prayersIntro) {
    const block = 'The Lord be with you.\n' + prayersIntro[1]! + 'Lord, have mercy upon us.';
    const versicles = parseVersicleBlock(block);
    // Add the Kyrie
    versicles.push({ type: 'text', content: 'Lord, have mercy upon us.\nChrist, have mercy upon us.\nLord, have mercy upon us.' });

    sections.push({
      id: 'prayers-intro',
      title: 'The Prayers',
      pieces: [
        { type: 'rubric', content: 'And after that these Prayers following, all devoutly kneeling: the Minister first pronouncing with a loud voice,' },
        ...versicles,
      ],
    });
  }

  // ─── Lord's Prayer (second occurrence, after Creed) ───────────────
  const lp2Match = html.match(
    /OurFather2[\s\S]*?<STRONG><IMG[^>]*ALT="O"[^>]*>UR<\/STRONG>([\s\S]*?)<P/i
  );
  if (lp2Match) {
    const text = 'OUR ' + stripHtml(lp2Match[1]!).trim();
    sections.push({
      id: 'lords-prayer-2',
      title: "The Lord's Prayer",
      pieces: [
        { type: 'rubric', content: 'Then the Minister, Clerks, and people shall say the Lord\'s Prayer with a loud voice.' },
        { type: 'text', content: text },
      ],
    });
  }

  // ─── Suffrages (O Lord, shew thy mercy...) ────────────────────────
  const suffragesMatch = html.match(
    /O Lord, shew[\s\S]*?thy mercy upon us\.\s*<BR>([\s\S]*?)(?:<[^>]*>)*\s*And take[\s\S]*?Holy Spirit from us\.\s*<P/i
  );
  if (suffragesMatch) {
    const block = 'O Lord, shew thy mercy upon us.\n' + suffragesMatch[1]! + 'And take not thy Holy Spirit from us.';
    const versicles = parseVersicleBlock(block);
    sections.push({
      id: 'suffrages',
      title: 'Suffrages',
      pieces: versicles,
    });
  }

  // ─── Collect of the Day placeholder ───────────────────────────────
  sections.push({
    id: 'collect-of-day',
    title: 'The Collect of the Day',
    pieces: [
      { type: 'rubric', content: 'Then shall follow three Collects; the first of the day, which shall be the same that is appointed at the Communion.' },
    ],
  });

  // ─── Second Collect (for Peace / at Evening Prayer) ───────────────
  if (session === 'morning') {
    const collectPeace = html.match(
      /CollectPeace[\s\S]*?<\/CENTER>\s*(<STRONG><IMG[\s\S]*?)<P/i
    );
    if (collectPeace) {
      const text = stripHtml(reconstructInitialCap(collectPeace[1]!));
      sections.push({
        id: 'collect-peace',
        title: 'The Second Collect, for Peace',
        pieces: [{ type: 'text', content: text }],
      });
    }
  } else {
    const collect2 = html.match(
      /Collect2[\s\S]*?<\/CENTER>\s*(<STRONG><IMG[\s\S]*?)<P/i
    );
    if (collect2) {
      const text = stripHtml(reconstructInitialCap(collect2[1]!));
      sections.push({
        id: 'collect-peace',
        title: 'The Second Collect at Evening Prayer',
        pieces: [{ type: 'text', content: text }],
      });
    }
  }

  // ─── Third Collect (for Grace / Aid against Perils) ───────────────
  if (session === 'morning') {
    const collectGrace = html.match(
      /CollectGrace[\s\S]*?<\/CENTER>\s*(<STRONG><IMG[\s\S]*?)<P/i
    );
    if (collectGrace) {
      const text = stripHtml(reconstructInitialCap(collectGrace[1]!));
      sections.push({
        id: 'collect-grace',
        title: 'The Third Collect, for Grace',
        pieces: [{ type: 'text', content: text }],
      });
    }
  } else {
    const collect3 = html.match(
      /Collect3[\s\S]*?<\/CENTER>\s*(<STRONG><IMG[\s\S]*?)<P/i
    );
    if (collect3) {
      const text = stripHtml(reconstructInitialCap(collect3[1]!));
      sections.push({
        id: 'collect-aid',
        title: 'The Third Collect, for Aid against all Perils',
        pieces: [{ type: 'text', content: text }],
      });
    }
  }

  // ─── Five Prayers / State Prayers ─────────────────────────────────
  const prayerKing = extractPrayer(html, 'PrayerKing', 'A Prayer for the King\'s Majesty', 'O');
  const prayerRoyal = extractPrayer(html, 'PrayerRoyal', 'A Prayer for the Royal Family', 'A');
  const prayerClergy = extractPrayer(html, 'PrayerClergy', 'A Prayer for the Clergy and People', 'A');
  const prayerChrysostom = extractPrayer(html, 'PrayerChrysostom', 'A Prayer of St. Chrysostom', 'A');

  const statesPieces: LiturgyPiece[] = [];
  if (session === 'morning') {
    statesPieces.push({ type: 'rubric', content: 'Then these five Prayers following are to be read here: Except when the Litany is read; and then only the two last are to be read, as they are there placed.' });
  }
  if (prayerKing) statesPieces.push(prayerKing);
  if (prayerRoyal) statesPieces.push(prayerRoyal);
  if (prayerClergy) statesPieces.push(prayerClergy);
  if (prayerChrysostom) statesPieces.push(prayerChrysostom);

  sections.push({
    id: 'state-prayers',
    title: 'Prayers',
    pieces: statesPieces,
  });

  // ─── The Grace ────────────────────────────────────────────────────
  const graceMatch = html.match(
    /2Cor13[\s\S]*?<STRONG><IMG[^>]*ALT="T"[^>]*>([\s\S]*?)<P/i
  );
  if (graceMatch) {
    const text = 'T' + stripHtml(reconstructInitialCap(graceMatch[1]!));
    sections.push({
      id: 'the-grace',
      title: 'The Grace',
      pieces: [
        { type: 'heading', content: '2 Corinthians 13' },
        { type: 'text', content: text },
      ],
    });
  }

  return sections;
}

// ─── Helper: Extract canticle text between anchor and next section ───────

function extractCanticle(html: string, anchorName: string, _latin: string, _initialLetter: string): string | null {
  // Find the named anchor, then the STRONG/IMG block, then text until <P
  const regex = new RegExp(
    `<A\\s+NAME\\s*=\\s*"${anchorName}"[^>]*>[\\s\\S]*?(<STRONG><IMG[\\s\\S]*?)<P`,
    'i'
  );
  const match = html.match(regex);
  if (!match) return null;

  const rawText = stripHtml(reconstructInitialCap(match[1]!));
  // Expand abbreviated Glory Be
  return rawText
    .replace(/Glory be to the Father, &c\.?/i, 'Glory be to the Father, and to the Son : and to the Holy Ghost;')
    .replace(/As it was in the beginning, &c\.?/i, 'As it was in the beginning, is now, and ever shall be : world without end. Amen.');
}

// ─── Helper: Extract a prayer by anchor name ────────────────────────────

function extractPrayer(html: string, anchorName: string, _title: string, _initialLetter: string): LiturgyPiece | null {
  const regex = new RegExp(
    `${anchorName}[\\s\\S]*?(<STRONG><IMG[\\s\\S]*?)<P`,
    'i'
  );
  const match = html.match(regex);
  if (!match) return null;

  const text = stripHtml(reconstructInitialCap(match[1]!));
  return { type: 'text', content: text };
}

// ─── Helper: Parse versicle-response blocks ─────────────────────────────

function parseVersicleBlock(html: string): LiturgyPiece[] {
  const pieces: LiturgyPiece[] = [];
  const lines = html.split(/\n|<BR\s*\/?>/i);

  for (const rawLine of lines) {
    const line = stripHtml(rawLine).trim();
    if (!line) continue;

    // Check for "Answer." or "Priest." or "Minister." prefix
    const speakerMatch = line.match(/^(Answer|Priest|Minister)\.\s*(.*)/i);
    if (speakerMatch) {
      pieces.push({
        type: 'versicle',
        speaker: speakerMatch[1]!,
        content: speakerMatch[2]!.trim(),
      });
    } else {
      pieces.push({ type: 'versicle', content: line });
    }
  }

  return pieces;
}

// ─── Occasional Prayers parser ──────────────────────────────────────────

interface OccasionalPrayer {
  id: string;
  title: string;
  text: string;
}

function parsePrayers(html: string): OccasionalPrayer[] {
  const prayers: OccasionalPrayer[] = [];
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Each prayer is introduced by a <CENTER><FONT COLOR="Red"><EM>Title</EM></FONT></CENTER>
  // followed by the prayer body starting with a decorative initial
  const prayerBlocks = html.split(/<CENTER>\s*<FONT\s+COLOR\s*=\s*"Red"[^>]*>\s*<EM>/i);

  for (let i = 1; i < prayerBlocks.length; i++) {
    const block = prayerBlocks[i]!;
    // Get title (up to </EM></FONT></CENTER>)
    const titleMatch = block.match(/^([\s\S]*?)<\/EM>/i);
    if (!titleMatch) continue;
    let title = stripHtml(titleMatch[1]!).replace(/\.$/, '').trim();
    if (!title) continue;

    // Get body (after </CENTER>, starts with <STRONG><IMG...>)
    const bodyMatch = block.match(/<\/CENTER>\s*(<STRONG><IMG[\s\S]*?)<(?:P|HR|CENTER)/i);
    if (!bodyMatch) continue;

    const text = stripHtml(reconstructInitialCap(bodyMatch[1]!));
    const id = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    prayers.push({ id, title, text });
  }

  return prayers;
}

// ─── Collects parser ────────────────────────────────────────────────────

interface Collect {
  id: string;
  occasion: string;
  collect: string;
  epistle?: string;
  gospel?: string;
}

function parseCollectsPage(html: string, filename: string): Collect[] {
  const collects: Collect[] = [];
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Find all anchor-based sections. Collects pages use <A NAME="..."> extensively.
  // Pattern: <H3> or <CENTER><I> or <CENTER><EM> for occasion titles
  // Followed by the collect text starting with decorative initial

  // Strategy: Split by <HR> (each major section) or by collect headers
  // The structure varies between pages, so we'll look for collect patterns directly.

  // Find all occasions marked by CENTER headings followed by prayer text
  const regex = /<CENTER[^>]*>\s*(?:<H[34][^>]*>)?\s*(?:<I>|<EM>)?\s*(?:<A[^>]*>)?\s*([\s\S]*?)(?:<\/A>)?\s*(?:<\/I>|<\/EM>)?\s*(?:<\/H[34]>)?\s*<\/CENTER>\s*<STRONG><IMG[^>]*ALT="([^"]*)"[^>]*>([\s\S]*?)(?=<CENTER|<HR|$)/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const rawTitle = stripHtml(match[1]!).trim();
    const initialLetter = match[2]!;
    const bodyRaw = match[3]!;

    if (!rawTitle || rawTitle.length < 3) continue;

    // The collect is the first paragraph (up to <P>)
    const collectMatch = bodyRaw.match(/^([\s\S]*?)<P/i);
    if (!collectMatch) continue;

    const text = initialLetter + stripHtml(reconstructInitialCap(collectMatch[1]!));

    // Clean up the title
    let occasion = rawTitle
      .replace(/\.$/, '')
      .replace(/^The\s+Collect\.?\s*/i, '')
      .trim();

    if (!occasion) occasion = rawTitle;

    const id = (filename.replace('.html', '') + '-' + occasion)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    collects.push({ id, occasion, collect: text });
  }

  return collects;
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ─── Morning Prayer ─────────────────────────────────────────────
  const morningHtml = fs.readFileSync(path.join(RAW_DIR, 'morning.html'), 'utf-8');
  const morningSections = parseOfficeHtml(morningHtml, 'morning');
  const morningFile = path.join(OUTPUT_DIR, 'morning-prayer.json');
  fs.writeFileSync(morningFile, JSON.stringify(morningSections, null, 2));
  console.log(`Morning Prayer: ${morningSections.length} sections`);

  // ─── Evening Prayer ─────────────────────────────────────────────
  const eveningHtml = fs.readFileSync(path.join(RAW_DIR, 'evening.html'), 'utf-8');
  const eveningSections = parseOfficeHtml(eveningHtml, 'evening');
  const eveningFile = path.join(OUTPUT_DIR, 'evening-prayer.json');
  fs.writeFileSync(eveningFile, JSON.stringify(eveningSections, null, 2));
  console.log(`Evening Prayer: ${eveningSections.length} sections`);

  // ─── Occasional Prayers ─────────────────────────────────────────
  const prayersHtml = fs.readFileSync(path.join(RAW_DIR, 'prayers.html'), 'utf-8');
  const prayers = parsePrayers(prayersHtml);
  const prayersFile = path.join(OUTPUT_DIR, 'prayers.json');
  fs.writeFileSync(prayersFile, JSON.stringify(prayers, null, 2));
  console.log(`Prayers: ${prayers.length} occasional prayers`);

  // ─── Collects ───────────────────────────────────────────────────
  const collectFiles = ['collects-xmas.html', 'collects-lent.html', 'collects-easter.html', 'collects-trinity.html', 'collects-saints.html'];
  const allCollects: Collect[] = [];

  for (const file of collectFiles) {
    const filePath = path.join(RAW_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  WARN: Missing ${file} — skipping`);
      continue;
    }
    const collectHtml = fs.readFileSync(filePath, 'utf-8');
    const collects = parseCollectsPage(collectHtml, file);
    allCollects.push(...collects);
    console.log(`  ${file}: ${collects.length} collects`);
  }

  if (allCollects.length > 0) {
    const collectsFile = path.join(OUTPUT_DIR, 'collects.json');
    fs.writeFileSync(collectsFile, JSON.stringify(allCollects, null, 2));
    console.log(`Collects: ${allCollects.length} total`);
  } else {
    console.log('Collects: skipped (source files not yet available)');
  }
}

main();
