import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/schema';
import type { PlanId } from '../engine/types';

export function usePlanStartDate(planId: PlanId) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    db.settings.get(`planStartDate:${planId}`).then(record => {
      setStartDate(record?.value ?? null);
      setLoaded(true);
    });
  }, [planId]);

  const updateStartDate = useCallback(async (date: string) => {
    setStartDate(date);
    await db.settings.put({ key: `planStartDate:${planId}`, value: date });
  }, [planId]);

  return { startDate, updateStartDate, loaded };
}
