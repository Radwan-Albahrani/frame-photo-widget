import { describe, expect, it } from "vitest";
import {
  coversUntil,
  nextChangeAfter,
  readWidgetStatus,
  verdict,
  type WidgetReport,
} from "@backend/api/diagnostics/widgetStatus";

const NOW = 1_790_000_000_000;
const HOUR = 3_600_000;

function record(overrides: Partial<WidgetReport> = {}): WidgetReport {
  return {
    family: "small",
    albumId: "a1",
    albumName: "Highlands",
    groupName: "",
    shuffle: false,
    state: "ok",
    photos: 24,
    entries: 24,
    frameWidth: 1049,
    frameHeight: 1095,
    archiveBytes: 6_700_000,
    intervalMinutes: 60,
    firstEntryAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("nextChangeAfter", () => {
  it("advances with the clock instead of reporting a boundary that already passed", () => {
    const widget = record();
    expect(nextChangeAfter(widget, NOW)).toBe(NOW + HOUR);
    expect(nextChangeAfter(widget, NOW + 90 * 60_000)).toBe(NOW + 2 * HOUR);
    expect(nextChangeAfter(widget, NOW + 10 * HOUR)).toBe(NOW + 11 * HOUR);
  });

  it("never returns a time in the past, however old the record is", () => {
    const widget = record();
    const late = NOW + 100 * HOUR;
    expect(nextChangeAfter(widget, late)).toBeGreaterThan(late);
  });
});

describe("coversUntil", () => {
  it("spans the whole batch that was scheduled", () => {
    expect(coversUntil(record())).toBe(NOW + 23 * HOUR);
    expect(coversUntil(record({ entries: 8, intervalMinutes: 15 }))).toBe(NOW + 105 * 60_000);
  });
});

describe("readWidgetStatus", () => {
  it("returns nothing when the extension has never written a record", () => {
    expect(readWidgetStatus(null, 1, NOW)).toEqual([]);
    expect(readWidgetStatus("{}", 1, NOW)).toEqual([]);
  });

  it("reports nothing once the last widget is gone, rather than describing a ghost", () => {
    const raw = JSON.stringify({ "small|a1||false": record() });
    expect(readWidgetStatus(raw, 0, NOW)).toEqual([]);
  });

  it("expires a record the extension stopped rewriting a week ago", () => {
    const raw = JSON.stringify({ "small|a1||false": record() });
    expect(readWidgetStatus(raw, 1, NOW + 6 * 24 * HOUR)).toHaveLength(1);
    expect(readWidgetStatus(raw, 1, NOW + 8 * 24 * HOUR)).toEqual([]);
  });

  it("keeps two same-size widgets on one album apart when they shuffle differently", () => {
    const raw = JSON.stringify({
      "small|a1||false": record(),
      "small|a1||true": record({ shuffle: true }),
    });
    expect(readWidgetStatus(raw, 2, NOW).map((widget) => widget.shuffle)).toEqual([false, true]);
  });

  it("orders by album then size so the list is stable between refreshes", () => {
    const raw = JSON.stringify({
      "large|a2||false": record({ family: "large", albumId: "a2", albumName: "Woodland" }),
      "small|a1||false": record(),
      "medium|a1||false": record({ family: "medium" }),
    });
    expect(
      readWidgetStatus(raw, 3, NOW).map((widget) => `${widget.albumName}/${widget.family}`)
    ).toEqual(["Highlands/medium", "Highlands/small", "Woodland/large"]);
  });
});

describe("verdict", () => {
  it("says none only when nothing is placed and nothing has reported", () => {
    expect(verdict(0, [])).toBe("none");
  });

  it("says waiting while a placed widget has not yet been asked for photos", () => {
    expect(verdict(1, [])).toBe("waiting");
  });

  it("says healthy while any widget is showing photos", () => {
    expect(verdict(1, [record()])).toBe("healthy");
    expect(verdict(2, [record(), record({ state: "noAlbum" })])).toBe("healthy");
  });

  it("calls out an empty album instead of reporting it as working", () => {
    expect(verdict(1, [record({ state: "noPhotos", photos: 0 })])).toBe("needsAlbum");
  });
});
