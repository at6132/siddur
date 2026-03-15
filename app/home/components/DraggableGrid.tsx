import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
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
  computeDropIndex,
  reorderPanels,
  type PanelLayout,
  type GridPosition,
} from '../utils/gridmath';
import type { HomePanel } from '../../../src/storage/HomePanelsService';

interface DraggableGridProps {
  panels: HomePanel[];
  isEditing: boolean;
  onReorder: (newOrder: HomePanel[]) => void;
  onRemove: (panelId: string) => void;
  onResize: (panelId: string) => void;
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
  onResize,
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
  const containerOffsetY = useRef(0);
  const itemHeights = useRef<Record<string, number>>({});

  const workingOrder = useRef<HomePanel[]>([]);

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
        measuredHeight: itemHeights.current[p.id] || config.defaultItemHeight,
      })),
    [config.defaultItemHeight],
  );

  useEffect(() => {
    workingOrder.current = panels;
    recalculate(panelLayouts(panels));
  }, [panels, recalculate, panelLayouts]);

  const handleItemLayout = useCallback(
    (panelId: string, event: LayoutChangeEvent) => {
      const h = event.nativeEvent.layout.height;
      if (itemHeights.current[panelId] !== h) {
        itemHeights.current[panelId] = h;
        recalculate(panelLayouts(workingOrder.current));
      }
    },
    [recalculate, panelLayouts],
  );

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    containerOffsetY.current = event.nativeEvent.layout.y;
  }, []);

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }, []);

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    setContentHeight(h);
  }, []);

  const handleDragStart = useCallback(
    (id: string) => {
      activeId.value = id;
      workingOrder.current = [...panels];
      setScrollEnabled(false);
      startAutoScroll();
    },
    [panels, activeId, startAutoScroll],
  );

  const handleDragMove = useCallback(
    (id: string, absX: number, absY: number) => {
      updateDragPosition(absY);

      const layouts = panelLayouts(workingOrder.current);
      const currentPositions = computeGridPositions(layouts, config);
      const dropIndex = computeDropIndex(layouts, currentPositions, id, absX, absY);
      const currentIndex = workingOrder.current.findIndex(p => p.id === id);

      if (dropIndex !== currentIndex && dropIndex >= 0) {
        const newOrder = reorderPanels(workingOrder.current, currentIndex, dropIndex);
        workingOrder.current = newOrder;
        const newLayouts = panelLayouts(newOrder);
        const newPositions = computeGridPositions(newLayouts, config);
        positions.value = newPositions;
        gridHeight.value = computeGridHeight(newPositions);
      }
    },
    [config, panelLayouts, positions, gridHeight, updateDragPosition],
  );

  const handleDragEnd = useCallback(
    (_id: string) => {
      activeId.value = null;
      setScrollEnabled(true);
      stopAutoScroll();
      const finalOrder = workingOrder.current.map((p, i) => ({ ...p, order: i }));
      onReorder(finalOrder);
    },
    [activeId, stopAutoScroll, onReorder],
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
          <Animated.View style={[styles.grid, gridAnimatedStyle]}>
            {panels.map((panel, index) => {
              const isAuto = isAutoPanelFn(panel);
              const isUnremovable = isUnremovableFn(panel);
              const content = renderPanelContent(panel, index);
              if (!content) return null;

              return (
                <DraggableGridItem
                  key={panel.id}
                  id={panel.id}
                  isEditing={isEditing}
                  isAutoPanel={isAuto}
                  positions={positions}
                  activeId={activeId}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onRemove={isUnremovable ? undefined : () => onRemove(panel.id)}
                  onResize={() => onResize(panel.id)}
                  canResize={!isAuto}
                  currentSize={panel.size}
                  scrollOffset={scrollOffset}
                  containerOffsetY={containerOffsetY.current}
                  theme={theme}
                >
                  <View
                    onLayout={(e) => handleItemLayout(panel.id, e)}
                    collapsable={false}
                  >
                    {content}
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
});
