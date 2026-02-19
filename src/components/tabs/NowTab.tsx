import { useState, useMemo, useRef, useCallback } from 'react';
import type { Session, PlanId, Translation, LiturgicalSeason } from '../../engine/types';
import { useDate } from '../../hooks/useDate';
import { useOffice } from '../../hooks/useOffice';
import { useCompletion } from '../../hooks/useCompletion';
import { LiturgySection } from '../office/LiturgySection';

interface Props {
  planId: PlanId;
  translation: Translation;
  cutoffHour: number;
}

const SEASON_COLORS: Record<LiturgicalSeason, string> = {
  advent: 'var(--color-season-advent)',
  christmas: 'var(--color-season-christmas)',
  epiphany: 'var(--color-season-epiphany)',
  'pre-lent': 'var(--color-season-trinity)',
  lent: 'var(--color-season-lent)',
  'holy-week': 'var(--color-season-holy-week)',
  easter: 'var(--color-season-easter)',
  ascension: 'var(--color-season-ascension)',
  whitsun: 'var(--color-season-whitsun)',
  trinity: 'var(--color-season-trinity)',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function NowTab({ planId, translation, cutoffHour }: Props) {
  const date = useDate();
  const defaultSession: Session = date.getHours() < cutoffHour ? 'morning' : 'evening';
  const [session, setSession] = useState<Session>(defaultSession);

  const { plan, loading, error } = useOffice(date, session, planId, translation);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const currentSession = plan?.sessions[0];
  const sectionIds = useMemo(
    () => currentSession?.sections.filter(s => s.isCheckable).map(s => s.id) ?? [],
    [currentSession],
  );

  const dateStr = plan?.date ?? date.toISOString().split('T')[0]!;
  const { completedSections, toggleSection, isSessionComplete } = useCompletion(
    dateStr, session, planId, sectionIds,
  );

  const handleToggle = useCallback((sectionId: string) => {
    toggleSection(sectionId);

    // Scroll to next uncompleted section
    const idx = sectionIds.indexOf(sectionId);
    if (idx >= 0 && !completedSections.has(sectionId)) {
      // Just completed this one — find the next uncompleted
      for (let i = idx + 1; i < sectionIds.length; i++) {
        const nextId = sectionIds[i]!;
        if (!completedSections.has(nextId)) {
          const el = sectionRefs.current.get(nextId);
          if (el) {
            setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
          }
          break;
        }
      }
    }
  }, [sectionIds, completedSections, toggleSection]);

  const seasonColor = plan?.season ? SEASON_COLORS[plan.season] : 'var(--color-accent)';

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seasonColor }} />
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-ui)' }}>
            {currentSession?.title ?? 'Twice Daily'}
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
          {formatDate(date)}
          {plan?.liturgicalDay && (
            <> &middot; {plan.liturgicalDay.name}</>
          )}
        </p>

        {/* Session toggle */}
        <div className="flex gap-2 mt-3" style={{ fontFamily: 'var(--font-ui)' }}>
          <button
            onClick={() => setSession('morning')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              session === 'morning'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            Morning
          </button>
          <button
            onClick={() => setSession('evening')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              session === 'evening'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            Evening
          </button>
        </div>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <p className="py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
          Loading office...
        </p>
      )}
      {error && (
        <p className="py-12 text-center" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      {/* Session complete banner */}
      {isSessionComplete && !loading && (
        <div className="mb-4 p-3 rounded-lg text-center text-sm font-medium"
          style={{ backgroundColor: 'var(--color-check)', color: 'var(--color-accent-contrast)', fontFamily: 'var(--font-ui)' }}
        >
          Session complete
        </div>
      )}

      {/* Sections */}
      {currentSession && !loading && (
        <div>
          {currentSession.sections.map(section => (
            <div
              key={section.id}
              ref={el => {
                if (el) sectionRefs.current.set(section.id, el);
              }}
            >
              <LiturgySection
                section={section}
                isCompleted={completedSections.has(section.id)}
                onToggle={() => handleToggle(section.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
