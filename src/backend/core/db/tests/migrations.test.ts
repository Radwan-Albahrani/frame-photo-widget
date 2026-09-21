import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { COLUMNS, runMigrations } from "@backend/core/db/migrations";

function runnerFor(db: DatabaseSync) {
  return {
    execute: (sql: string) => {
      db.exec(sql);
    },
    columnsOf: (table: string) =>
      db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((row) => String((row as { name: unknown }).name)),
  };
}

function columns(db: DatabaseSync, table: string): string[] {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => String((row as { name: unknown }).name));
}

const SCHEMA_1_0_0_BUILD_2 = `
  CREATE TABLE albums (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, cover_photo_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
  CREATE TABLE photos (id TEXT PRIMARY KEY NOT NULL,
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL, width INTEGER NOT NULL DEFAULT 0, height INTEGER NOT NULL DEFAULT 0,
    bytes INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
  CREATE INDEX photos_album_order ON photos (album_id, sort_order);
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
`;

const SCHEMA_1_0_0_BUILD_4 = `
  ${SCHEMA_1_0_0_BUILD_2}
  CREATE TABLE album_groups (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
  ALTER TABLE albums ADD COLUMN group_id TEXT;
`;

function seed(db: DatabaseSync) {
  db.exec(`INSERT INTO albums (id,name,sort_order,created_at,updated_at)
           VALUES ('a1','Anime',0,1,1)`);
  db.exec(`INSERT INTO photos (id,album_id,file_name,sort_order,created_at)
           VALUES ('p1','a1','p1.jpg',0,1)`);
}

describe("runMigrations", () => {
  it("builds every table, column and index on a fresh install", () => {
    const db = new DatabaseSync(":memory:");
    runMigrations(runnerFor(db));

    for (const addition of COLUMNS) {
      expect(columns(db, addition.table)).toContain(addition.column);
    }
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((row) => String((row as { name: unknown }).name));
    expect(indexes).toContain("photos_content_hash");
  });

  it("upgrades a 1.0.0 (2) database without losing rows", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(SCHEMA_1_0_0_BUILD_2);
    seed(db);

    expect(() => runMigrations(runnerFor(db))).not.toThrow();

    expect(columns(db, "photos")).toContain("content_hash");
    expect(columns(db, "albums")).toContain("group_id");
    expect(db.prepare("SELECT count(*) AS n FROM photos").get()).toEqual({ n: 1 });
    expect(db.prepare("SELECT count(*) AS n FROM albums").get()).toEqual({ n: 1 });
  });

  it("upgrades a 1.0.0 (4) database that already has flat groups", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(SCHEMA_1_0_0_BUILD_4);
    seed(db);

    expect(() => runMigrations(runnerFor(db))).not.toThrow();

    expect(columns(db, "album_groups")).toContain("parent_id");
    expect(db.prepare("SELECT count(*) AS n FROM photos").get()).toEqual({ n: 1 });
  });

  it("is idempotent, so a relaunch re-runs it safely", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(SCHEMA_1_0_0_BUILD_2);
    seed(db);

    runMigrations(runnerFor(db));
    expect(() => runMigrations(runnerFor(db))).not.toThrow();
    expect(db.prepare("SELECT count(*) AS n FROM photos").get()).toEqual({ n: 1 });
  });

  it("creates each index only after the column it indexes exists", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(SCHEMA_1_0_0_BUILD_2);
    const order: string[] = [];
    const runner = runnerFor(db);
    runMigrations({
      execute: (sql) => {
        order.push(sql);
        runner.execute(sql);
      },
      columnsOf: runner.columnsOf,
    });

    const addedHash = order.findIndex((sql) => sql.includes("ADD COLUMN content_hash"));
    const indexedHash = order.findIndex((sql) => sql.includes("photos_content_hash"));
    expect(addedHash).toBeGreaterThanOrEqual(0);
    expect(indexedHash).toBeGreaterThan(addedHash);
  });
});
