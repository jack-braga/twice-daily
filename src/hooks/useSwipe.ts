import { useEffect, useRef, type RefObject } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const SWIPE_THRESHOLD = 50;  // minimum px for a swipe
const EDGE_IGNORE = 20;      // ignore touches near screen edges (browser gestures)

/**
 * Detects horizontal swipe gestures on a target element.
 * Swipe left → onSwipeLeft, swipe right → onSwipeRight.
 * Ignores vertical-dominant gestures and touches near screen edges.
 */
export function useSwipe(ref: RefObject<HTMLElement | null>, handlers: SwipeHandlers) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      // Ignore touches near screen edges to avoid browser back/forward
      if (touch.clientX < EDGE_IGNORE || touch.clientX > window.innerWidth - EDGE_IGNORE) {
        startRef.current = null;
        return;
      }

      startRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!startRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;

      // Only trigger if horizontal movement is dominant and exceeds threshold
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          handlers.onSwipeLeft?.();
        } else {
          handlers.onSwipeRight?.();
        }
      }

      startRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [ref, handlers]);
}
