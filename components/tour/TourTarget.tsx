import React, { useCallback, useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import { useTourOptional } from '../../src/tour/TourContext';
import type { TourTargetId } from '../../src/tour/types';

type TourTargetProps = {
  id: TourTargetId;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Registers its on-screen rect for the product tour spotlight.
 * Safe to mount when TourProvider is absent (no-op).
 */
export function TourTarget({ id, children, style }: TourTargetProps) {
  const tour = useTourOptional();
  const viewRef = useRef<View>(null);

  const publish = useCallback(() => {
    if (!tour) return;
    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      tour.registerTarget(id, { x, y, width, height });
    });
  }, [id, tour]);

  useEffect(() => {
    return () => {
      tour?.unregisterTarget(id);
    };
  }, [id, tour]);

  useEffect(() => {
    if (!tour?.active) return;
    const frame = requestAnimationFrame(publish);
    const t = setTimeout(publish, 120);
    const t2 = setTimeout(publish, 420);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [publish, tour?.active, tour?.stepIndex]);

  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      publish();
    },
    [publish]
  );

  return (
    <View ref={viewRef} collapsable={false} style={style} onLayout={onLayout}>
      {children}
    </View>
  );
}
