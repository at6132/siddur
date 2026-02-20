/**
 * Hook to drive autoscroll for a ScrollView. Call from reader screens.
 * Uses requestAnimationFrame; stops at bottom.
 */

import { useEffect, useRef, RefObject } from 'react';
import { ScrollView } from 'react-native';

const PIXELS_PER_SECOND_AT_1X = 45;

export function useAutoscroll(
  scrollViewRef: RefObject<ScrollView | null>,
  scrollYRef: React.MutableRefObject<number>,
  contentHeightRef: React.MutableRefObject<number>,
  viewportHeight: number,
  playing: boolean,
  speed: number
) {
  const rafRef = useRef<number | null>(null);
  const scrollYFloatRef = useRef(0);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    scrollYFloatRef.current = scrollYRef.current;
    const maxY = Math.max(0, contentHeightRef.current - viewportHeight);
    let lastTs = 0;
    const tick = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const delta = PIXELS_PER_SECOND_AT_1X * speed * dt;
      const nextY = Math.min(scrollYFloatRef.current + delta, maxY);
      if (nextY >= maxY) {
        rafRef.current = null;
        return;
      }
      scrollYFloatRef.current = nextY;
      scrollYRef.current = nextY;
      scrollViewRef.current?.scrollTo({ y: nextY, animated: false });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, speed, viewportHeight]);
}
