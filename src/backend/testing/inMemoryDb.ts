import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/op-sqlite";
import { runMigrations } from "@backend/core/db/migrations";

export type TestDatabase = ReturnType<typeof drizzle>;

export interface TestDbHandle {
  db: TestDatabase;
  sqlite: DatabaseSync;
  close: () => void;
}

function isRead(sql: string): boolean {
  return /^\s*(select|pragma|with)\b/i.test(sql);
}

// what: drizzle's op-sqlite driver calls only these two, so tests and the device share one driver
function nodeSqliteClient(sqlite: DatabaseSync) {
  return {
    async execute(sql: string, params: unknown[] = []) {
      const statement = sqlite.prepare(sql);
      if (isRead(sql)) {
        return { rows: statement.all(...(params as never[])), rowsAffected: 0 };
      }
      const info = statement.run(...(params as never[]));
      return {
        rows: [],
        rowsAffected: Number(info.changes),
        insertId: Number(info.lastInsertRowid),
      };
    },
    async executeRaw(sql: string, params: unknown[] = []) {
      const statement = sqlite.prepare(sql);
      if (!isRead(sql)) {
        statement.run(...(params as never[]));
        return { rawRows: [] };
      }
      // what: a join can select two columns of one name, which object rows would collapse
      statement.setReturnArrays(true);
      return { rawRows: statement.all(...(params as never[])) };
    },
  };
}

export function createTestDb(): TestDbHandle {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  runMigrations({
    execute: (sql) => {
      sqlite.exec(sql);
    },
    columnsOf: (table) =>
      sqlite
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((row) => String((row as { name: unknown }).name)),
  });
  return {
    db: drizzle(nodeSqliteClient(sqlite) as never),
    sqlite,
    close: () => sqlite.close(),
  };
}
