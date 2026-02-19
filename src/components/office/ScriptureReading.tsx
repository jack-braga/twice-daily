import type { BibleVerse } from '../../engine/types';

interface Props {
  verses: BibleVerse[];
  superscription?: string;
}

export function ScriptureReading({ verses, superscription }: Props) {
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
          {verses.map(v => (
            <p
              key={v.verse}
              style={{ paddingLeft: v.poetry ? `${v.poetry * 1.5}rem` : '0' }}
            >
              <sup className="text-xs mr-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                {v.verse}
              </sup>
              {v.text}
            </p>
          ))}
        </div>
      ) : (
        <p>
          {verses.map(v => (
            <span key={v.verse}>
              <sup className="text-xs mr-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                {v.verse}
              </sup>
              {v.text}{' '}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
