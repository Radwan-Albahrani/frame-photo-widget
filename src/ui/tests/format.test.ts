import { describe, expect, it } from "vitest";
import {
  agoFrom,
  clockAt,
  countLabel,
  dayAndClockAt,
  everyLabel,
  formatBytes,
  groupCountLabel,
  photoCountLabel,
} from "@ui/format";

describe("formatBytes", () => {
  it("reports bytes, kilobytes and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("treats nothing stored as zero rather than NaN", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(Number.NaN)).toBe("0 KB");
  });
});

describe("photoCountLabel", () => {
  it("singularises exactly one photo", () => {
    expect(photoCountLabel(1)).toBe("1 photo");
    expect(photoCountLabel(0)).toBe("0 photos");
    expect(photoCountLabel(12)).toBe("12 photos");
  });
});

describe("countLabel", () => {
  it("singularises exactly one of anything", () => {
    expect(countLabel(1, "folder", "folders")).toBe("1 folder");
    expect(countLabel(0, "folder", "folders")).toBe("0 folders");
    expect(countLabel(3, "folder", "folders")).toBe("3 folders");
  });
});

describe("groupCountLabel", () => {
  it("names albums alone when a folder holds no subfolders", () => {
    expect(groupCountLabel(4, 0)).toBe("4 albums");
    expect(groupCountLabel(1, 0)).toBe("1 album");
  });

  it("names subfolders alongside albums", () => {
    expect(groupCountLabel(4, 1)).toBe("4 albums · 1 folder");
    expect(groupCountLabel(0, 2)).toBe("0 albums · 2 folders");
  });
});

describe("everyLabel", () => {
  it("singularises the hourly setting rather than saying every 1 hours", () => {
    expect(everyLabel(60)).toBe("every 1 hour");
    expect(everyLabel(360)).toBe("every 6 hours");
    expect(everyLabel(5)).toBe("every 5 minutes");
    expect(everyLabel(1440)).toBe("once a day");
  });
});

describe("agoFrom", () => {
  const NOW = new Date("2026-09-21T20:00:00").getTime();

  it("reads in whole minutes, hours and days", () => {
    expect(agoFrom(NOW, NOW)).toBe("just now");
    expect(agoFrom(NOW - 60_000, NOW)).toBe("1 minute ago");
    expect(agoFrom(NOW - 3 * 3_600_000, NOW)).toBe("3 hours ago");
    expect(agoFrom(NOW - 2 * 86_400_000, NOW)).toBe("2 days ago");
  });
});

describe("dayAndClockAt", () => {
  const NOW = new Date("2026-09-21T20:00:00").getTime();

  it("drops the day for today and names it beyond that", () => {
    expect(dayAndClockAt(NOW + 3_600_000, NOW)).toBe(clockAt(NOW + 3_600_000));
    expect(dayAndClockAt(NOW + 8 * 3_600_000, NOW)).toContain("tomorrow");
  });

  it("keeps the time on a named day, so two rows never mix formats", () => {
    expect(dayAndClockAt(NOW + 3 * 86_400_000, NOW)).toContain(":");
  });
});
