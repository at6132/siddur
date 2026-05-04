import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { JiggleView } from './JiggleAnimation';
import type { GridPosition } from '../utils/gridmath';
import { HALF_PANEL_SLOT_HEIGHT } from '../utils/gridLayoutConstants';
import type { PanelSize } from '../../../src/storage/HomePanelsService';

const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.8 };
const DROP_SPRING = { damping: 22, stiffness: 260, mass: 0.9 };
const TAG = '[DraggableGridItem]';

export interface DraggableGridItemProps {
  id: string;
  panelSize: PanelSize;
  children: React.ReactNode;
  isEditing: boolean;
  isAutoPanel: boolean;
  positions: SharedValue<Record<string, GridPosition>>;
  activeId: SharedValue<string | null>;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, absX: number, absY: number, dragViewportY: number) => void;
  onDragEnd: (id: string) => void;
  onRemove?: () => void;
  scrollOffset: SharedValue<number>;
  containerOffsetY: SharedValue<number>;
  dragLayoutCompensateX: SharedValue<number>;
  dragLayoutCompensateY: SharedValue<number>;
  theme: any;
}

export const DraggableGridItem: React.FC<DraggableGridItemProps> = React.memo(({
  id,
  panelSize,
  children,
  isEditing,
  isAutoPanel,
  positions,
  activeId,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRemove,
  scrollOffset,
  containerOffsetY,
  dragLayoutCompensateX,
  dragLayoutCompensateY,
  theme,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const startScrollOffset = useSharedValue(0);

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const jsOnDragStart = useCallback((itemId: string) => {
    try {
      onDragStartRef.current(itemId);
    } catch (e) {
      console.error(TAG, 'jsOnDragStart CRASH:', e);
    }
  }, []);

  const jsOnDragMove = useCallback(
    (itemId: string, absX: number, absY: number, dragViewportY: number) => {
      try {
        onDragMoveRef.current(itemId, absX, absY, dragViewportY);
      } catch (e) {
        console.error(TAG, 'jsOnDragMove CRASH:', e);
      }
    },
    [],
  );

  const jsOnDragEnd = useCallback((itemId: string) => {
    try {
      translateX.value += dragLayoutCompensateX.value;
      translateY.value += dragLayoutCompensateY.value;
      dragLayoutCompensateX.value = 0;
      dragLayoutCompensateY.value = 0;
      translateX.value = withSpring(0, DROP_SPRING);
      translateY.value = withSpring(0, DROP_SPRING);
      zIndex.value = 1;
      onDragEndRef.current(itemId);
    } catch (e) {
      console.error(TAG, 'jsOnDragEnd error:', e);
      translateX.value = 0;
      translateY.value = 0;
      dragLayoutCompensateX.value = 0;
      dragLayoutCompensateY.value = 0;
      zIndex.value = 1;
    }
  }, [translateX, translateY, zIndex, dragLayoutCompensateX, dragLayoutCompensateY]);

  const panGesture = useMemo(() => {
    if (!isEditing || isAutoPanel) {
      return Gesture.Pan().enabled(false);
    }

    return Gesture.Pan()
      .activateAfterLongPress(250)
      .onStart(() => {
        'worklet';
        isDragging.value = true;
        startScrollOffset.value = scrollOffset.value;
        zIndex.value = 999;
        runOnJS(jsOnDragStart)(id);
      })
      .onUpdate((e) => {
        'worklet';
        const scrollDelta = scrollOffset.value - startScrollOffset.value;
        translateX.value = e.translationX;
        translateY.value = e.translationY + scrollDelta;
        const absX = e.absoluteX;
        const absY = e.absoluteY;
        const dragViewportY = e.absoluteY + scrollOffset.value - containerOffsetY.value;
        runOnJS(jsOnDragMove)(id, absX, absY, dragViewportY);
      })
      .onFinalize(() => {
        'worklet';
        if (!isDragging.value) return;
        isDragging.value = false;
        runOnJS(jsOnDragEnd)(id);
      });
  }, [isEditing, isAutoPanel, id, scrollOffset, containerOffsetY]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const pos = positions.value[id];
    if (!pos) return { position: 'absolute' as const, opacity: 0, left: 0, top: 0, width: 0, height: 0 };

    const isActive = activeId.value === id;
    const targetX = pos.x;
    const targetY = pos.y;
    const slotHeight =
      pos.h > 0 ? pos.h : panelSize === 'half' ? HALF_PANEL_SLOT_HEIGHT : 88;

    return {
      position: 'absolute' as const,
      left: isActive ? targetX : withSpring(targetX, SPRING_CONFIG),
      top: isActive ? targetY : withSpring(targetY, SPRING_CONFIG),
      width: pos.w,
      height: slotHeight,
      zIndex: zIndex.value,
      opacity: 1,
    };
  });

  const animatedItemStyle = useAnimatedStyle(() => {
    const isAnyActive = activeId.value !== null;
    const isActive = activeId.value === id;
    const dimOpacity = isAnyActive && !isActive ? 0.7 : 1;
    const cx = isActive ? dragLayoutCompensateX.value : 0;
    const cy = isActive ? dragLayoutCompensateY.value : 0;

    // iOS: omitting shadow keys when drag ends often leaves the old shadow path.
    // Half tiles also used overflow:hidden on this same view, which clips the shadow
    // layer and can leave a persistent grey outline — clip is moved to a child.
    return {
      transform: [
        { translateX: translateX.value + cx },
        { translateY: translateY.value + cy },
      ],
      opacity: dimOpacity,
      shadowColor: isActive ? '#000' : 'transparent',
      shadowOffset: { width: 0, height: isActive ? 8 : 0 },
      shadowOpacity: isActive ? 0.25 : 0,
      shadowRadius: isActive ? 16 : 0,
      elevation: isActive ? 12 : 0,
    };
  });

  const handleRemove = useCallback(() => {
    if (onRemove) onRemove();
  }, [onRemove]);

  return (
    <Animated.View style={animatedContainerStyle}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.itemWrapper, animatedItemStyle]}>
          <View
            style={panelSize === 'half' ? styles.itemHalfClip : styles.itemInnerFlex}
            collapsable={false}
          >
            <JiggleView isEditing={isEditing && !isAutoPanel}>
              <View pointerEvents={isEditing ? 'none' : 'auto'}>
                {children}
              </View>
            </JiggleView>
          </View>
        </Animated.View>
      </GestureDetector>

      {isEditing && !isAutoPanel && onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={[styles.removeButtonInner, { backgroundColor: theme.colors.semantic.error }]}>
            <Text style={styles.removeButtonText}>−</Text>
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
  /** Clip tile content only; shadow stays on parent so iOS doesn't keep a grey mask */
  itemHalfClip: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  itemInnerFlex: {
    flex: 1,
    minHeight: 0,
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
});
