import { useEffect, useRef, useCallback } from 'react';

/**
 * Stable interval hook that avoids stale closures and reduces re-render surface area.
 * Stores the callback in a ref so it can be updated without restarting the interval.
 * This is the anti-jitter foundation — one interval, stable reference.
 */
export function useStableInterval(callback: () => void, delayMs: number): void {
  const callbackRef = useRef<() => void>(callback);

  // Always keep the ref up-to-date with the latest callback, without re-creating interval
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (delayMs <= 0) return;
    const id = setInterval(() => {
      callbackRef.current();
    }, delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

/**
 * Returns a stable increment function that advances a frame counter.
 * For use with useSpinnerFrame — increments a frame ref without triggering re-renders
 * unless the caller explicitly reads the frame value via state.
 */
export function useFrameRef(delayMs: number): React.MutableRefObject<number> {
  const frameRef = useRef(0);
  useStableInterval(useCallback(() => {
    frameRef.current = (frameRef.current + 1);
  }, []), delayMs);
  return frameRef;
}
