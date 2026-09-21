import { describe, expect, it } from "vitest";
import { groupDuplicates } from "@backend/api/duplicates/grouping";
import type { PhotoRow } from "@backend/core/db/schema";

function photo(overrides: Partial<PhotoRow> & { id: string }): PhotoRow {
  return {
    albumId: "album",
    fileName: `${overrides.id}.jpg`,
    assetId: null,
    contentHash: null,
    width: 0,
    height: 0,
    bytes: 0,
    sortOrder: 0,
    createdAt: 0,
    ...overrides,
  };
}

describe("groupDuplicates", () => {
  it("groups photos that share a photo-library asset id", () => {
    const sets = groupDuplicates([
      { photo: photo({ id: "1", assetId: "A", albumId: "x" }), albumName: "X" },
      { photo: photo({ id: "2", assetId: "A", albumId: "y" }), albumName: "Y" },
      { photo: photo({ id: "3", assetId: "B", albumId: "y" }), albumName: "Y" },
    ]);
    expect(sets).toHaveLength(1);
    expect(sets[0].copies.map((copy) => copy.albumName)).toEqual(["X", "Y"]);
  });

  it("falls back to the content hash when there is no asset id", () => {
    const sets = groupDuplicates([
      { photo: photo({ id: "1", contentHash: "h" }), albumName: "X" },
      { photo: photo({ id: "2", contentHash: "h" }), albumName: "Y" },
    ]);
    expect(sets).toHaveLength(1);
    expect(sets[0].key).toBe("hash:h");
  });

  it("ignores photos with no identity and singletons", () => {
    const sets = groupDuplicates([
      { photo: photo({ id: "1" }), albumName: "X" },
      { photo: photo({ id: "2" }), albumName: "Y" },
      { photo: photo({ id: "3", assetId: "solo" }), albumName: "Y" },
    ]);
    expect(sets).toEqual([]);
  });

  it("reports the same photo added twice to one album", () => {
    const sets = groupDuplicates([
      { photo: photo({ id: "1", assetId: "A", albumId: "x" }), albumName: "X" },
      { photo: photo({ id: "2", assetId: "A", albumId: "x" }), albumName: "X" },
    ]);
    expect(sets[0].copies).toHaveLength(2);
  });
});
