import type { PanelSize } from '../../../src/storage/HomePanelsService';

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelLayout {
  id: string;
  size: PanelSize;
  measuredHeight?: number;
}

export interface GridConfig {
  containerWidth: number;
  columns: number;
  gap: number;
  defaultItemHeight: number;
}

/**
 * 2-column bin-packing: place panels left-to-right, top-to-bottom.
 * 'half' panels occupy 1 column; 'full' panels span both.
 * Two consecutive halves share a row; a full always starts a new row.
 */
export function computeGridPositions(
  panels: PanelLayout[],
  config: GridConfig,
): Record<string, GridPosition> {
  const { containerWidth, columns, gap, defaultItemHeight } = config;
  const colWidth = (containerWidth - gap * (columns - 1)) / columns;
  const positions: Record<string, GridPosition> = {};

  let cursorX = 0; // which column slot (0 or 1)
  let cursorY = 0; // current y offset
  let rowMaxH = 0; // tallest item in the current row

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const h = panel.measuredHeight || defaultItemHeight;

    if (panel.size === 'full') {
      // Full-width panel: flush any partial row first
      if (cursorX > 0) {
        cursorY += rowMaxH + gap;
        cursorX = 0;
        rowMaxH = 0;
      }
      positions[panel.id] = {
        x: 0,
        y: cursorY,
        w: containerWidth,
        h,
      };
      cursorY += h + gap;
      // cursorX stays 0, rowMaxH stays 0
    } else {
      // Half-width panel
      const x = cursorX * (colWidth + gap);
      positions[panel.id] = {
        x,
        y: cursorY,
        w: colWidth,
        h,
      };
      rowMaxH = Math.max(rowMaxH, h);
      cursorX++;
      if (cursorX >= columns) {
        cursorY += rowMaxH + gap;
        cursorX = 0;
        rowMaxH = 0;
      }
    }
  }

  return positions;
}

/**
 * Given a drag point, find which panel slot it falls over.
 * Returns the panel id or null.
 */
export function hitTestGrid(
  positions: Record<string, GridPosition>,
  pointX: number,
  pointY: number,
  excludeId?: string,
): string | null {
  for (const id in positions) {
    if (id === excludeId) continue;
    const pos = positions[id];
    if (
      pointX >= pos.x &&
      pointX <= pos.x + pos.w &&
      pointY >= pos.y &&
      pointY <= pos.y + pos.h
    ) {
      return id;
    }
  }
  return null;
}

/**
 * Compute where a dragged item should be inserted in the panel order,
 * based on which slot its center currently overlaps.
 */
export function computeDropIndex(
  panels: PanelLayout[],
  positions: Record<string, GridPosition>,
  draggedId: string,
  dragCenterX: number,
  dragCenterY: number,
): number {
  const draggedIdx = panels.findIndex(p => p.id === draggedId);
  const hitId = hitTestGrid(positions, dragCenterX, dragCenterY, draggedId);
  if (hitId === null) return draggedIdx;
  const targetIdx = panels.findIndex(p => p.id === hitId);
  if (targetIdx < 0) return draggedIdx;
  return targetIdx;
}

/**
 * Reorder the panels array by moving `fromIndex` to `toIndex`.
 */
export function reorderPanels<T>(
  panels: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (fromIndex === toIndex) return panels;
  const result = panels.slice();
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

/**
 * Total height of the grid given current positions.
 */
export function computeGridHeight(
  positions: Record<string, GridPosition>,
): number {
  let maxBottom = 0;
  for (const id in positions) {
    const pos = positions[id];
    const bottom = pos.y + pos.h;
    if (bottom > maxBottom) maxBottom = bottom;
  }
  return maxBottom;
}
