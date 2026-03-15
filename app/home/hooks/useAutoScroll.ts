import { useCallback, useRef } from 'react';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  useSharedValue,
  useFrameCallback,
  scrollTo,
} from 'react-native-reanimated';

interface AutoScrollConfig {
  scrollRef: AnimatedRef<Animated.ScrollView>;
  edgeThreshold?: number;   // px from edge to trigger (default 80)
  maxSpeed?: number;        // max px/frame (default 8)
  scrollViewHeight: number; // visible height of the scroll view
  contentHeight: number;    // total content height
}

export function useAutoScroll({
  scrollRef,
  edgeThreshold = 80,
  maxSpeed = 8,
  scrollViewHeight,
  contentHeight,
}: AutoScrollConfig) {
  const isDragging = useSharedValue(false);
  const dragY = useSharedValue(0);       // y position in scroll view coords
  const scrollOffset = useSharedValue(0);

  const frameCallback = useFrameCallback(() => {
    if (!isDragging.value) return;

    const distFromTop = dragY.value;
    const distFromBottom = scrollViewHeight - dragY.value;
    const maxScroll = Math.max(0, contentHeight - scrollViewHeight);

    let speed = 0;
    if (distFromBottom < edgeThreshold && distFromBottom > 0) {
      // Near bottom edge: scroll down
      const ratio = 1 - distFromBottom / edgeThreshold;
      speed = ratio * maxSpeed;
    } else if (distFromTop < edgeThreshold && distFromTop > 0) {
      // Near top edge: scroll up
      const ratio = 1 - distFromTop / edgeThreshold;
      speed = -(ratio * maxSpeed);
    }

    if (speed !== 0) {
      const newOffset = Math.max(0, Math.min(maxScroll, scrollOffset.value + speed));
      scrollOffset.value = newOffset;
      scrollTo(scrollRef, 0, newOffset, false);
    }
  }, false); // start paused

  const startAutoScroll = useCallback(() => {
    isDragging.value = true;
    frameCallback.setActive(true);
  }, [isDragging, frameCallback]);

  const stopAutoScroll = useCallback(() => {
    isDragging.value = false;
    frameCallback.setActive(false);
  }, [isDragging, frameCallback]);

  const updateDragPosition = useCallback(
    (yInScrollView: number) => {
      dragY.value = yInScrollView;
    },
    [dragY],
  );

  const updateScrollOffset = useCallback(
    (offset: number) => {
      scrollOffset.value = offset;
    },
    [scrollOffset],
  );

  return {
    startAutoScroll,
    stopAutoScroll,
    updateDragPosition,
    updateScrollOffset,
    scrollOffset,
  };
}
