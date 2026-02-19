import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlanId, Session } from '../../engine/types';
import { getCompletionSummary } from '../../hooks/useCompletion';
import { todayStr, formatDateStr } from '../../utils/date';
import { DayRow } from './DayRow';

export type CalendarZoom = 'week' | 'month' | 'year';

interface Props {
  planId: PlanId;
  zoom: CalendarZoom;
  onZoomChange: (zoom: CalendarZoom) => void;
  onOpen: (date: string, session: Session) => void;
  onTodayElement?: (el: HTMLElement | null) => void;
  /** Increment to navigate focus to today's date. */
  todayTrigger?: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(formatDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(formatDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function CalendarView({ planId, zoom, onZoomChange, onOpen, onTodayElement, todayTrigger }: Props) {
  const today = todayStr();
  const [focusDate, setFocusDate] = useState(today);
  const [completions, setCompletions] = useState<Map<string, { morning: number; evening: number }>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const gestureRef = useRef<{ startDist: number; startZoom: CalendarZoom } | null>(null);

  // Navigate to today when the Today button is pressed
  useEffect(() => {
    if (todayTrigger) {
      setFocusDate(today);
      setSelectedDate(null);
    }
  }, [todayTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusD = new Date(focusDate + 'T00:00:00');
  const year = focusD.getFullYear();
  const month = focusD.getMonth();

  useEffect(() => {
    let rangeStart: string;
    let rangeEnd: string;

    if (zoom === 'week') {
      const days = getWeekDays(focusDate);
      rangeStart = days[0]!;
      rangeEnd = days[6]!;
    } else if (zoom === 'month') {
      rangeStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      rangeEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      rangeStart = `${year}-01-01`;
      rangeEnd = `${year}-12-31`;
    }

    getCompletionSummary(rangeStart, rangeEnd, planId).then(setCompletions);
  }, [focusDate, zoom, year, month, planId]);

  const navigate = useCallback((direction: -1 | 1) => {
    const d = new Date(focusDate + 'T00:00:00');
    if (zoom === 'week') d.setDate(d.getDate() + direction * 7);
    else if (zoom === 'month') d.setMonth(d.getMonth() + direction);
    else d.setFullYear(d.getFullYear() + direction);
    setFocusDate(formatDateStr(d));
    setSelectedDate(null);
  }, [focusDate, zoom]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      gestureRef.current = { startDist: Math.sqrt(dx * dx + dy * dy), startZoom: zoom };
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !gestureRef.current) return;
    const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
    const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ratio = dist / gestureRef.current.startDist;
    const zoomLevels: CalendarZoom[] = ['year', 'month', 'week'];
    const startIdx = zoomLevels.indexOf(gestureRef.current.startZoom);
    if (ratio > 1.5 && startIdx < 2) { onZoomChange(zoomLevels[startIdx + 1]!); gestureRef.current = null; }
    else if (ratio < 0.67 && startIdx > 0) { onZoomChange(zoomLevels[startIdx - 1]!); gestureRef.current = null; }
  }, [onZoomChange]);

  const handleTouchEnd = useCallback(() => { gestureRef.current = null; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const zoomLevels: CalendarZoom[] = ['year', 'month', 'week'];
    const idx = zoomLevels.indexOf(zoom);
    if (e.deltaY < 0 && idx < 2) onZoomChange(zoomLevels[idx + 1]!);
    if (e.deltaY > 0 && idx > 0) onZoomChange(zoomLevels[idx - 1]!);
  }, [zoom, onZoomChange]);

  const getCellStatus = useCallback((dateStr: string) => {
    const data = completions.get(dateStr);
    if (!data) return 'none';
    if (data.morning > 0 && data.evening > 0) return 'complete';
    if (data.morning > 0 || data.evening > 0) return 'partial';
    return 'none';
  }, [completions]);

  const cellColor = useCallback((status: string) => {
    if (status === 'complete') return 'var(--color-check)';
    if (status === 'partial') return 'var(--color-check-partial)';
    return 'var(--color-border)';
  }, []);

  const headerLabel = zoom === 'week'
    ? `Week of ${new Date(getWeekDays(focusDate)[0]! + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : zoom === 'month'
      ? `${MONTH_NAMES[month]} ${year}`
      : String(year);

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
      {/* Navigation header */}
      <div className="flex items-center justify-between px-3 py-2 mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
        <button onClick={() => navigate(-1)} className="p-1">
          <svg className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold">{headerLabel}</span>
        <button onClick={() => navigate(1)} className="p-1">
          <svg className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {zoom === 'week' && (
        <GridView
          days={getWeekDays(focusDate)} today={today}
          getCellStatus={getCellStatus} cellColor={cellColor}
          selectedDate={selectedDate} onSelect={setSelectedDate}
          completions={completions} planId={planId} onOpen={onOpen}
          onTodayElement={onTodayElement} cellSize="lg"
        />
      )}

      {zoom === 'month' && (
        <MonthGrid
          year={year} month={month} today={today}
          getCellStatus={getCellStatus} cellColor={cellColor}
          selectedDate={selectedDate} onSelect={setSelectedDate}
          completions={completions} planId={planId} onOpen={onOpen}
          onTodayElement={onTodayElement}
        />
      )}

      {zoom === 'year' && (
        <YearView
          year={year} today={today}
          getCellStatus={getCellStatus} cellColor={cellColor}
          onMonthClick={(m) => { setFocusDate(formatDateStr(new Date(year, m, 1))); onZoomChange('month'); }}
        />
      )}
    </div>
  );
}

// ─── Grid View (week + month cells) ─────────────────────────────────────

function GridView({
  days, today, getCellStatus, cellColor, selectedDate, onSelect,
  completions, planId, onOpen, onTodayElement, cellSize,
}: {
  days: string[]; today: string;
  getCellStatus: (d: string) => string; cellColor: (s: string) => string;
  selectedDate: string | null; onSelect: (d: string | null) => void;
  completions: Map<string, { morning: number; evening: number }>;
  planId: PlanId; onOpen: (d: string, s: Session) => void;
  onTodayElement?: (el: HTMLElement | null) => void;
  cellSize: 'sm' | 'lg';
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 px-3 mb-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-medium" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3">
        {days.map(dateStr => {
          const dayNum = new Date(dateStr + 'T00:00:00').getDate();
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const status = getCellStatus(dateStr);
          const dotSize = cellSize === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5 mt-0.5';

          return (
            <div
              key={dateStr}
              ref={isToday ? (el => onTodayElement?.(el)) : undefined}
              onClick={() => onSelect(isSelected ? null : dateStr)}
              className={`aspect-square rounded-${cellSize === 'lg' ? 'lg' : 'md'} flex flex-col items-center justify-center gap-0.5 text-${cellSize === 'lg' ? 'sm' : 'xs'} cursor-pointer transition-colors ${
                isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''
              } ${isToday ? 'font-bold' : ''}`}
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              <span>{dayNum}</span>
              <div className={`${dotSize} rounded-full`} style={{ backgroundColor: cellColor(status) }} />
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-3 px-3 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <DayRow
            dateStr={selectedDate} planId={planId}
            morningCompleted={completions.get(selectedDate)?.morning ?? 0}
            eveningCompleted={completions.get(selectedDate)?.evening ?? 0}
            onOpen={onOpen}
          />
        </div>
      )}
    </div>
  );
}

// ─── Month Grid ──────────────────────────────────────────────────────────

function MonthGrid({
  year, month, today, getCellStatus, cellColor, selectedDate, onSelect,
  completions, planId, onOpen, onTodayElement,
}: {
  year: number; month: number; today: string;
  getCellStatus: (d: string) => string; cellColor: (s: string) => string;
  selectedDate: string | null; onSelect: (d: string | null) => void;
  completions: Map<string, { morning: number; evening: number }>;
  planId: PlanId; onOpen: (d: string, s: Session) => void;
  onTodayElement?: (el: HTMLElement | null) => void;
}) {
  const days = getMonthDays(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const padding: (string | null)[] = Array.from({ length: firstDayOfWeek }, (): null => null);
  const cells: (string | null)[] = [...padding, ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 px-3 mb-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-medium" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>{l}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi}>
          <div className="grid grid-cols-7 gap-1 px-3">
            {week.map((dateStr, di) => {
              if (!dateStr) return <div key={`empty-${di}`} className="aspect-square" />;
              const dayNum = new Date(dateStr + 'T00:00:00').getDate();
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const status = getCellStatus(dateStr);

              return (
                <div
                  key={dateStr}
                  ref={isToday ? (el => onTodayElement?.(el)) : undefined}
                  onClick={() => onSelect(isSelected ? null : dateStr)}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs cursor-pointer transition-colors ${
                    isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''
                  } ${isToday ? 'font-bold' : ''}`}
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  <span>{dayNum}</span>
                  <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: cellColor(status) }} />
                </div>
              );
            })}
          </div>

          {selectedDate && week.includes(selectedDate) && (
            <div className="mx-3 my-1 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-border)/20' }}>
              <DayRow
                dateStr={selectedDate} planId={planId}
                morningCompleted={completions.get(selectedDate)?.morning ?? 0}
                eveningCompleted={completions.get(selectedDate)?.evening ?? 0}
                onOpen={onOpen}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Year View ───────────────────────────────────────────────────────────

function YearView({
  year, today, getCellStatus, cellColor, onMonthClick,
}: {
  year: number; today: string;
  getCellStatus: (d: string) => string; cellColor: (s: string) => string;
  onMonthClick: (month: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 px-3">
      {Array.from({ length: 12 }, (_, m) => {
        const days = getMonthDays(year, m);
        const firstDow = new Date(year, m, 1).getDay();
        const cells: (string | null)[] = [...Array.from({ length: firstDow }, (): null => null), ...days];

        return (
          <button key={m} onClick={() => onMonthClick(m)} className="text-left">
            <div className="text-xs font-semibold mb-1" style={{ fontFamily: 'var(--font-ui)' }}>{MONTH_NAMES[m]}</div>
            <div className="grid grid-cols-7 gap-px">
              {cells.map((dateStr, i) => {
                if (!dateStr) return <div key={`e-${i}`} className="w-2 h-2" />;
                const isToday = dateStr === today;
                const status = getCellStatus(dateStr);
                return (
                  <div
                    key={dateStr}
                    className={`w-2 h-2 rounded-sm ${isToday ? 'ring-1 ring-[var(--color-accent)]' : ''}`}
                    style={{ backgroundColor: cellColor(status) }}
                  />
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
