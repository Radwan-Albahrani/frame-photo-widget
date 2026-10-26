export interface Fold {
  start: number;
  end: number;
}

export interface GridSpec {
  width: number;
  gap: number;
  targetCell: number;
  minColumns: number;
  fold: Fold | null;
}

export interface GridLayout {
  columns: number;
  cellSize: number;
  columnX: number[];
}

interface Region {
  kind: string;
  frame: { x: number; y: number; width: number; height: number };
}

const SMALLEST_FOLD_CELL_RATIO = 0.6;
const SMALLEST_ROUNDED_UP_CELL_RATIO = 0.9;

function cellFor(width: number, gap: number, columns: number) {
  return (width - gap * (columns - 1)) / columns;
}

export function columnCount(width: number, gap: number, targetCell: number, minColumns: number) {
  const fitted = Math.max(minColumns, Math.floor((width + gap) / (targetCell + gap)));
  if (fitted <= minColumns || fitted % 2 === 0) return fitted;
  const roomForMore =
    cellFor(width, gap, fitted + 1) >= targetCell * SMALLEST_ROUNDED_UP_CELL_RATIO;
  return roomForMore ? fitted + 1 : fitted - 1;
}

export function verticalFold(regions: readonly Region[], width: number): Fold | null {
  for (const region of regions) {
    const { x, width: foldWidth, height } = region.frame;
    if (region.kind !== "division" || height <= foldWidth) continue;
    if (x <= 0 || x + foldWidth >= width) continue;
    return { start: x, end: x + foldWidth };
  }
  return null;
}

function evenGrid(width: number, gap: number, columns: number): GridLayout {
  const cellSize = cellFor(width, gap, columns);
  return {
    columns,
    cellSize,
    columnX: Array.from({ length: columns }, (_, column) => column * (cellSize + gap)),
  };
}

function splitAtFold(spec: GridSpec, fold: Fold, columns: number): GridLayout | null {
  const { width, gap, targetCell } = spec;
  const perSide = columns / 2;
  const leftEdge = fold.start - gap / 2;
  const rightEdge = fold.end + gap / 2;
  const sideCell = (side: number) => (side - gap * (perSide - 1)) / perSide;
  const cellSize = Math.min(sideCell(leftEdge), sideCell(width - rightEdge));
  if (cellSize < targetCell * SMALLEST_FOLD_CELL_RATIO) return null;

  const left = Array.from(
    { length: perSide },
    (_, column) => leftEdge - (perSide - column) * cellSize - (perSide - 1 - column) * gap
  );
  const right = Array.from(
    { length: perSide },
    (_, column) => rightEdge + column * (cellSize + gap)
  );
  return { columns, cellSize, columnX: [...left, ...right] };
}

export function gridLayout(spec: GridSpec): GridLayout {
  const columns = columnCount(spec.width, spec.gap, spec.targetCell, spec.minColumns);
  const split =
    spec.fold !== null && columns % 2 === 0 ? splitAtFold(spec, spec.fold, columns) : null;
  return split ?? evenGrid(spec.width, spec.gap, columns);
}

export function gridHeight(count: number, layout: GridLayout, gap: number) {
  const rows = Math.ceil(count / layout.columns);
  return rows === 0 ? 0 : rows * layout.cellSize + (rows - 1) * gap;
}

export function cellPosition(index: number, layout: GridLayout, gap: number) {
  "worklet";
  return {
    x: layout.columnX[index % layout.columns] ?? 0,
    y: Math.floor(index / layout.columns) * (layout.cellSize + gap),
  };
}

export function cellIndexAt(x: number, y: number, layout: GridLayout, gap: number, count: number) {
  "worklet";
  let column = 0;
  let nearest = Number.POSITIVE_INFINITY;
  for (let candidate = 0; candidate < layout.columns; candidate++) {
    const distance = Math.abs(x - (layout.columnX[candidate] ?? 0));
    if (distance < nearest) {
      nearest = distance;
      column = candidate;
    }
  }
  const row = Math.max(0, Math.round(y / (layout.cellSize + gap)));
  return Math.max(0, Math.min(count - 1, row * layout.columns + column));
}
