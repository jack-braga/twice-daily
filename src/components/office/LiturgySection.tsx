import type { SessionSection, SectionContent, ReadingRef } from '../../engine/types';
import { ScriptureReading } from './ScriptureReading';
import { formatRef } from '../../services/bible-loader';

interface Props {
  section: SessionSection;
  isCompleted: boolean;
  onToggle: () => void;
  onExpandScripture?: (ref: ReadingRef) => void;
}

export function LiturgySection({ section, isCompleted, onToggle, onExpandScripture }: Props) {
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
          <ContentBlock key={i} block={block} onExpandScripture={onExpandScripture} />
        ))}
      </div>

      {section.isCheckable && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onToggle}
            className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-[var(--color-check)] border-[var(--color-check)] text-[var(--color-accent-contrast)]'
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

function ContentBlock({ block, onExpandScripture }: { block: SectionContent; onExpandScripture?: (ref: ReadingRef) => void }) {
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
      return (
        <ScriptureCard
          reference={block.reference}
          onExpand={onExpandScripture ? () => onExpandScripture(block.reference) : undefined}
        >
          <ScriptureReading verses={block.verses} />
        </ScriptureCard>
      );
  }
}

function ScriptureCard({
  reference,
  onExpand,
  children,
}: {
  reference: ReadingRef;
  onExpand?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg shadow-sm border my-3 overflow-hidden"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Card header: reference label + expand button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}
        >
          {formatRef(reference)}
        </span>
        {onExpand && (
          <button
            onClick={onExpand}
            className="p-1.5 -mr-1 rounded transition-colors hover:bg-[var(--color-hover)]"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Open full chapter"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}
      </div>
      {/* Card body */}
      <div className="px-4 pb-3">
        {children}
      </div>
    </div>
  );
}

function StaticText({ text }: { text: string }) {
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
