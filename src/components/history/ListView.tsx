import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import type { PlanId, Session } from '../../engine/types';
import { getCompletionSummary } from '../../hooks/useCompletion';
import { todayStr, formatDateStr, addDays } from '../../utils/date';
import { isDateInPlanRange } from '../../utils/plan-day';
import { getPlan } from '../../plans';
import { DayRow } from './DayRow';

interface Props {
  planId: PlanId;
  onOpen: (date: string, session: Session) => void;
  onTodayElement?: (el: HTMLElement | null) => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  planStartDate?: string | null;
}

function monthStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function monthEnd(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return formatDateStr(last);
}

function nextMonthStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return formatDateStr(d);
}

function prevMonthStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(0);
  d.setDate(1);
  return formatDateStr(d);
}

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let current = start;
  while (current <= end) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

function monthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

const MAX_MONTHS = 12;
const PULL_THRESHOLD = 60;
const SCROLL_EDGE_PX = 50;
const SPINNER_DURATION = 400; // ms to show spinner

export function ListView({ planId, onOpen, onTodayElement, scrollContainerRef, planStartDate }: Props) {
  const today = todayStr();

  const [rangeStart, setRangeStart] = useState(() => monthStart(today));
  const [rangeEnd, setRangeEnd] = useState(today);

  const futureMonthsRef = useRef(0);
  const pastMonthsRef = useRef(0);

  const [completions, setCompletions] = useState<Map<string, Record<string, number>>>(new Map());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const todayRowRef = useRef<HTMLDivElement | null>(null);

  // Pull-to-load state (touch/mobile)
  const [pullTopOffset, setPullTopOffset] = useState(0);
  const [pullBottomOffset, setPullBottomOffset] = useState(0);
  const touchStartRef = useRef<{ y: number; edge: 'top' | 'bottom' | null }>({ y: 0, edge: null });

  // Loading spinner state
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingBottom, setLoadingBottom] = useState(false);

  // Guard against firing on initial mount
  const mountedRef = useRef(false);

  useEffect(() => {
    getCompletionSummary(rangeStart, rangeEnd, planId).then(setCompletions);
  }, [rangeStart, rangeEnd, planId]);

  // Scroll to today on first mount, then enable scroll detection
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      todayRowRef.current?.scrollIntoView({ block: 'center' });
      setTimeout(() => { mountedRef.current = true; }, 300);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const loadNewer = useCallback(() => {
    if (futureMonthsRef.current >= MAX_MONTHS) return;
    setLoadingTop(true);
    setTimeout(() => {
      setRangeEnd(prev => {
        const endOfMonth = monthEnd(prev);
        if (prev < endOfMonth) {
          return endOfMonth;
        }
        futureMonthsRef.current++;
        const next = nextMonthStart(prev);
        return monthEnd(next);
      });
      setLoadingTop(false);
    }, SPINNER_DURATION);
  }, []);

  const loadOlder = useCallback(() => {
    if (pastMonthsRef.current >= MAX_MONTHS) return;
    setLoadingBottom(true);
    setTimeout(() => {
      pastMonthsRef.current++;
      setRangeStart(prev => prevMonthStart(prev));
      setLoadingBottom(false);
    }, SPINNER_DURATION);
  }, []);

  // Desktop: scroll event listener on the scroll container for auto-loading at edges
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const onScroll = () => {
      if (!mountedRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;

      if (scrollTop <= SCROLL_EDGE_PX && futureMonthsRef.current < MAX_MONTHS && !loadingTop) {
        loadNewer();
      }
      if (scrollHeight - scrollTop - clientHeight <= SCROLL_EDGE_PX && pastMonthsRef.current < MAX_MONTHS && !loadingBottom) {
        loadOlder();
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef, loadNewer, loadOlder, loadingTop, loadingBottom]);

  // Touch handlers for pull-to-load (mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    const touch = e.touches[0];
    if (!touch) return;

    const atTop = container.scrollTop <= 0;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 1;

    if (atTop && futureMonthsRef.current < MAX_MONTHS && !loadingTop) {
      touchStartRef.current = { y: touch.clientY, edge: 'top' };
    } else if (atBottom && pastMonthsRef.current < MAX_MONTHS && !loadingBottom) {
      touchStartRef.current = { y: touch.clientY, edge: 'bottom' };
    } else {
      touchStartRef.current = { y: 0, edge: null };
    }
  }, [scrollContainerRef, loadingTop, loadingBottom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const { edge, y: startY } = touchStartRef.current;
    if (!edge) return;
    const touch = e.touches[0];
    if (!touch) return;

    const delta = touch.clientY - startY;

    if (edge === 'top' && delta > 0) {
      const dampened = Math.min(delta * 0.4, PULL_THRESHOLD * 1.5);
      setPullTopOffset(dampened);
    } else if (edge === 'bottom' && delta < 0) {
      const dampened = Math.min(Math.abs(delta) * 0.4, PULL_THRESHOLD * 1.5);
      setPullBottomOffset(dampened);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const { edge } = touchStartRef.current;

    if (edge === 'top' && pullTopOffset >= PULL_THRESHOLD) {
      loadNewer();
    } else if (edge === 'bottom' && pullBottomOffset >= PULL_THRESHOLD) {
      loadOlder();
    }

    setPullTopOffset(0);
    setPullBottomOffset(0);
    touchStartRef.current = { y: 0, edge: null };
  }, [pullTopOffset, pullBottomOffset, loadNewer, loadOlder]);

  const dates = generateDateRange(rangeStart, rangeEnd).reverse();
  const planConfig = getPlan(planId).config;
  const isSingleSession = planConfig.sessions.length === 1 && planConfig.sessions[0] === 'daily';

  const handleRowClick = useCallback((dateStr: string) => {
    setExpandedDate(prev => prev === dateStr ? null : dateStr);
  }, []);

  const todayRefCb = useCallback((el: HTMLDivElement | null) => {
    todayRowRef.current = el;
    onTodayElement?.(el);
  }, [onTodayElement]);

  // Group dates by month for section headers
  let currentMonth = '';

  const topReady = pullTopOffset >= PULL_THRESHOLD;
  const bottomReady = pullBottomOffset >= PULL_THRESHOLD;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top loading / pull indicator */}
      {loadingTop ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : pullTopOffset > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: pullTopOffset }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 transition-transform ${topReady ? 'rotate-180' : ''}`}
              style={{ color: topReady ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7-7 7" />
            </svg>
            <span
              className="text-xs font-medium"
              style={{
                color: topReady ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {topReady ? 'Release to load' : 'Pull for newer'}
            </span>
          </div>
        </div>
      )}

      {dates.map(dateStr => {
        const data = completions.get(dateStr) ?? {};
        const isToday = dateStr === today;
        const isExpanded = expandedDate === dateStr;
        const inRange = !planConfig.needsStartDate || !planStartDate || !planConfig.totalDays
          || isDateInPlanRange(planStartDate, dateStr, planConfig.totalDays);

        const thisMonth = monthLabel(dateStr);
        let showMonthHeader = false;
        if (thisMonth !== currentMonth) {
          currentMonth = thisMonth;
          showMonthHeader = true;
        }

        return (
          <div key={dateStr}>
            {showMonthHeader && (
              <div
                className="sticky top-0 z-10 px-4 py-2 text-xs font-semibold backdrop-blur-sm"
                style={{
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-ui)',
                  backgroundColor: 'var(--color-bg, #faf9f6)',
                }}
              >
                {thisMonth}
              </div>
            )}
            <div
              ref={isToday ? todayRefCb : undefined}
              className={`border-b mx-1 ${isToday ? 'bg-[var(--color-accent)]/5' : ''}`}
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                role={inRange ? 'button' : undefined}
                onClick={inRange ? () => handleRowClick(dateStr) : undefined}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 ${!inRange ? 'opacity-40' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${isToday ? 'font-bold' : 'font-medium'}`}
                    style={{ fontFamily: 'var(--font-ui)' }}
                  >
                    {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {isToday && (
                      <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--color-accent)' }}>
                        Today
                      </span>
                    )}
                  </span>
                </div>

                {inRange ? (
                  <div className="flex gap-1.5 items-center">
                    {isSingleSession ? (
                      <StatusDot completed={(data['daily'] ?? 0) > 0} />
                    ) : (
                      <>
                        <StatusDot completed={(data['morning'] ?? 0) > 0} label="M" />
                        <StatusDot completed={(data['evening'] ?? 0) > 0} label="E" />
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
                    —
                  </span>
                )}

                {inRange && (
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--color-text-muted)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>

              {isExpanded && inRange && (
                <div className="px-3 pb-3">
                  <DayRow
                    dateStr={dateStr}
                    planId={planId}
                    completions={data}
                    onOpen={onOpen}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom loading / pull indicator */}
      {loadingBottom ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : pullBottomOffset > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: pullBottomOffset }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 transition-transform ${bottomReady ? 'rotate-180' : ''}`}
              style={{ color: bottomReady ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            <span
              className="text-xs font-medium"
              style={{
                color: bottomReady ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {bottomReady ? 'Release to load' : 'Pull for older'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-5 h-5 animate-spin"
      style={{ color: 'var(--color-accent)' }}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function StatusDot({ completed, label }: { completed: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {label && (
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
          {label}
        </span>
      )}
      <div
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: completed ? 'var(--color-check)' : 'var(--color-border)',
        }}
      />
    </div>
  );
}
