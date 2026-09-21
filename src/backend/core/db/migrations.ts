export interface ColumnAddition {
  table: string;
  column: string;
  definition: string;
}

export const TABLES: string[] = [
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
  `CREATE TABLE IF NOT EXISTS album_groups (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
];

// what: every column added after 1.0.0 lives here, never in the CREATE TABLE above alone
export const COLUMNS: ColumnAddition[] = [
  { table: "albums", column: "group_id", definition: "TEXT" },
  { table: "album_groups", column: "parent_id", definition: "TEXT" },
  { table: "photos", column: "asset_id", definition: "TEXT" },
  { table: "photos", column: "content_hash", definition: "TEXT" },
];

export const INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS photos_album_order ON photos (album_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS photos_content_hash ON photos (content_hash)`,
  `CREATE INDEX IF NOT EXISTS albums_group ON albums (group_id)`,
  `CREATE INDEX IF NOT EXISTS album_groups_parent ON album_groups (parent_id)`,
];

export interface MigrationRunner {
  execute: (sql: string) => void;
  columnsOf: (table: string) => string[];
}

export function runMigrations(runner: MigrationRunner): void {
  for (const statement of TABLES) runner.execute(statement);

  for (const addition of COLUMNS) {
    const existing = runner.columnsOf(addition.table);
    if (existing.length === 0) continue;
    if (existing.includes(addition.column)) continue;
    runner.execute(
      `ALTER TABLE ${addition.table} ADD COLUMN ${addition.column} ${addition.definition}`
    );
  }

  for (const statement of INDEXES) runner.execute(statement);
}
