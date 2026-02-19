import type { BibleVerse } from '../../engine/types';

interface Props {
  verses: BibleVerse[];
  superscription?: string;
  highlightRange?: { start: number; end: number };
}

function isHighlighted(verse: number, range?: { start: number; end: number }): boolean {
  if (!range) return false;
  return verse >= range.start && verse <= range.end;
}

const HIGHLIGHT_STYLE = {
  backgroundColor: 'var(--color-highlight, rgba(26, 26, 46, 0.15))',
  borderLeft: '3px solid var(--color-accent, #1a1a2e)',
};

export function ScriptureReading({ verses, superscription, highlightRange }: Props) {
  if (verses.length === 0) return null;

  // Detect if this is poetry (any verse has a poetry level)
  const isPoetry = verses.some(v => v.poetry != null);

  return (
    <div className="my-3">
      {superscription && (
        <p className="italic mb-2" style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>
          {superscription}
        </p>
      )}
      {isPoetry ? (
        <div className="space-y-0.5">
          {verses.map((v, i) => {
            const hl = isHighlighted(v.verse, highlightRange);
            return (
              <p
                key={i}
                className={hl ? 'rounded-r px-1 -mx-1' : ''}
                style={{
                  paddingLeft: v.poetry ? `${v.poetry * 1.5}rem` : '0',
                  ...(hl ? HIGHLIGHT_STYLE : {}),
                }}
              >
                <sup className="text-xs mr-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                  {v.verse}
                </sup>
                {v.text}
              </p>
            );
          })}
        </div>
      ) : (
        <p>
          {verses.map((v, i) => {
            const hl = isHighlighted(v.verse, highlightRange);
            return (
              <span
                key={i}
                className={hl ? 'rounded-r px-0.5' : ''}
                style={hl ? HIGHLIGHT_STYLE : undefined}
              >
                <sup className="text-xs mr-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                  {v.verse}
                </sup>
                {v.text}{' '}
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
}
