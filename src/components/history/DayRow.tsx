import type { Session, PlanId } from '../../engine/types';
import { resolveLiturgicalDay } from '../../engine/calendar';
import { getPlan } from '../../plans';

/** Total checkable sections per plan type */
const TOTAL_SECTIONS: Record<string, number> = {
  '1662-original': 8,
  '1662-revised': 8,
  'mcheyne': 2,
  'bibleproject': 2,
};

interface SessionProgress {
  completed: number;
  total: number;
}

interface Props {
  dateStr: string;
  planId: PlanId;
  completions: Record<string, number>;  // session → completed count
  onOpen: (date: string, session: Session) => void;
  compact?: boolean;
  outOfRange?: boolean;
}

function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function ProgressBar({ progress }: { progress: SessionProgress }) {
  const pct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const isComplete = progress.completed >= progress.total && progress.total > 0;

  return (
    <div className="flex items-center gap-2 flex-1">
      <div
        className="h-1.5 flex-1 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: isComplete ? 'var(--color-check)' : 'var(--color-accent)',
          }}
        />
      </div>
      <span className="text-xs tabular-nums w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
        {progress.completed}/{progress.total}
      </span>
    </div>
  );
}

export function DayRow({ dateStr, planId, completions, onOpen, compact, outOfRange }: Props) {
  const date = new Date(dateStr + 'T00:00:00');
  const litDay = resolveLiturgicalDay(date);
  const total = TOTAL_SECTIONS[planId] ?? 8;

  if (outOfRange) {
    return (
      <div className="py-3 text-center">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
          No reading for this date
        </span>
      </div>
    );
  }
  const planConfig = getPlan(planId).config;
  const isSingleSession = planConfig.sessions.length === 1 && planConfig.sessions[0] === 'daily';

  if (isSingleSession) {
    const dailyProgress: SessionProgress = { completed: completions['daily'] ?? 0, total };

    if (compact) {
      return (
        <div className="py-2">
          <div className="text-xs font-medium mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
            {formatDayDate(dateStr)}
          </div>
          <button
            onClick={() => onOpen(dateStr, 'daily')}
            className="flex items-center gap-1.5 w-full text-left"
          >
            <ProgressBar progress={dailyProgress} />
          </button>
        </div>
      );
    }

    return (
      <div className="py-3">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-ui)' }}>
              {formatDayDate(dateStr)}
            </span>
          </div>
        </div>
        <button
          onClick={() => onOpen(dateStr, 'daily')}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--color-border)]/30 transition-colors"
        >
          <span className="text-xs font-medium w-20" style={{ fontFamily: 'var(--font-ui)' }}>
            Reading
          </span>
          <ProgressBar progress={dailyProgress} />
          <span className="text-xs" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-ui)' }}>
            Open
          </span>
        </button>
      </div>
    );
  }

  // Two-session plans (morning/evening)
  const morningProgress: SessionProgress = { completed: completions['morning'] ?? 0, total };
  const eveningProgress: SessionProgress = { completed: completions['evening'] ?? 0, total };

  if (compact) {
    return (
      <div className="py-2">
        <div className="text-xs font-medium mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
          {formatDayDate(dateStr)}
          {litDay.isHolyDay && litDay.holyDayName && (
            <span style={{ color: 'var(--color-text-muted)' }}> &middot; {litDay.holyDayName}</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onOpen(dateStr, 'morning')}
            className="flex items-center gap-1.5 flex-1 text-left"
          >
            <span className="text-xs w-6" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>MP</span>
            <ProgressBar progress={morningProgress} />
          </button>
          <button
            onClick={() => onOpen(dateStr, 'evening')}
            className="flex items-center gap-1.5 flex-1 text-left"
          >
            <span className="text-xs w-6" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>EP</span>
            <ProgressBar progress={eveningProgress} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-ui)' }}>
            {formatDayDate(dateStr)}
          </span>
          <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
            {litDay.name}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <button
          onClick={() => onOpen(dateStr, 'morning')}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--color-border)]/30 transition-colors"
        >
          <span className="text-xs font-medium w-20" style={{ fontFamily: 'var(--font-ui)' }}>
            Morning
          </span>
          <ProgressBar progress={morningProgress} />
          <span className="text-xs" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-ui)' }}>
            Open
          </span>
        </button>

        <button
          onClick={() => onOpen(dateStr, 'evening')}
          className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--color-border)]/30 transition-colors"
        >
          <span className="text-xs font-medium w-20" style={{ fontFamily: 'var(--font-ui)' }}>
            Evening
          </span>
          <ProgressBar progress={eveningProgress} />
          <span className="text-xs" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-ui)' }}>
            Open
          </span>
        </button>
      </div>
    </div>
  );
}
