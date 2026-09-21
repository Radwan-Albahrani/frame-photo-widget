import { open, type DB } from "@op-engineering/op-sqlite";
import { drizzle } from "drizzle-orm/op-sqlite";
import { DATABASE_NAME } from "@const/identifiers";

let handle: DB | null = null;

function connection(): DB {
  if (handle === null) handle = open({ name: DATABASE_NAME });
  return handle;
}

export const db = drizzle(connection());

export function databasePath(): string {
  return connection().getDbPath();
}

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    cover_photo_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY NOT NULL,
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    bytes INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS photos_album_order ON photos (album_id, sort_order)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
];

export function migrate(): void {
  const sqlite = connection();
  sqlite.executeSync("PRAGMA journal_mode = WAL");
  sqlite.executeSync("PRAGMA foreign_keys = ON");
  for (const statement of STATEMENTS) sqlite.executeSync(statement);
}
