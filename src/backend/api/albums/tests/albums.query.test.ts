import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { albumsWithCounts } from "@backend/api/albums/albums.query";
import { createTestDb, type TestDatabase, type TestDbHandle } from "@backend/testing/inMemoryDb";

let handle: TestDbHandle;
let sqlite: DatabaseSync;
let database: TestDatabase;

function addAlbum(id: string, name: string, order: number, cover: string | null): void {
  sqlite
    .prepare(
      `INSERT INTO albums (id, name, cover_photo_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 0)`
    )
    .run(id, name, cover, order);
}

function addPhoto(id: string, albumId: string, fileName: string, order: number): void {
  sqlite
    .prepare(
      `INSERT INTO photos (id, album_id, file_name, width, height, bytes, sort_order, created_at)
       VALUES (?, ?, ?, 1, 1, 1, ?, 0)`
    )
    .run(id, albumId, fileName, order);
}

beforeEach(() => {
  handle = createTestDb();
  sqlite = handle.sqlite;
  database = handle.db;
});

afterEach(() => {
  handle.close();
});

describe("albumsWithCounts", () => {
  it("counts the photos in each album", async () => {
    addAlbum("a", "Travel", 0, null);
    addAlbum("b", "Empty", 1, null);
    addPhoto("p1", "a", "one.jpg", 0);
    addPhoto("p2", "a", "two.jpg", 1);

    const rows = await albumsWithCounts(database);

    expect(rows.map((row) => [row.name, row.photoCount])).toEqual([
      ["Travel", 2],
      ["Empty", 0],
    ]);
  });

  it("falls back to the first photo by sort order when no cover is set", async () => {
    addAlbum("a", "Travel", 0, null);
    addPhoto("p2", "a", "second.jpg", 1);
    addPhoto("p1", "a", "first.jpg", 0);

    const [row] = await albumsWithCounts(database);

    expect(row?.coverFileName).toBe("first.jpg");
  });

  it("prefers the chosen cover over the first photo", async () => {
    addAlbum("a", "Travel", 0, "p2");
    addPhoto("p1", "a", "first.jpg", 0);
    addPhoto("p2", "a", "chosen.jpg", 1);

    const [row] = await albumsWithCounts(database);

    expect(row?.coverFileName).toBe("chosen.jpg");
  });

  it("ignores a cover pointing at a photo from another album", async () => {
    addAlbum("a", "Travel", 0, "p9");
    addAlbum("b", "Other", 1, null);
    addPhoto("p1", "a", "first.jpg", 0);
    addPhoto("p9", "b", "foreign.jpg", 0);

    const [row] = await albumsWithCounts(database);

    expect(row?.coverFileName).toBe("first.jpg");
  });

  it("reports an empty album as no photos and no cover", async () => {
    addAlbum("a", "Empty", 0, null);

    const [row] = await albumsWithCounts(database);

    expect(row?.photoCount).toBe(0);
    expect(row?.coverFileName).toBeNull();
  });

  it("orders albums by sort order", async () => {
    addAlbum("a", "Third", 2, null);
    addAlbum("b", "First", 0, null);
    addAlbum("c", "Second", 1, null);

    const rows = await albumsWithCounts(database);

    expect(rows.map((row) => row.name)).toEqual(["First", "Second", "Third"]);
  });
});
