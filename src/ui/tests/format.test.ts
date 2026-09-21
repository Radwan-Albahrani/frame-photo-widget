import { describe, expect, it } from "vitest";
import { countLabel, formatBytes, groupCountLabel, photoCountLabel } from "@ui/format";

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
