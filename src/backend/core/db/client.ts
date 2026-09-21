import { open, type DB } from "@op-engineering/op-sqlite";
import { drizzle } from "drizzle-orm/op-sqlite";
import { runMigrations } from "@backend/core/db/migrations";
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

export function migrate(): void {
  const sqlite = connection();
  sqlite.executeSync("PRAGMA journal_mode = WAL");
  sqlite.executeSync("PRAGMA foreign_keys = ON");
  runMigrations({
    execute: (sql) => {
      sqlite.executeSync(sql);
    },
    columnsOf: (table) => {
      const result = sqlite.executeSync(`PRAGMA table_info(${table})`);
      const rows = (result.rows ?? []) as { name?: unknown }[];
      return rows.map((row) => String(row.name ?? ""));
    },
  });
}
