/**
 * useDate hook
 *
 * Returns the "current" date, supporting the ?date=YYYY-MM-DD query param
 * for testing. Falls back to actual today.
 */

import { useMemo } from 'react';

export function useDate(): Date {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, []);
}
