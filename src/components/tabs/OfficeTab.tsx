import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Session, PlanId, Translation, LiturgicalSeason, ReadingRef } from '../../engine/types';
import { useOffice } from '../../hooks/useOffice';
import { useCompletion } from '../../hooks/useCompletion';
import { todayStr, daysBetween } from '../../utils/date';
import { isPlanComplete } from '../../utils/plan-day';
import { getPlan } from '../../plans';
import { LiturgySection } from '../office/LiturgySection';
import { BibleReaderModal } from '../office/BibleReaderModal';

type LastReadChange = (date: string, session: Session) => void;

interface Props {
  planId: PlanId;
  translation: Translation;
  lastReadDate: string;
  lastReadSession: Session;
  onLastReadChange: LastReadChange;
  navigateDate?: string;
  navigateSession?: Session;
  onNavigateConsumed?: () => void;
  planStartDate?: string | null;
  onRestartPlan?: () => void;
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

export function OfficeTab({
  planId, translation,
  lastReadDate, lastReadSession,
  onLastReadChange,
  navigateDate, navigateSession,
  onNavigateConsumed,
  planStartDate,
  onRestartPlan,
}: Props) {
  const planConfig = getPlan(planId).config;
  const isSingleSession = planConfig.sessions.length === 1 && planConfig.sessions[0] === 'daily';

  // Determine initial date + session — always restore last-read position
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    if (navigateDate) return navigateDate;
    // ?date= URL override for dev testing
    const dateParam = new URLSearchParams(window.location.search).get('date');
    if (dateParam) return dateParam;
    // Restore last-read position; first launch falls back to today
    return lastReadDate || todayStr();
  });

  const [session, setSession] = useState<Session>(() => {
    if (isSingleSession) return 'daily';
    if (navigateDate && navigateSession) return navigateSession;
    const params = new URLSearchParams(window.location.search);
    if (params.get('date')) return 'morning';
    // Restore last-read session; first launch defaults to morning
    return lastReadDate ? lastReadSession : 'morning';
  });

  // When plan changes, update session type
  useEffect(() => {
    if (isSingleSession && session !== 'daily') {
      setSession('daily');
    } else if (!isSingleSession && session === 'daily') {
      setSession('morning');
    }
  }, [isSingleSession, session]);

  // Handle navigation from History tab
  useEffect(() => {
    if (navigateDate) {
      setCurrentDateStr(navigateDate);
      setSession(isSingleSession ? 'daily' : (navigateSession ?? 'morning'));
      onNavigateConsumed?.();
    }
  }, [navigateDate, navigateSession, onNavigateConsumed, isSingleSession]);

  // Parse date string to Date object for the office hook
  const date = useMemo(() => new Date(currentDateStr + 'T00:00:00'), [currentDateStr]);

  // Check if plan is complete
  const planComplete = planConfig.needsStartDate && planStartDate && planConfig.totalDays
    ? isPlanComplete(planStartDate, currentDateStr, planConfig.totalDays)
    : false;

  // Check if plan hasn't started yet (current date is before start date)
  const planNotStarted = planConfig.needsStartDate && planStartDate
    ? daysBetween(planStartDate, currentDateStr) < 0
    : false;

  const { plan, loading, error } = useOffice(date, session, planId, translation, planStartDate);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [readerRef, setReaderRef] = useState<ReadingRef | null>(null);

  const currentSession = plan?.sessions[0];
  const sectionIds = useMemo(
    () => currentSession?.sections.filter(s => s.isCheckable).map(s => s.id) ?? [],
    [currentSession],
  );

  const dateStr = plan?.date ?? currentDateStr;
  const { completedSections, toggleSection, isSessionComplete } = useCompletion(
    dateStr, session, planId, sectionIds,
  );

  // Persist last-read when session or date changes
  useEffect(() => {
    if (dateStr) {
      onLastReadChange(dateStr, session);
    }
  }, [dateStr, session, onLastReadChange]);

  const handleSessionChange = useCallback((newSession: Session) => {
    setSession(newSession);
    onLastReadChange(currentDateStr, newSession);
  }, [currentDateStr, onLastReadChange]);

  const handleToggle = useCallback((sectionId: string) => {
    toggleSection(sectionId);

    // Scroll to next uncompleted section
    const idx = sectionIds.indexOf(sectionId);
    if (idx >= 0 && !completedSections.has(sectionId)) {
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
          {plan?.liturgicalDay && !isSingleSession && (
            <> &middot; {plan.liturgicalDay.name}</>
          )}
          {plan?.planDay != null && plan.planTotalDays != null && (
            <> &middot; Day {plan.planDay} of {plan.planTotalDays}</>
          )}
        </p>

        {/* Session toggle — hidden for single-session plans */}
        {!isSingleSession && (
          <div className="flex gap-2 mt-3" style={{ fontFamily: 'var(--font-ui)' }}>
            <button
              onClick={() => handleSessionChange('morning')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                session === 'morning'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => handleSessionChange('evening')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                session === 'evening'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
              }`}
            >
              Evening
            </button>
          </div>
        )}
      </div>

      {/* Plan not started banner */}
      {planNotStarted && !loading && planStartDate && (
        <div className="mb-4 p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-border)', fontFamily: 'var(--font-ui)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            Plan starts on {new Date(planStartDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            No reading for this date.
          </p>
        </div>
      )}

      {/* Plan complete banner */}
      {planComplete && !loading && (
        <div className="mb-4 p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-border)', fontFamily: 'var(--font-ui)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
            Plan complete
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
            You have finished all {planConfig.totalDays} days.
          </p>
          {onRestartPlan && (
            <button
              onClick={onRestartPlan}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
            >
              Restart from today
            </button>
          )}
        </div>
      )}

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
      {isSessionComplete && !loading && !planComplete && !planNotStarted && (
        <div className="mb-4 p-3 rounded-lg text-center text-sm font-medium"
          style={{ backgroundColor: 'var(--color-check)', color: 'var(--color-accent-contrast)', fontFamily: 'var(--font-ui)' }}
        >
          Session complete
        </div>
      )}

      {/* Sections */}
      {currentSession && !loading && !planComplete && !planNotStarted && (
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
                onExpandScripture={(ref) => setReaderRef(ref)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bible Reader modal */}
      {readerRef && (
        <BibleReaderModal
          originRef={readerRef}
          translation={translation}
          onClose={() => setReaderRef(null)}
        />
      )}
    </div>
  );
}
