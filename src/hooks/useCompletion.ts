import { useState, useEffect, useCallback } from 'react';
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

  // Load existing completion
  useEffect(() => {
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
    })();
  }, [date, session, planId]);

  const toggleSection = useCallback((sectionId: string) => {
    setCompletedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      // Persist
      (async () => {
        const sections = Array.from(next);
        const existing = await db.completions
          .where({ date, session, planId })
          .first();
        if (existing) {
          await db.completions.update(existing.id!, { sectionsCompleted: sections });
        } else {
          await db.completions.add({
            date,
            session,
            planId,
            completedAt: new Date().toISOString(),
            sectionsCompleted: sections,
          });
        }
      })();
      return next;
    });
  }, [date, session, planId]);

  const isSessionComplete = totalSections.length > 0 &&
    totalSections.every(id => completedSections.has(id));

  const markSessionComplete = useCallback(async () => {
    const allSections = new Set(totalSections);
    setCompletedSections(allSections);
    const existing = await db.completions
      .where({ date, session, planId })
      .first();
    if (existing) {
      await db.completions.update(existing.id!, {
        sectionsCompleted: totalSections,
        completedAt: new Date().toISOString(),
      });
    } else {
      await db.completions.add({
        date,
        session,
        planId,
        completedAt: new Date().toISOString(),
        sectionsCompleted: totalSections,
      });
    }
  }, [date, session, planId, totalSections]);

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
