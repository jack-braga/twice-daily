import { useState, useEffect } from 'react';
import type { DailyPlan, Session, PlanId, Translation } from '../engine/types';
import { assembleOffice } from '../engine/liturgy-assembler';

interface UseOfficeResult {
  plan: DailyPlan | null;
  loading: boolean;
  error: string | null;
}

export function useOffice(
  date: Date,
  session: Session,
  planId: PlanId,
  translation: Translation,
  planStartDate?: string | null,
): UseOfficeResult {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    assembleOffice(date, session, planId, translation, planStartDate ?? undefined)
      .then(result => {
        if (!cancelled) {
          setPlan(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load office');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [date.toISOString(), session, planId, translation, planStartDate]);

  return { plan, loading, error };
}
