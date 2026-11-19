/**
 * Hook to drive autoscroll for a ScrollView. Call from reader screens.
 * Uses requestAnimationFrame; stops at bottom.
 *
 * While playing, finger drags temporarily pause programmatic scroll so slight
 * position adjustments feel seamless; autoscroll resumes from the new Y.
 */

import { useCallback, useEffect, useRef, RefObject } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

const PIXELS_PER_SECOND_AT_1X = 45;
const MOMENTUM_VELOCITY_EPS = 0.02;

export type AutoscrollScrollHandlers = {
  onScrollBeginDrag: () => void;
  onScrollEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onMomentumScrollEnd: () => void;
};

export function useAutoscroll(
  scrollViewRef: RefObject<ScrollView | null>,
  scrollYRef: React.MutableRefObject<number>,
  contentHeightRef: React.MutableRefObject<number>,
  viewportHeight: number,
  playing: boolean,
  speed: number,
  onReachEnd?: () => void
): AutoscrollScrollHandlers {
  const rafRef = useRef<number | null>(null);
  const scrollYFloatRef = useRef(0);
  const userInteractingRef = useRef(false);
  const onReachEndRef = useRef(onReachEnd);
  onReachEndRef.current = onReachEnd;

  const syncFloatFromScroll = useCallback(() => {
    scrollYFloatRef.current = scrollYRef.current;
  }, [scrollYRef]);

  const onScrollBeginDrag = useCallback(() => {
    userInteractingRef.current = true;
  }, []);

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const vy = e.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(vy) < MOMENTUM_VELOCITY_EPS) {
        userInteractingRef.current = false;
        syncFloatFromScroll();
      }
    },
    [syncFloatFromScroll]
  );

  const onMomentumScrollEnd = useCallback(() => {
    userInteractingRef.current = false;
    syncFloatFromScroll();
  }, [syncFloatFromScroll]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      userInteractingRef.current = false;
      return;
    }
    scrollYFloatRef.current = scrollYRef.current;
    const maxY = Math.max(0, contentHeightRef.current - viewportHeight);
    let lastTs = 0;
    const tick = (ts: number) => {
      if (userInteractingRef.current) {
        // Follow the finger; do not fight the drag with scrollTo.
        scrollYFloatRef.current = scrollYRef.current;
        lastTs = ts;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const delta = PIXELS_PER_SECOND_AT_1X * speed * dt;
      const nextY = Math.min(scrollYFloatRef.current + delta, maxY);
      if (nextY >= maxY) {
        scrollYFloatRef.current = maxY;
        scrollYRef.current = maxY;
        scrollViewRef.current?.scrollTo({ y: maxY, animated: false });
        rafRef.current = null;
        onReachEndRef.current?.();
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
  }, [playing, speed, viewportHeight, scrollViewRef, scrollYRef, contentHeightRef]);

  return { onScrollBeginDrag, onScrollEndDrag, onMomentumScrollEnd };
}
