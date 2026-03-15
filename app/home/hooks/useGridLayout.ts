import { useCallback, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { spacing } from '../../../src/design/spacing';
import {
  computeGridPositions,
  computeGridHeight,
  type GridConfig,
  type GridPosition,
  type PanelLayout,
} from '../utils/gridmath';

const GRID_GAP = spacing.sm;
const COLUMNS = 2;
const DEFAULT_ITEM_HEIGHT = 88;

export function useGridLayout() {
  const { width: screenWidth } = Dimensions.get('window');
  const containerWidth = screenWidth - spacing.lg * 2;

  const config: GridConfig = useMemo(() => ({
    containerWidth,
    columns: COLUMNS,
    gap: GRID_GAP,
    defaultItemHeight: DEFAULT_ITEM_HEIGHT,
  }), [containerWidth]);

  const positions = useSharedValue<Record<string, GridPosition>>({});
  const gridHeight = useSharedValue(0);

  const columnWidth = useMemo(
    () => (containerWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS,
    [containerWidth],
  );

  const recalculate = useCallback(
    (panels: PanelLayout[]) => {
      const newPositions = computeGridPositions(panels, config);
      positions.value = newPositions;
      gridHeight.value = computeGridHeight(newPositions);
      return newPositions;
    },
    [config, positions, gridHeight],
  );

  return {
    positions,
    gridHeight,
    config,
    columnWidth,
    containerWidth,
    gap: GRID_GAP,
    recalculate,
  };
}
