import { describe, expect, it } from "vitest";
import { toSnapshot } from "@backend/api/widget/snapshot";

describe("toSnapshot", () => {
  it("keeps album order and maps photos to file names", () => {
    const snapshot = toSnapshot(
      [
        { id: "a", name: "Kyoto" },
        { id: "b", name: "Winter" },
      ],
      new Map([
        ["a", [{ fileName: "1.jpg" }, { fileName: "2.jpg" }]],
        ["b", [{ fileName: "3.jpg" }]],
      ]),
      42
    );

    expect(snapshot.generatedAt).toBe(42);
    expect(snapshot.albums.map((album) => album.id)).toEqual(["a", "b"]);
    expect(snapshot.albums[0].photos).toEqual(["1.jpg", "2.jpg"]);
    expect(snapshot.albums[1].photos).toEqual(["3.jpg"]);
  });

  it("emits an empty photo list for an album with no photos", () => {
    const snapshot = toSnapshot([{ id: "a", name: "Empty" }], new Map(), 0);
    expect(snapshot.albums[0].photos).toEqual([]);
  });
});
