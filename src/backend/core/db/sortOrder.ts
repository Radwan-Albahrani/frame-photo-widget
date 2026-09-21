import { max, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@backend/core/db/client";

export async function nextSortOrder(
  table: SQLiteTable,
  column: SQLiteColumn,
  where?: SQL
): Promise<number> {
  const query = db.select({ value: max(column) }).from(table);
  const row = where === undefined ? await query.get() : await query.where(where).get();
  return Number(row?.value ?? -1) + 1;
}
