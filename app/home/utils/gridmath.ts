import type { PanelSize } from '../../../src/storage/HomePanelsService';
import { HALF_PANEL_SLOT_HEIGHT } from './gridLayoutConstants';

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelLayout {
  id: string;
  size: PanelSize;
  /** Used for full-width rows only; half slots use HALF_PANEL_SLOT_HEIGHT */
  measuredHeight?: number;
  /** 0 = left (default), 1 = right — only meaningful for a lone half on its row */
  columnHint?: 0 | 1;
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
    const h =
      panel.size === 'half'
        ? HALF_PANEL_SLOT_HEIGHT
        : (panel.measuredHeight ?? defaultItemHeight);

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
      // If this half is alone on the row and prefers column 1, skip column 0
      if (cursorX === 0 && panel.columnHint === 1) {
        const next = panels[i + 1];
        const nextIsHalf = next && next.size === 'half';
        if (!nextIsHalf) {
          cursorX = 1; // leave column 0 empty
        }
      }
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
 * @deprecated Prefer computeDropInsertIndex (grid-local coords + half slots)
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

export interface HalfDropSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Insert index in the array *after* removing the dragged item */
  insertJ: number;
  /** Which column this slot represents */
  col: 0 | 1;
}

export interface DropResult {
  insertJ: number;
  columnHint?: 0 | 1;
}

/**
 * Drop targets for half-width panels: each **half row** gets two full column
 * bands (left + right) so you always snap to column 1 or 2 — including when
 * only the left cell is filled and the right is empty.
 */
export function collectHalfDropSlots(
  panels: PanelLayout[],
  gridConfig: GridConfig,
): HalfDropSlot[] {
  const { containerWidth, columns, gap, defaultItemHeight } = gridConfig;
  const colWidth = (containerWidth - gap * (columns - 1)) / columns;
  const slots: HalfDropSlot[] = [];
  const n = panels.length;

  let cursorX = 0;
  let cursorY = 0;
  let rowMaxH = 0;
  let rowLeftK: number | null = null;

  const halfH = HALF_PANEL_SLOT_HEIGHT;

  const emitHalfRowPair = (y: number, h: number, leftInsertJ: number, rightInsertJ: number) => {
    slots.push({ x: 0, y, w: colWidth, h, insertJ: leftInsertJ, col: 0 });
    slots.push({ x: colWidth + gap, y, w: colWidth, h, insertJ: rightInsertJ, col: 1 });
  };

  const flushLonelyLeftBeforeFull = () => {
    if (cursorX !== 1 || rowLeftK === null) return;
    const y = cursorY;
    const h = Math.max(rowMaxH, halfH);
    emitHalfRowPair(y, h, rowLeftK, rowLeftK + 1);
    cursorY += h + gap;
    cursorX = 0;
    rowMaxH = 0;
    rowLeftK = null;
  };

  for (let k = 0; k < n; k++) {
    const p = panels[k];
    const hFull = p.measuredHeight ?? defaultItemHeight;

    if (p.size === 'full') {
      flushLonelyLeftBeforeFull();
      if (cursorX > 0) {
        cursorY += rowMaxH + gap;
        cursorX = 0;
        rowMaxH = 0;
        rowLeftK = null;
      }
      slots.push({
        x: 0,
        y: cursorY,
        w: containerWidth,
        h: hFull,
        insertJ: k,
        col: 0,
      });
      cursorY += hFull + gap;
      continue;
    }

    // half
    if (cursorX === 0) {
      rowLeftK = k;
      rowMaxH = halfH;
      cursorX = 1;
    } else {
      const y = cursorY;
      const h = Math.max(rowMaxH, halfH);
      const leftK = rowLeftK!;
      emitHalfRowPair(y, h, leftK, k);
      cursorY += h + gap;
      cursorX = 0;
      rowMaxH = 0;
      rowLeftK = null;
    }
  }

  if (cursorX === 1 && rowLeftK !== null) {
    const y = cursorY;
    const h = Math.max(rowMaxH, halfH);
    emitHalfRowPair(y, h, rowLeftK, rowLeftK + 1);
    cursorY += h + gap;
    cursorX = 0;
    rowLeftK = null;
  }

  const appendY = cursorY;
  emitHalfRowPair(appendY, halfH, n, n);

  return slots;
}

