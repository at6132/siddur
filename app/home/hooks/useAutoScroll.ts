import { useCallback, useEffect } from 'react';
import type { AnimatedRef } from 'react-native-reanimated';
import Animated, {
  useSharedValue,
  useFrameCallback,
  scrollTo,
} from 'react-native-reanimated';

interface AutoScrollConfig {
  scrollRef: AnimatedRef<Animated.ScrollView>;
  edgeThreshold?: number;
  maxSpeed?: number;
  scrollViewHeight: number;
  contentHeight: number;
}

export function useAutoScroll({
  scrollRef,
  edgeThreshold = 80,
  maxSpeed = 8,
  scrollViewHeight,
  contentHeight,
}: AutoScrollConfig) {
  const isDragging = useSharedValue(false);
  const dragY = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const viewHeight = useSharedValue(scrollViewHeight);
  const totalHeight = useSharedValue(contentHeight);

  useEffect(() => {
    viewHeight.value = scrollViewHeight;
  }, [scrollViewHeight, viewHeight]);

  useEffect(() => {
    totalHeight.value = contentHeight;
  }, [contentHeight, totalHeight]);

  const frameCallback = useFrameCallback(() => {
    'worklet';
    if (!isDragging.value) return;

    const svHeight = viewHeight.value;
    const cHeight = totalHeight.value;
    if (svHeight <= 0) return;

    const distFromTop = dragY.value;
    const distFromBottom = svHeight - dragY.value;
    const maxScroll = Math.max(0, cHeight - svHeight);

    let speed = 0;
    if (distFromBottom < edgeThreshold && distFromBottom > 0) {
      const ratio = 1 - distFromBottom / edgeThreshold;
      speed = ratio * maxSpeed;
    } else if (distFromTop < edgeThreshold && distFromTop > 0) {
      const ratio = 1 - distFromTop / edgeThreshold;
      speed = -(ratio * maxSpeed);
    }

    if (speed !== 0) {
      const newOffset = Math.max(0, Math.min(maxScroll, scrollOffset.value + speed));
      scrollOffset.value = newOffset;
      scrollTo(scrollRef, 0, newOffset, false);
    }
  }, false);

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
