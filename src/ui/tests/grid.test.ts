import { describe, expect, it } from "vitest";
import {
  cellIndexAt,
  cellPosition,
  columnCount,
  type Fold,
  gridHeight,
  gridLayout,
  verticalFold,
} from "@ui/layout/grid";

const PHOTO = { gap: 6, targetCell: 110, minColumns: 3 };
const CARD = { gap: 16, targetCell: 150, minColumns: 2 };

function overlapsFold(x: number, size: number, fold: Fold) {
  return x < fold.end && x + size > fold.start;
}

describe("columnCount", () => {
  it.each([320, 375, 393, 402, 430, 440])("keeps three photo columns on a %ipt iPhone", (phone) => {
    expect(columnCount(phone - 12, PHOTO.gap, PHOTO.targetCell, PHOTO.minColumns)).toBe(3);
  });

  it.each([320, 375, 393, 402, 430, 440])("keeps two library columns on a %ipt iPhone", (phone) => {
    expect(columnCount(phone - 32, CARD.gap, CARD.targetCell, CARD.minColumns)).toBe(2);
  });

  it.each([600, 760, 900, 1012, 1300])("picks an even count on a %ipt wide window", (width) => {
    const columns = columnCount(width, PHOTO.gap, PHOTO.targetCell, PHOTO.minColumns);
    expect(columns).toBeGreaterThan(3);
    expect(columns % 2).toBe(0);
  });

  it("rounds an odd fit up to the next even count when the cells stay close to target", () => {
    expect(columnCount(637, CARD.gap, CARD.targetCell, CARD.minColumns)).toBe(4);
    expect(columnCount(657, PHOTO.gap, PHOTO.targetCell, PHOTO.minColumns)).toBe(6);
  });

  it("rounds an odd fit down when one more column would shrink the cells too far", () => {
    expect(columnCount(560, CARD.gap, CARD.targetCell, CARD.minColumns)).toBe(2);
  });

  it("never goes below the minimum", () => {
    expect(columnCount(80, PHOTO.gap, PHOTO.targetCell, PHOTO.minColumns)).toBe(3);
  });
});

describe("gridLayout without a fold", () => {
  it("matches the original phone grid exactly", () => {
    const width = 393 - 12;
    const layout = gridLayout({ ...PHOTO, width, fold: null });
    const original = (393 - 6 * 4) / 3;
    expect(layout.cellSize).toBeCloseTo(original);
    expect(layout.columnX).toEqual([0, original + 6, 2 * (original + 6)]);
  });

  it("fills the width edge to edge", () => {
    const layout = gridLayout({ ...CARD, width: 992, fold: null });
    const last = layout.columnX[layout.columns - 1] ?? 0;
    expect(last + layout.cellSize).toBeCloseTo(992);
  });
});

describe("gridLayout with a fold", () => {
  const width = 900;
  const fold = { start: 446, end: 460 };

  it("keeps every cell off the fold", () => {
    for (const spec of [PHOTO, CARD]) {
      const layout = gridLayout({ ...spec, width, fold });
      for (const x of layout.columnX) {
        expect(overlapsFold(x, layout.cellSize, fold)).toBe(false);
      }
    }
  });

  it("keeps half the columns on each side, inside the grid", () => {
    const layout = gridLayout({ ...PHOTO, width, fold });
    const left = layout.columnX.filter((x) => x < fold.start);
    expect(left).toHaveLength(layout.columns / 2);
    expect(Math.min(...layout.columnX)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...layout.columnX) + layout.cellSize).toBeLessThanOrEqual(width + 1e-9);
  });

  it("widens only the gap at the hinge", () => {
    const layout = gridLayout({ ...PHOTO, width, fold });
    const half = layout.columns / 2;
    const step = (layout.columnX[1] ?? 0) - (layout.columnX[0] ?? 0);
    expect(step).toBeCloseTo(layout.cellSize + PHOTO.gap);
    const hinge = (layout.columnX[half] ?? 0) - (layout.columnX[half - 1] ?? 0) - layout.cellSize;
    expect(hinge).toBeGreaterThanOrEqual(fold.end - fold.start + PHOTO.gap - 1e-9);
  });

  it("handles a fold that is off center because of the side bar", () => {
    const offCenter = { start: 380, end: 394 };
    const layout = gridLayout({ ...CARD, width: 816, fold: offCenter });
    for (const x of layout.columnX) {
      expect(overlapsFold(x, layout.cellSize, offCenter)).toBe(false);
    }
  });

  it("falls back to an even grid when one side is too narrow", () => {
    const layout = gridLayout({ ...PHOTO, width, fold: { start: 40, end: 54 } });
    expect(layout).toEqual(gridLayout({ ...PHOTO, width, fold: null }));
  });

  it("ignores a fold when the column count is odd", () => {
    const layout = gridLayout({ ...PHOTO, width: 381, fold: { start: 180, end: 194 } });
    expect(layout).toEqual(gridLayout({ ...PHOTO, width: 381, fold: null }));
  });
});

describe("verticalFold", () => {
  const frame = (x: number, width: number, height: number) => ({ x, y: 0, width, height });

  it("reads a vertical division inside the grid", () => {
    expect(verticalFold([{ kind: "division", frame: frame(400, 14, 800) }], 900)).toEqual({
      start: 400,
      end: 414,
    });
  });

  it("ignores occlusions, horizontal folds and folds outside the grid", () => {
    expect(verticalFold([{ kind: "occlusion", frame: frame(400, 14, 800) }], 900)).toBeNull();
    expect(verticalFold([{ kind: "division", frame: frame(0, 900, 14) }], 900)).toBeNull();
    expect(verticalFold([{ kind: "division", frame: frame(-20, 14, 800) }], 900)).toBeNull();
    expect(verticalFold([{ kind: "division", frame: frame(900, 14, 800) }], 900)).toBeNull();
  });
});

describe("cell positions", () => {
  const layouts = {
    phone: gridLayout({ ...PHOTO, width: 381, fold: null }),
    wide: gridLayout({ ...PHOTO, width: 900, fold: null }),
    folded: gridLayout({ ...PHOTO, width: 900, fold: { start: 446, end: 460 } }),
  };

  it.each(Object.entries(layouts))("round-trips every index on the %s grid", (_name, layout) => {
    const count = layout.columns * 4 - 1;
    for (let index = 0; index < count; index++) {
      const { x, y } = cellPosition(index, layout, PHOTO.gap);
      expect(cellIndexAt(x, y, layout, PHOTO.gap, count)).toBe(index);
    }
  });

  it("snaps a drag across the hinge to the first column past it", () => {
    const layout = layouts.folded;
    const half = layout.columns / 2;
    const justPast = (layout.columnX[half] ?? 0) - 5;
    expect(cellIndexAt(justPast, 0, layout, PHOTO.gap, 100)).toBe(half);
  });

  it("clamps drags outside the grid", () => {
    expect(cellIndexAt(-500, -500, layouts.phone, PHOTO.gap, 10)).toBe(0);
    expect(cellIndexAt(5000, 5000, layouts.phone, PHOTO.gap, 10)).toBe(9);
  });

  it("sizes the grid by its rows", () => {
    const layout = layouts.phone;
    expect(gridHeight(0, layout, 6)).toBe(0);
    expect(gridHeight(4, layout, 6)).toBeCloseTo(layout.cellSize * 2 + 6);
  });
});
