# CLAUDE.md — Twice Daily

## Project Overview

**Twice Daily** is an offline-first Progressive Web App (PWA) that programmatically assembles the Anglican Daily Office (Morning & Evening Prayer) from the 1662 Book of Common Prayer. The app has three tabs: **Office** (shows the liturgy — remembers what the user was last reading and auto-advances to today's morning prayer on a new day), **History** (list and calendar views with completion tracking), and **Settings** (plan, translation, text size). Users check off sections as they pray and their progress is tracked.

### MVP Scope
- **3 Bible translations**: KJV, WEB (American), WEB (British)
- **3 reading plans**:
  - 1662 Original (civil calendar lectionary)
  - 1662 Revised / 1922 (liturgical calendar lectionary)
  - M'Cheyne (Bible-in-a-year, no liturgical wrapper)
- **Full BCP liturgical framework** for the two 1662 plans (opening sentences → exhortation → confession → psalms → lessons → canticles → creed → prayers → grace)
- **Pure scripture readings** for M'Cheyne (2 readings per session, no liturgy)

---

## Tech Stack

- **React 19** + **TypeScript** (strict mode, `noUncheckedIndexedAccess`)
- **Vite 6** with `@tailwindcss/vite` (Tailwind v4)
- **Dexie.js** (IndexedDB wrapper) for settings + completion persistence
- **vite-plugin-pwa** for service worker + offline caching
- **vite-plugin-qrcode** for mobile testing QR code in dev server
- **Vitest** for unit tests
- **tsx** for running build scripts (Node.js)

### Key Commands
```bash
npm run dev          # Start Vite dev server (host exposed for mobile testing)
npm run build        # tsc -b && vite build
npm run build:data   # Run all data pipeline scripts (Bible + lectionary + liturgy + validation)
npm test             # vitest
```

### Testing with a different date
Append `?date=YYYY-MM-DD` to the URL to override "today" for testing:
```
http://localhost:5173/?date=2025-12-25   # Christmas Day
http://localhost:5173/?date=2026-04-05   # Easter Day 2026
```

---

## Architecture

The app has two main layers:

### 1. Data Pipeline (`scripts/`)
Build-time scripts that parse external source data into normalized JSON in `public/data/`. These scripts run via `npm run build:data` and are **not** part of the app bundle.

### 2. Runtime App (`src/`)
A React SPA that assembles and renders the daily office at runtime by fetching the pre-built JSON files.

---

## Data Pipeline (scripts/)

All scripts output to `public/data/`. Sources live in `/Users/jack-braga/Documents/Projects/dailyOffice/`.

### Shared Utilities

| File | Purpose |
|------|---------|
| `scripts/shared/book-names.ts` | Canonical book registry — maps between KJV filenames, USFM codes, display names, abbreviations (e.g., "Isa.", "Cant.", "1 Chr."), and slug IDs. All 66 Protestant canon books. |
| `scripts/shared/reading-ref-parser.ts` | Parses human-readable references ("Gen 1:1-25", "1 Thess 4:13", "Ps 119:1-32") into `ReadingRef` objects. Handles cross-chapter spans, abbreviation variants, Roman numeral prefixes. Most reused utility. |

### Bible Parsers

| Script | Input | Output |
|--------|-------|--------|
| `scripts/parse-kjv.ts` | `dailyOffice/Bible-kjv-master/*.json` | `public/data/bible/kjv/{book-id}.json` (66 files) |
| `scripts/parse-usfm.ts` | `dailyOffice/engwebp_usfm/*.usfm` (USA) and `dailyOffice/engwebpb_usfm/*.usfm` (British) | `public/data/bible/web-usa/` and `public/data/bible/web-brit/` (66 files each) |

USFM parser handles: `\c`, `\v`, `\p`, `\q1/q2` (poetry), `\d` (superscriptions), `\w...\w*` (strips Strong's numbers), `\f...\f*` (strips footnotes), `\qs...\qs*` (keeps Selah).

### Lectionary Parsers

| Script | Input Source | Output |
|--------|-------------|--------|
| `scripts/parse-lectionary-original.ts` | `dailyOffice/1662-BCP-Lectionary/months/*.json` (spagosx repo, 12 monthly files) | `public/data/lectionary/1662-original.json` — keyed by `MM-DD` |
| `scripts/parse-lectionary-revised.ts` | `scripts/data/1922-raw/*.html` (10 HTML pages scraped from eskimo.com) | `public/data/lectionary/1662-revised.json` — keyed by liturgical day name |
| `scripts/parse-mcheyne.ts` | `scripts/data/mcheyne-complete.json` (scraped from bibleplan.org) | `public/data/lectionary/mcheyne.json` — 365 entries, keyed by day-of-year |

**Known source data corrections** (applied during parsing):
- 1662 Original (`parse-lectionary-original.ts`): Fixes 5 upstream typos in the spagosx repo (e.g., "Exodus 115:1-22" → "Exodus 15:1-22")
- 1662 Revised (`parse-lectionary-revised.ts`): Fixes 3 typos in the eskimo.com HTML (e.g., "Ephesians 9:10" → "Ephesians 6:10") plus parser fixes for BibleGateway URL format (`:999` stripping, cross-chapter reference handling, comma-separated verse continuations)

### Liturgy Text Scraper

| Script | Input Source | Output |
|--------|-------------|--------|
| `scripts/scrape-liturgy-texts.ts` | `scripts/data/liturgy-raw/*.html` (6 HTML files from eskimo.com's 1987 Cambridge Final Standard Text edition) | `public/data/liturgy/morning-prayer.json` (21 sections), `evening-prayer.json` (20 sections), `collects.json` (246 entries), `prayers.json` (9 prayers) |

**Liturgy text verification**: The scraped liturgy JSON has been cross-checked against the Church of England's digital BCP and the 1662 Baskerville printing (PDF). Post-scraping corrections applied to the JSON files include: missing "Priest." speaker tags on versicles, "show" → "shew" (traditional BCP spelling), missing "The Lord's Name be praised" response, missing Lord's Prayer rubric, corrected EP rubric articles/punctuation. The opening sentences, The Grace, and Easter Anthems are no longer stored as static text — they are loaded dynamically from the Bible translation at runtime.

### Validator

| Script | Purpose |
|--------|---------|
| `scripts/validate-readings.ts` | Iterates every `ReadingRef` in all 3 lectionaries, verifies book/chapter/verse exists in all 3 Bible translations. Skips apocryphal books. Fails the build on any error. **4868 refs, 0 errors.** |

---

## Runtime Architecture (src/)

### Engine Layer (`src/engine/`)

| File | Purpose |
|------|---------|
| `types.ts` | All shared TypeScript interfaces: `LiturgicalDay`, `ReadingRef`, `BibleVerse`, `SessionSection`, `DailyPlan`, `SectionContent` union type, etc. |
| `easter.ts` | `computeEaster()` (Anonymous Gregorian algorithm), `computeMoveableFeasts()` — derives Ash Wednesday, Palm Sunday, Easter, Ascension, Whitsunday, Trinity, Advent Sunday. |
| `calendar.ts` | `resolveLiturgicalDay(date)` — determines season, week-of-season, holy day status (25 fixed holy days + moveable feasts), precedence rules, collect ID assignment. |
| `psalter.ts` | 30-day psalter cycle from BCP. `getPsalmsForDay(date, session)`, `shouldOmitVenite(date)`, Psalm 119 verse divisions for days 24-26. Day 31 → Day 30, last day of February → Day 30. |
| `lectionary-resolver.ts` | `resolveReadings(date, session, planId, litDay)` — resolves daily readings for each plan type. Lazy-loads lectionary JSON. |
| `liturgy-assembler.ts` | `assembleOffice(date, session, planId, translation)` — top-level orchestrator that wires calendar + plan + lectionary + psalter + Bible loader → `DailyPlan`. |

### Plan Layer (`src/plans/`)

| File | Purpose |
|------|---------|
| `types.ts` | `PlanConfig` and `PlanAssembler` interfaces |
| `bcp-1662.ts` | Shared BCP plan implementation for both Original and Revised lectionaries. Builds 8 sections per session: Preparation, Psalms, First Lesson, Canticle 1, Second Lesson, Canticle 2, Creed, Prayers. Handles: opening sentence rotation (11 sentences, day-of-year based), Lenten canticle swap (Te Deum → Benedicite), Day 19 Venite omission, Easter Anthems, collect-of-day lookup. **Dynamic Bible text**: Opening Sentences (11 refs), The Grace (2 Cor 13:14), and Easter Anthems (1 Cor 5:7-8, Rom 6:9-11, 1 Cor 15:20-22) are all loaded from the user's selected Bible translation at runtime. |
| `mcheyne.ts` | M'Cheyne plan — 2 pure scripture sections per session, no liturgical wrapper. |
| `index.ts` | Plan registry: `PLANS` map + `getPlan(planId)` |

### Services (`src/services/`)

| File | Purpose |
|------|---------|
| `bible-loader.ts` | `loadBook()`, `extractReading()`, `loadReading()`, `formatRef()`. In-memory Map cache. Fetches `/data/bible/{translation}/{bookId}.json`. |

### Database (`src/db/`)

| File | Purpose |
|------|---------|
| `schema.ts` | Dexie database with 2 tables: `completions` (tracks section completion per date/session/plan) and `settings` (key-value store for user preferences). |

### Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useSettings.ts` | Loads/persists settings (planId, translation, textSize, lastReadDate, lastReadSession) from IndexedDB. Applies text size to CSS custom property. Provides `updateLastRead()` for persisting the user's last-read date+session. |
| `useDate.ts` | Returns the "current" date, supporting `?date=YYYY-MM-DD` query param override. |
| `useOffice.ts` | Calls `assembleOffice()` and returns the `DailyPlan` with loading/error states. |
| `useCompletion.ts` | Tracks which sections are completed for a date/session, persists to IndexedDB. Provides `toggleSection()`, `isSessionComplete`, `markSessionComplete()`. Also exports `getCompletionsForDateRange()` and `getCompletionSummary()` for the History tab. |

### Components (`src/components/`)

| File | Purpose |
|------|---------|
| `office/LiturgySection.tsx` | Renders a `SessionSection` — title, subtitle, content blocks (rubric, static text, scripture, versicle-response, heading), checkmark toggle button. |
| `office/ScriptureReading.tsx` | Renders Bible verses — handles both prose (inline verse numbers) and poetry (indented lines). Psalm superscriptions shown in italic. |
| `tabs/OfficeTab.tsx` | Main reading view. Remembers last-read date+session, auto-advances to today's morning on a new day. Morning/evening toggle, liturgical season color dot, scroll-to-next on check. Accepts `navigateDate`/`navigateSession` from History tab. |
| `tabs/HistoryTab.tsx` | Two view modes (List/Calendar) with segmented controls. Calendar supports week/month/year zoom with pinch-to-zoom and segmented control. "Today" floating button. Delegates to `history/ListView.tsx`, `history/CalendarView.tsx`. |
| `tabs/SettingsTab.tsx` | Reading plan picker, translation picker, text size. |
| `history/DayRow.tsx` | Shared component showing a day's morning/evening progress bars with "Open" buttons. Used in both list expanded rows and calendar inline details. |
| `history/ListView.tsx` | Infinite-scroll list of days using `IntersectionObserver`. Expandable rows with `DayRow` detail. |
| `history/CalendarView.tsx` | Week/month/year calendar grids. Tap a day to see inline `DayRow` detail. Pinch-to-zoom gesture support. Year view shows mini month grids (tap to zoom into month). |

### App Shell

| File | Purpose |
|------|---------|
| `App.tsx` | 3-tab navigation (Office, History, Settings). Wires `useSettings` into child components. Manages navigate state for History→Office tab transitions. |
| `main.tsx` | React 19 root render. |
| `index.css` | CSS custom properties for fonts, colors, liturgical season colors. Tailwind v4 import. |

---

## Data Shapes

### Bible Book JSON (`public/data/bible/{translation}/{book-id}.json`)
```typescript
{
  id: string;           // "genesis", "1-samuel"
  name: string;         // "Genesis", "1 Samuel"
  shortName: string;    // "Gen", "1 Sam"
  chapters: {
    chapter: number;
    superscription?: string;  // Psalm superscriptions
    verses: {
      verse: number;
      text: string;
      poetry?: number;  // 1 or 2 for indentation level
    }[];
  }[];
}
```

### Lectionary JSON

**1662 Original** (`1662-original.json`): `Record<"MM-DD", { morning: { first, second }, evening: { first, second } }>`

**1662 Revised** (`1662-revised.json`): `{ regular: Record<liturgicalKey, ...>, fixed: Record<fixedKey, ...> }` — keys like `"advent1"`, `"advent1-monday"`, `"trinity5-wednesday"`

**M'Cheyne** (`mcheyne.json`): `Array<{ day: number, morning: ReadingRef[], evening: ReadingRef[] }>`

### Liturgy JSON (`public/data/liturgy/`)
Each file is an array of sections with `{ id, title, pieces }`. Pieces have `{ type, content, speaker? }` where type is `"rubric"`, `"text"`, `"versicle"`, or `"heading"`.

---

## Liturgical Calendar

### Seasons (in order)
Advent → Christmas (Dec 25–Jan 5) → Epiphany (Jan 6–Septuagesima) → Pre-Lent (Septuagesima–Shrove Tuesday) → Lent (Ash Wednesday–Palm Saturday) → Holy Week → Easter → Ascensiontide → Whitsun → Trinity (to Saturday before Advent)

### Key Rules
- **Easter computation**: Anonymous Gregorian algorithm
- **Advent Sunday**: Nearest Sunday to November 30
- **Holy day precedence**: Principal moveable feasts > Fixed holy days > Sunday propers > Ordinary
- **Minor saints on Sundays**: Sunday takes precedence
- **Psalter**: 30-day cycle mapped to day of month. Day 31 = Day 30. Last day of Feb = Day 30.
- **Psalm 119**: Divided across days 24-26 (evening/morning/evening/morning/evening)
- **Venite omission**: Day 19 morning (Psalm 95 appears in ordinary course)
- **Lenten swap**: Te Deum → Benedicite during Lent and Holy Week
- **Easter Day**: Easter Anthems replace Venite

### Apocryphal Books
References are stored in the lectionary data but no Bible text is rendered. The UI shows "reference only" labels for: Ecclesiasticus, Wisdom, Tobit, Baruch, 1/2 Maccabees, Prayer of Manasses, Song of Three Children, Judith, Susanna, Bel and the Dragon, 1/2 Esdras.

---

## PWA Configuration

Configured in `vite.config.ts`:
- **Base path**: `/twice-daily/` (for GitHub Pages subdirectory deployment)
- **Precache**: All app assets (HTML, CSS, JS, icons)
- **Runtime cache**: `CacheFirst` for `/data/bible/**/*.json` and `/data/(lectionary|liturgy)/*.json`
- **Manifest**: standalone display, theme color `#1a1a2e`, bg `#faf9f6`
- **Service worker**: `autoUpdate` registration type

**Important**: All `fetch()` calls in the app use `import.meta.env.BASE_URL` as a prefix (e.g., `` `${import.meta.env.BASE_URL}data/bible/...` ``) to support the GitHub Pages subdirectory deployment.

## Deployment

Deployed to GitHub Pages at `https://jack-braga.github.io/twice-daily/`. The `base: '/twice-daily/'` setting in `vite.config.ts` ensures all asset paths are relative to the subdirectory.

---

## External Data Sources

| Source | Location | Notes |
|--------|----------|-------|
| KJV JSON | `dailyOffice/Bible-kjv-master/` | 66 pre-formatted JSON files |
| WEB USA USFM | `dailyOffice/engwebp_usfm/` | Standard USFM format |
| WEB British USFM | `dailyOffice/engwebpb_usfm/` | Standard USFM format |
| 1662 Lectionary | `dailyOffice/1662-BCP-Lectionary/` | spagosx GitHub repo (monthly JSON files, originally CSV) |
| 1922 Revised Lectionary | `scripts/data/1922-raw/` | 10 HTML pages scraped from eskimo.com |
| M'Cheyne | `scripts/data/mcheyne-complete.json` | Scraped from bibleplan.org |
| BCP Liturgical Texts | `scripts/data/liturgy-raw/` | 6 HTML pages from eskimo.com (1987 Cambridge FST edition) |

---

## Tests

Unit tests in `src/engine/__tests__/`:
- `easter.test.ts` — Easter computation for known years
- `psalter.test.ts` — Day-of-month mapping, Day 31, February edge cases
- `calendar.test.ts` — Season determination, holy day precedence, liturgical day resolution

Run with: `npm test`

---

## Known Limitations / Future Work

1. **Collect lookup**: The collect-of-day mapping (`bcp-1662.ts` `buildCollectMap()`) matches collects by searching the `occasion` text field. Some collects may not match if the scraped occasion text doesn't contain the expected keywords.
2. **Alternative canticles**: The BCP provides alternatives (Jubilate for Benedictus, Cantate Domino for Magnificat, etc.) but the app currently always uses the primary canticle. A toggle could be added.
3. **First Evensong**: The 1662 Revised lectionary has `firstEvensong` readings for some holy days (the eve before). This is not yet wired into the calendar resolver.
4. **No dark mode** (future feature).
5. **No font picker** (CSS custom properties are ready: `--font-body`, `--font-ui`).
6. **No Litany** support (the HTML is downloaded in `scripts/data/liturgy-raw/litany.html` but not yet parsed or included).
7. **Heatmap component**: A GitHub-style 12-week contribution heatmap was built but is currently unused (kept as commented-out code in `HistoryTab.tsx` for potential future use elsewhere).
