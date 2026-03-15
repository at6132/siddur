import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { JiggleView } from './JiggleAnimation';
import type { GridPosition } from '../utils/gridmath';

const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.8 };
const DROP_SPRING = { damping: 22, stiffness: 260, mass: 0.9 };

export interface DraggableGridItemProps {
  id: string;
  children: React.ReactNode;
  isEditing: boolean;
  isAutoPanel: boolean;
  positions: SharedValue<Record<string, GridPosition>>;
  activeId: SharedValue<string | null>;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, absX: number, absY: number) => void;
  onDragEnd: (id: string) => void;
  onRemove?: () => void;
  onResize?: () => void;
  canResize?: boolean;
  currentSize?: 'half' | 'full';
  scrollOffset: SharedValue<number>;
  containerOffsetY: number;
  theme: any;
}

export const DraggableGridItem: React.FC<DraggableGridItemProps> = React.memo(({
  id,
  children,
  isEditing,
  isAutoPanel,
  positions,
  activeId,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemove,
  onResize,
  canResize = false,
  currentSize,
  scrollOffset,
  containerOffsetY,
  theme,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const startScrollOffset = useSharedValue(0);

  const panGesture = useMemo(() => {
    if (!isEditing || isAutoPanel) {
      return Gesture.Pan().enabled(false);
    }

    return Gesture.Pan()
      .activateAfterLongPress(250)
      .onStart(() => {
        isDragging.value = true;
        startScrollOffset.value = scrollOffset.value;
        scale.value = withSpring(1.06, SPRING_CONFIG);
        zIndex.value = 999;
        runOnJS(onDragStart)(id);
      })
      .onUpdate((e) => {
        const scrollDelta = scrollOffset.value - startScrollOffset.value;
        translateX.value = e.translationX;
        translateY.value = e.translationY + scrollDelta;
        const absX = e.absoluteX;
        const absY = e.absoluteY + scrollOffset.value - containerOffsetY;
        runOnJS(onDragMove)(id, absX, absY);
      })
      .onFinalize(() => {
        if (isDragging.value) {
          isDragging.value = false;
          translateX.value = withSpring(0, DROP_SPRING);
          translateY.value = withSpring(0, DROP_SPRING);
          scale.value = withSpring(1, DROP_SPRING);
          zIndex.value = withTiming(1, { duration: 200 });
          runOnJS(onDragEnd)(id);
        }
      });
  }, [
    isEditing, isAutoPanel, id,
    onDragStart, onDragMove, onDragEnd,
    containerOffsetY,
  ]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const pos = positions.value[id];
    if (!pos) return { position: 'absolute' as const, opacity: 0, left: 0, top: 0, width: 0, height: 0 };

    const isActive = activeId.value === id;
    const targetX = pos.x;
    const targetY = pos.y;
    const slotHeight = pos.h > 0 ? pos.h : 88;

    return {
      position: 'absolute' as const,
      left: isActive ? targetX : withSpring(targetX, SPRING_CONFIG),
      top: isActive ? targetY : withSpring(targetY, SPRING_CONFIG),
      width: pos.w,
      height: slotHeight,
      zIndex: zIndex.value,
      opacity: 1,
      overflow: 'hidden' as const,
    };
  });

  const animatedItemStyle = useAnimatedStyle(() => {
    const isAnyActive = activeId.value !== null;
    const isActive = activeId.value === id;
    const dimOpacity = isAnyActive && !isActive ? 0.7 : 1;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: dimOpacity,
      ...(isActive ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
      } : {}),
    };
  });

  const handleRemove = useCallback(() => {
    if (onRemove) onRemove();
  }, [onRemove]);

  const handleResize = useCallback(() => {
    if (onResize) onResize();
  }, [onResize]);

  return (
    <Animated.View style={animatedContainerStyle}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.itemWrapper, animatedItemStyle]}>
          <JiggleView isEditing={isEditing && !isAutoPanel}>
            <View pointerEvents={isEditing ? 'none' : 'auto'}>
              {children}
            </View>
          </JiggleView>
        </Animated.View>
      </GestureDetector>

      {/* Remove button */}
      {isEditing && !isAutoPanel && onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={[styles.removeButtonInner, { backgroundColor: theme.colors?.semantic?.error || '#e74c3c' }]}>
            <Text style={styles.removeButtonText}>−</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Resize button */}
      {isEditing && !isAutoPanel && canResize && (
        <TouchableOpacity
          style={styles.resizeButton}
          onPress={handleResize}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[styles.resizeButtonInner, { backgroundColor: theme.colors?.primary?.main || '#7c6fa0' }]}>
            <Text style={styles.resizeButtonText}>
              {currentSize === 'half' ? '⤢' : '⤡'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  itemWrapper: {
    flex: 1,
    overflow: 'visible',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    left: -6,
    zIndex: 100,
  },
  removeButtonInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    } : {}),
    elevation: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },
  resizeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 100,
  },
  resizeButtonInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    } : {}),
    elevation: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  resizeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
