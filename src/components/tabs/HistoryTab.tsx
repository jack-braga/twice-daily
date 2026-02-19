import { useState, useEffect } from 'react';
import { getAllCompletions } from '../../hooks/useCompletion';
import type { CompletionRecord } from '../../db/schema';

export function HistoryTab() {
  const [records, setRecords] = useState<CompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCompletions().then(r => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  // Build heatmap data: date → count of sessions
  const dateCounts = new Map<string, number>();
  for (const r of records) {
    dateCounts.set(r.date, (dateCounts.get(r.date) ?? 0) + 1);
  }

  // Get last 12 weeks of dates for the heatmap
  const today = new Date();
  const weeks: string[][] = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (12 * 7) + 1);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  for (let w = 0; w < 12; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);
      week.push(date.toISOString().split('T')[0]!);
    }
    weeks.push(week);
  }

  function getCellColor(dateStr: string): string {
    const count = dateCounts.get(dateStr) ?? 0;
    if (count === 0) return 'var(--color-border)';
    if (count === 1) return '#86efac';
    return '#16a34a';
  }

  const formatRecordDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const PLAN_LABELS: Record<string, string> = {
    '1662-original': '1662 Original',
    '1662-revised': '1662 Revised',
    'mcheyne': "M'Cheyne",
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
        History
      </h1>

      {loading && (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      )}

      {!loading && (
        <>
          {/* Heatmap */}
          <div className="mb-8">
            <div className="flex gap-0.5 justify-end">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map(dateStr => (
                    <div
                      key={dateStr}
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: getCellColor(dateStr) }}
                      title={`${dateStr}: ${dateCounts.get(dateStr) ?? 0} sessions`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 justify-end text-xs"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
              <span>Less</span>
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#86efac' }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#16a34a' }} />
              <span>More</span>
            </div>
          </div>

          {/* Recent sessions list */}
          {records.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No sessions completed yet.</p>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 50).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b text-sm"
                  style={{ borderColor: 'var(--color-border)', fontFamily: 'var(--font-ui)' }}
                >
                  <div>
                    <span className="font-medium">{formatRecordDate(r.date)}</span>
                    <span className="mx-2" style={{ color: 'var(--color-text-muted)' }}>&middot;</span>
                    <span className="capitalize">{r.session} Prayer</span>
                    <span className="mx-2" style={{ color: 'var(--color-text-muted)' }}>&middot;</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {PLAN_LABELS[r.planId] ?? r.planId}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {formatTime(r.completedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