function pickHalfSlot(
  slots: HalfDropSlot[],
  gridX: number,
  gridY: number,
  maxJ: number,
  colMidX: number,
  colWidth: number,
): DropResult {
  const clampJ = (j: number) => Math.max(0, Math.min(j, maxJ));
  const result = (s: HalfDropSlot): DropResult => ({
    insertJ: clampJ(s.insertJ),
    columnHint: s.col,
  });
  const isFullWidth = (s: HalfDropSlot) => s.w > colWidth * 1.5;

  const padY = 20;
  const vDist = (s: HalfDropSlot) => {
    const cy = s.y + s.h / 2;
    return Math.abs(gridY - cy);
  };

  // Group all slots by row (same Y)
  const rowGroups = new Map<number, HalfDropSlot[]>();
  for (const s of slots) {
    const key = Math.round(s.y);
    const list = rowGroups.get(key) ?? [];
    list.push(s);
    rowGroups.set(key, list);
  }

  // Find closest row within padY
  let bestRow: HalfDropSlot[] | null = null;
  let bestRowDist = Infinity;
  for (const [, g] of rowGroups) {
    const midY = g[0].y + g[0].h / 2;
    const d = Math.abs(gridY - midY);
    if (d < bestRowDist && d < g[0].h / 2 + padY) {
      bestRowDist = d;
      bestRow = g;
    }
  }

  if (bestRow && bestRow.length >= 2) {
    const leftS = bestRow.find(s => s.col === 0);
    const rightS = bestRow.find(s => s.col === 1);
    if (leftS && rightS) {
      return result(gridX < colMidX ? leftS : rightS);
    }
  }

  if (bestRow && bestRow.length === 1) {
    const s = bestRow[0];
    if (isFullWidth(s)) {
      // Full-width row — pick column purely by finger X
      const col: 0 | 1 = gridX < colMidX ? 0 : 1;
      return { insertJ: clampJ(s.insertJ), columnHint: col };
    }
    return result(s);
  }

  // Fallback: closest slot by vertical distance
  let bestSlot = slots[0];
  let bestSc = Infinity;
  for (const s of slots) {
    const sc = vDist(s);
    if (sc < bestSc) {
      bestSc = sc;
      bestSlot = s;
    }
  }
  if (isFullWidth(bestSlot)) {
    const col: 0 | 1 = gridX < colMidX ? 0 : 1;
    return { insertJ: clampJ(bestSlot.insertJ), columnHint: col };
  }
  return result(bestSlot);
}

/**
 * Returns { insertJ, columnHint } for reorderPanels(wo, from, insertJ).
 * insertJ is the index in the array *after* removing the dragged item.
 * columnHint tells computeGridPositions which column a lone half should sit on.
 */
export function computeDropInsertIndex(
  panels: PanelLayout[],
  gridConfig: GridConfig,
  draggedId: string,
  gridX: number,
  gridY: number,
): DropResult {
  const fromIdx = panels.findIndex(p => p.id === draggedId);
  if (fromIdx < 0) return { insertJ: 0 };

  const dragged = panels[fromIdx];
  const without = panels.filter(p => p.id !== draggedId);
  const maxJ = without.length;

  if (dragged.size === 'half') {
    const { containerWidth, columns, gap } = gridConfig;
    const colWidth = (containerWidth - gap * (columns - 1)) / columns;
    const colMidX = colWidth + gap / 2;
    const slots = collectHalfDropSlots(without, gridConfig);
    return pickHalfSlot(slots, gridX, gridY, maxJ, colMidX, colWidth);
  }

  const pos = computeGridPositions(without, gridConfig);
  const hitId = hitTestGrid(pos, gridX, gridY);
  if (hitId !== null) {
    const j = without.findIndex(p => p.id === hitId);
    return { insertJ: Math.max(0, Math.min(j >= 0 ? j : 0, maxJ)) };
  }

  let bestJ = maxJ;
  let bestD = Infinity;
  for (let k = 0; k < without.length; k++) {
    const r = pos[without[k].id];
    if (!r) continue;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const d = (gridX - cx) ** 2 + (gridY - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      bestJ = k;
    }
  }
  return { insertJ: Math.max(0, Math.min(bestJ, maxJ)) };
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
