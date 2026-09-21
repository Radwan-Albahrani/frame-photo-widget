import { asc, eq, sql } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albumGroups, albums, type AlbumGroupRow } from "@backend/core/db/schema";

export class GroupsService {
  static async list(): Promise<AlbumGroupRow[]> {
    return db
      .select()
      .from(albumGroups)
      .orderBy(asc(albumGroups.sortOrder), asc(albumGroups.createdAt))
      .all();
  }

  static async create(name: string): Promise<AlbumGroupRow> {
    const timestamp = now();
    const highest = await db
      .select({ value: sql<number>`coalesce(max(${albumGroups.sortOrder}), -1)` })
      .from(albumGroups)
      .get();
    const row: AlbumGroupRow = {
      id: createId(),
      name: name.trim().length > 0 ? name.trim() : "Untitled",
      sortOrder: (highest?.value ?? -1) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(albumGroups).values(row).run();
    return row;
  }

  static async rename(id: string, name: string): Promise<void> {
    await db
      .update(albumGroups)
      .set({ name: name.trim(), updatedAt: now() })
      .where(eq(albumGroups.id, id))
      .run();
  }

  static async remove(id: string): Promise<void> {
    await db.update(albums).set({ groupId: null }).where(eq(albums.groupId, id)).run();
    await db.delete(albumGroups).where(eq(albumGroups.id, id)).run();
  }

  static async reorder(orderedIds: string[]): Promise<void> {
    const timestamp = now();
    for (const [index, id] of orderedIds.entries()) {
      await db
        .update(albumGroups)
        .set({ sortOrder: index, updatedAt: timestamp })
        .where(eq(albumGroups.id, id))
        .run();
    }
  }
}
