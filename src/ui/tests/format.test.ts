import { describe, expect, it } from "vitest";
import { formatBytes, photoCountLabel } from "@ui/format";

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
