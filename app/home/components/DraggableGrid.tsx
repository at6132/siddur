import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, InteractionManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedRef,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DraggableGridItem } from './DraggableGridItem';
import { useGridLayout } from '../hooks/useGridLayout';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { spacing } from '../../../src/design/spacing';
import {
  computeGridPositions,
  computeGridHeight,
  computeDropInsertIndex,
  reorderPanels,
  type PanelLayout,
  type DropResult,
} from '../utils/gridmath';
import { HALF_PANEL_SLOT_HEIGHT } from '../utils/gridLayoutConstants';
import type { HomePanel } from '../../../src/storage/HomePanelsService';

const TAG = '[DraggableGrid]'; // keep tag for error logging

interface DraggableGridProps {
  panels: HomePanel[];
  isEditing: boolean;
  onReorder: (newOrder: HomePanel[]) => void;
  onRemove: (panelId: string) => void;
  renderPanelContent: (panel: HomePanel, index: number) => React.ReactNode;
  isAutoPanelFn: (panel: HomePanel) => boolean;
  isUnremovableFn: (panel: HomePanel) => boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  theme: any;
}

export const DraggableGrid: React.FC<DraggableGridProps> = ({
  panels,
  isEditing,
  onReorder,
  onRemove,
  renderPanelContent,
  isAutoPanelFn,
  isUnremovableFn,
  headerContent,
  footerContent,
  theme,
}) => {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { positions, gridHeight, config, recalculate } = useGridLayout();
  const activeId = useSharedValue<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const containerOffsetY = useSharedValue(0);
  /** Cumulative (oldSlot - newSlot) while dragging so reflows don't move the tile under the finger */
  const dragLayoutCompensateX = useSharedValue(0);
  const dragLayoutCompensateY = useSharedValue(0);
  const itemHeights = useRef<Record<string, number>>({});
  const gridContentRef = useRef<View | null>(null);

  const workingOrder = useRef<HomePanel[]>([]);
  const isDragActive = useRef(false);
  const pendingHandle = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  const { startAutoScroll, stopAutoScroll, updateDragPosition, updateScrollOffset, scrollOffset } =
    useAutoScroll({
      scrollRef,
      scrollViewHeight,
      contentHeight,
      edgeThreshold: 80,
      maxSpeed: 8,
    });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      runOnJS(updateScrollOffset)(event.contentOffset.y);
    },
  });

  const panelLayouts = useCallback(
    (panelsList: HomePanel[]): PanelLayout[] =>
      panelsList.map(p => ({
        id: p.id,
        size: p.size,
        measuredHeight:
          p.size === 'full'
            ? itemHeights.current[p.id] || config.defaultItemHeight
            : undefined,
        columnHint: (p.config?.columnHint as 0 | 1 | undefined) ?? undefined,
      })),
    [config.defaultItemHeight],
  );

  useEffect(() => {
    if (isDragActive.current) return;
    workingOrder.current = panels;
    recalculate(panelLayouts(panels));
  }, [panels, recalculate, panelLayouts]);

  const handleItemLayout = useCallback(
    (panelId: string, event: LayoutChangeEvent) => {
      try {
        const panel =
          workingOrder.current.find(p => p.id === panelId) ??
          panelsRef.current.find(p => p.id === panelId);
        if (panel?.size === 'half') return;

        const h = event.nativeEvent.layout.height;
        if (itemHeights.current[panelId] !== h) {
          itemHeights.current[panelId] = h;
          if (!isDragActive.current) {
            recalculate(panelLayouts(workingOrder.current));
          }
        }
      } catch (e) {
        console.error(TAG, 'handleItemLayout error:', e);
      }
    },
    [recalculate, panelLayouts],
  );

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    containerOffsetY.value = event.nativeEvent.layout.y;
  }, [containerOffsetY]);

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }, []);

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    setContentHeight(h);
  }, []);

  const cancelPending = useCallback(() => {
    try {
      if (pendingHandle.current) {
        pendingHandle.current.cancel();
        pendingHandle.current = null;
      }
    } catch (e) {
      console.error(TAG, 'cancelPending error:', e);
      pendingHandle.current = null;
    }
  }, []);

  const handleDragStart = useCallback(
    (id: string) => {
      try {
        cancelPending();
        isDragActive.current = true;
        dragLayoutCompensateX.value = 0;
        dragLayoutCompensateY.value = 0;
        activeId.value = id;
        workingOrder.current = [...panelsRef.current];
        startAutoScroll();
        requestAnimationFrame(() => setScrollEnabled(false));
      } catch (e) {
        console.error(TAG, 'handleDragStart CRASH:', e);
        isDragActive.current = false;
        dragLayoutCompensateX.value = 0;
        dragLayoutCompensateY.value = 0;
      }
    },
    [activeId, startAutoScroll, cancelPending],
  );

  const handleDragMove = useCallback(
    (id: string, absX: number, absY: number, dragViewportY: number) => {
      try {
        if (!isDragActive.current) return;
        updateDragPosition(dragViewportY);

        if (!workingOrder.current || workingOrder.current.length === 0) return;

        const node = gridContentRef.current;
        if (!node) return;

        node.measureInWindow((gx, gy) => {
          try {
            if (!isDragActive.current) return;
            const wo = workingOrder.current;
            if (!wo || wo.length === 0) return;

            const gridX = absX - gx;
            const gridY = absY - gy;

            const layouts = panelLayouts(wo);
            const drop: DropResult = computeDropInsertIndex(layouts, config, id, gridX, gridY);
            const fromIdx = wo.findIndex(p => p.id === id);
            if (fromIdx < 0) return;

            // Build new order (always a fresh copy so we can mutate config)
            let newOrder: HomePanel[];
            if (fromIdx === drop.insertJ) {
              newOrder = wo.map(p => ({ ...p }));
            } else {
              newOrder = reorderPanels(wo, fromIdx, drop.insertJ).map(p => ({ ...p }));
            }

            // Apply columnHint so the layout engine knows which column
            const draggedPanel = newOrder.find(p => p.id === id);
            if (draggedPanel) {
              const hint = drop.columnHint ?? 0;
              draggedPanel.config = { ...draggedPanel.config, columnHint: hint };
            }

            // Skip if nothing actually changed (order + columnHint)
            const key = (p: HomePanel) => p.id + ':' + (p.config?.columnHint ?? 0);
            const prevKey = wo.map(key).join(',');
            const newKey = newOrder.map(key).join(',');
            if (prevKey === newKey) return;

            const oldDragged = positions.value[id];
            workingOrder.current = newOrder;
            const newLayouts = panelLayouts(newOrder);
            const newPositions = computeGridPositions(newLayouts, config);
            const newDragged = newPositions[id];
            if (oldDragged && newDragged) {
              dragLayoutCompensateX.value += oldDragged.x - newDragged.x;
              dragLayoutCompensateY.value += oldDragged.y - newDragged.y;
            }
            positions.value = newPositions;
            gridHeight.value = computeGridHeight(newPositions);
          } catch (err) {
            console.error(TAG, 'handleDragMove measureInWindow CRASH:', err);
          }
        });
      } catch (e) {
        console.error(TAG, 'handleDragMove CRASH:', e);
      }
    },
    [config, panelLayouts, positions, gridHeight, updateDragPosition, dragLayoutCompensateX, dragLayoutCompensateY],
  );

  const handleDragEnd = useCallback(
    (_id: string) => {
      try {
        activeId.value = null;
        stopAutoScroll();
        requestAnimationFrame(() => setScrollEnabled(true));
        cancelPending();

        const finalOrder = workingOrder.current.map((p, i) => ({ ...p, order: i }));

        const handle = InteractionManager.runAfterInteractions(() => {
          try {
            isDragActive.current = false;
            dragLayoutCompensateX.value = 0;
            dragLayoutCompensateY.value = 0;
            pendingHandle.current = null;
            onReorderRef.current(finalOrder);
          } catch (e) {
            console.error(TAG, 'onReorder error:', e);
            isDragActive.current = false;
            dragLayoutCompensateX.value = 0;
            dragLayoutCompensateY.value = 0;
            pendingHandle.current = null;
          }
        });
        pendingHandle.current = handle;
      } catch (e) {
        console.error(TAG, 'handleDragEnd CRASH:', e);
        isDragActive.current = false;
        dragLayoutCompensateX.value = 0;
        dragLayoutCompensateY.value = 0;
        activeId.value = null;
        setScrollEnabled(true);
      }
    },
    [activeId, stopAutoScroll, cancelPending],
  );

  const gridAnimatedStyle = useAnimatedStyle(() => {
    const h = gridHeight.value;
    return { minHeight: h > 0 ? h : 200 };
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        bounces
        scrollEnabled={scrollEnabled}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onLayout={handleScrollViewLayout}
        onContentSizeChange={handleContentSizeChange}
      >
        {headerContent}

        <View style={styles.gridContainer} onLayout={handleContainerLayout}>
          <Animated.View ref={gridContentRef} style={[styles.grid, gridAnimatedStyle]} collapsable={false}>
            {panels.map((panel, index) => {
              const isAuto = isAutoPanelFn(panel);
              const isUnremovable = isUnremovableFn(panel);
              const content = renderPanelContent(panel, index);
              if (!content) return null;

              return (
                <DraggableGridItem
                  key={panel.id}
                  id={panel.id}
                  panelSize={panel.size}
                  isEditing={isEditing}
                  isAutoPanel={isAuto}
                  positions={positions}
                  activeId={activeId}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onRemove={isUnremovable ? undefined : () => onRemove(panel.id)}
                  scrollOffset={scrollOffset}
                  containerOffsetY={containerOffsetY}
                  dragLayoutCompensateX={dragLayoutCompensateX}
                  dragLayoutCompensateY={dragLayoutCompensateY}
                  theme={theme}
                >
                  <View
                    style={panel.size === 'half' ? styles.halfSlotWrapper : undefined}
                    onLayout={(e) => handleItemLayout(panel.id, e)}
                    collapsable={false}
                  >
                    {panel.size === 'half' ? (
                      <View style={styles.halfContentFill}>{content}</View>
                    ) : (
                      content
                    )}
                  </View>
                </DraggableGridItem>
              );
            })}
          </Animated.View>
        </View>

        {footerContent}
      </Animated.ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  gridContainer: {
    paddingHorizontal: spacing.lg,
    overflow: 'visible',
  },
  grid: {
    position: 'relative',
    overflow: 'visible',
  },
  halfSlotWrapper: {
    height: HALF_PANEL_SLOT_HEIGHT,
    width: '100%',
  },
  halfContentFill: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
});
