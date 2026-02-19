import type { SessionSection, SectionContent } from '../../engine/types';
import { ScriptureReading } from './ScriptureReading';

interface Props {
  section: SessionSection;
  isCompleted: boolean;
  onToggle: () => void;
}

export function LiturgySection({ section, isCompleted, onToggle }: Props) {
  return (
    <section
      className={`py-6 border-b transition-opacity ${isCompleted ? 'opacity-40' : ''}`}
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mb-3">
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {section.title}
        </h2>
        {section.subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
            {section.subtitle}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {section.content.map((block, i) => (
          <ContentBlock key={i} block={block} />
        ))}
      </div>

      {section.isCheckable && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onToggle}
            className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-[var(--color-check)] border-[var(--color-check)] text-white'
                : 'border-[var(--color-border)] text-transparent hover:border-[var(--color-check)]'
            }`}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {isCompleted && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        </div>
      )}
    </section>
  );
}

function ContentBlock({ block }: { block: SectionContent }) {
  switch (block.type) {
    case 'rubric':
      return (
        <p className="italic text-sm" style={{ color: 'var(--color-rubric)' }}>
          {block.text}
        </p>
      );
    case 'heading':
      return (
        <h3
          className="font-semibold mt-4 mb-1"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {block.text}
        </h3>
      );
    case 'static-text':
      return <StaticText text={block.text} />;
    case 'versicle-response':
      return (
        <p>
          <span className="italic" style={{ color: 'var(--color-text-muted)', fontSize: '0.85em' }}>
            {block.leader}.{' '}
          </span>
          <span className="font-semibold">{block.people}</span>
        </p>
      );
    case 'scripture':
      return <ScriptureReading verses={block.verses} />;
  }
}

function StaticText({ text }: { text: string }) {
  // Split on newlines for multi-line liturgical texts (psalms, canticles)
  const lines = text.split('\n');
  if (lines.length === 1) {
    return <p>{text}</p>;
  }
  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}
