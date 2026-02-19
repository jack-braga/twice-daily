import { useState, useRef, useCallback } from 'react';
import type { PlanId, Session } from '../../engine/types';
import { ListView } from '../history/ListView';
import { CalendarView, type CalendarZoom } from '../history/CalendarView';

type ViewMode = 'list' | 'calendar';

interface Props {
  planId: PlanId;
  onNavigateToOffice: (date: string, session: Session) => void;
}

export function HistoryTab({ planId, onNavigateToOffice }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarZoom, setCalendarZoom] = useState<CalendarZoom>('month');
  const todayElRef = useRef<HTMLElement | null>(null);

  // Incremented to signal "go to today" to CalendarView
  const [todayTrigger, setTodayTrigger] = useState(0);

  const listScrollRef = useRef<HTMLDivElement | null>(null);

  const handleTodayElement = useCallback((el: HTMLElement | null) => {
    todayElRef.current = el;
  }, []);

  const handleTodayPress = useCallback(() => {
    if (viewMode === 'list') {
      todayElRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTodayTrigger(n => n + 1);
    }
  }, [viewMode]);

  return (
    <div className="max-w-2xl mx-auto relative flex flex-col h-full">
      {/* Sticky header — always visible */}
      <div className="shrink-0 px-4 pt-6 pb-3" style={{ backgroundColor: 'var(--color-bg, #faf9f6)' }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-ui)' }}>
            History
          </h1>
          <button
            onClick={handleTodayPress}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors active:scale-95"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex gap-1 p-0.5 rounded-lg w-fit" style={{ backgroundColor: 'var(--color-border)' }}>
            <SegmentButton active={viewMode === 'list'} onClick={() => setViewMode('list')} label="List" />
            <SegmentButton active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} label="Calendar" />
          </div>

          {/* Calendar zoom control */}
          {viewMode === 'calendar' && (
            <div className="flex gap-1 p-0.5 rounded-lg w-fit" style={{ backgroundColor: 'var(--color-border)' }}>
              <SegmentButton active={calendarZoom === 'week'} onClick={() => setCalendarZoom('week')} label="Week" />
              <SegmentButton active={calendarZoom === 'month'} onClick={() => setCalendarZoom('month')} label="Month" />
              <SegmentButton active={calendarZoom === 'year'} onClick={() => setCalendarZoom('year')} label="Year" />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div ref={listScrollRef} className="flex-1 overflow-y-auto min-h-0 pb-20" style={{ overscrollBehaviorY: 'contain' }}>
        {viewMode === 'list' ? (
          <ListView
            planId={planId}
            onOpen={onNavigateToOffice}
            onTodayElement={handleTodayElement}
            scrollContainerRef={listScrollRef}
          />
        ) : (
          <CalendarView
            planId={planId}
            zoom={calendarZoom}
            onZoomChange={setCalendarZoom}
            onOpen={onNavigateToOffice}
            onTodayElement={handleTodayElement}
            todayTrigger={todayTrigger}
          />
        )}
      </div>
    </div>
  );
}

function SegmentButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-white text-[var(--color-text)] shadow-sm'
          : 'text-[var(--color-text-muted)]'
      }`}
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {label}
    </button>
  );
}
