import { useState, useEffect, useCallback, useRef } from 'react';
import { db, type CompletionRecord } from '../db/schema';
import type { Session, PlanId } from '../engine/types';

interface UseCompletionResult {
  completedSections: Set<string>;
  toggleSection: (sectionId: string) => void;
  isSessionComplete: boolean;
  markSessionComplete: () => Promise<void>;
  completionRecord: CompletionRecord | null;
}

export function useCompletion(
  date: string,
  session: Session,
  planId: PlanId,
  totalSections: string[],
): UseCompletionResult {
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [record, setRecord] = useState<CompletionRecord | null>(null);

  // Track whether we've loaded from DB to avoid persisting the initial empty state
  const loadedRef = useRef(false);

  // Load existing completion
  useEffect(() => {
    loadedRef.current = false;
    (async () => {
      const existing = await db.completions
        .where({ date, session, planId })
        .first();
      if (existing) {
        setCompletedSections(new Set(existing.sectionsCompleted));
        setRecord(existing);
      } else {
        setCompletedSections(new Set());
        setRecord(null);
      }
      loadedRef.current = true;
    })();
  }, [date, session, planId]);

  // Persist completedSections to DB whenever they change (debounced).
  // This replaces the fire-and-forget async writes inside toggleSection,
  // which caused race conditions when multiple toggles happened rapidly.
  useEffect(() => {
    if (!loadedRef.current) return; // don't persist until we've loaded from DB

    const sections = Array.from(completedSections);

    const timerId = setTimeout(() => {
      (async () => {
        const existing = await db.completions
          .where({ date, session, planId })
          .first();
        if (existing) {
          await db.completions.update(existing.id!, {
            sectionsCompleted: sections,
            completedAt: new Date().toISOString(),
          });
        } else if (sections.length > 0) {
          await db.completions.add({
            date,
            session,
            planId,
            completedAt: new Date().toISOString(),
            sectionsCompleted: sections,
          });
        }
      })();
    }, 100); // 100ms debounce — fast enough to feel instant, slow enough to batch rapid toggles

    return () => clearTimeout(timerId);
  }, [completedSections, date, session, planId]);

  const toggleSection = useCallback((sectionId: string) => {
    setCompletedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const isSessionComplete = totalSections.length > 0 &&
    totalSections.every(id => completedSections.has(id));

  const markSessionComplete = useCallback(async () => {
    const allSections = new Set(totalSections);
    setCompletedSections(allSections);
    // The useEffect above will handle the DB persist
  }, [totalSections]);

  return {
    completedSections,
    toggleSection,
    isSessionComplete,
    markSessionComplete,
    completionRecord: record,
  };
}

/** Get all completion records (for history tab). */
export async function getAllCompletions(): Promise<CompletionRecord[]> {
  return db.completions.orderBy('date').reverse().toArray();
}

/** Get completion records for a date range and plan. */
export async function getCompletionsForDateRange(
  startDate: string,
  endDate: string,
  planId: string,
): Promise<CompletionRecord[]> {
  return db.completions
    .where('date')
    .between(startDate, endDate, true, true)
    .filter(r => r.planId === planId)
    .toArray();
}

/** Get completion summary for a date range: Map<date, { morning, evening }> with section counts. */
export async function getCompletionSummary(
  startDate: string,
  endDate: string,
  planId: string,
): Promise<Map<string, { morning: number; evening: number }>> {
  const records = await getCompletionsForDateRange(startDate, endDate, planId);
  const summary = new Map<string, { morning: number; evening: number }>();

  for (const r of records) {
    const existing = summary.get(r.date) ?? { morning: 0, evening: 0 };
    existing[r.session] = r.sectionsCompleted.length;
    summary.set(r.date, existing);
  }

  return summary;
}
