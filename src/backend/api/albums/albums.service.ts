import { eq } from "drizzle-orm";
import { albumsWithCounts, type AlbumWithCount } from "@backend/api/albums/albums.query";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albums, type AlbumRow } from "@backend/core/db/schema";
import { nextSortOrder } from "@backend/core/db/sortOrder";

export type { AlbumWithCount } from "@backend/api/albums/albums.query";

export class AlbumsService {
  static async list(): Promise<AlbumWithCount[]> {
    return albumsWithCounts(db);
  }

  static async byId(id: string): Promise<AlbumRow | null> {
    const row = await db.select().from(albums).where(eq(albums.id, id)).get();
    return row ?? null;
  }

  static async create(name: string): Promise<AlbumRow> {
    const timestamp = now();
    const row: AlbumRow = {
      id: createId(),
      name: name.trim().length > 0 ? name.trim() : "Untitled",
      coverPhotoId: null,
      groupId: null,
      sortOrder: await nextSortOrder(albums, albums.sortOrder),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.insert(albums).values(row).run();
    return row;
  }

  static async rename(id: string, name: string): Promise<void> {
    await db
      .update(albums)
      .set({ name: name.trim(), updatedAt: now() })
      .where(eq(albums.id, id))
      .run();
  }

  static async setCover(id: string, photoId: string | null): Promise<void> {
    await db
      .update(albums)
      .set({ coverPhotoId: photoId, updatedAt: now() })
      .where(eq(albums.id, id))
      .run();
  }

  static async setGroup(id: string, groupId: string | null): Promise<void> {
    await db.update(albums).set({ groupId, updatedAt: now() }).where(eq(albums.id, id)).run();
  }

  static async remove(id: string): Promise<void> {
    await db.delete(albums).where(eq(albums.id, id)).run();
  }

  static async reorder(orderedIds: string[]): Promise<void> {
    const timestamp = now();
    for (const [index, id] of orderedIds.entries()) {
      await db
        .update(albums)
        .set({ sortOrder: index, updatedAt: timestamp })
        .where(eq(albums.id, id))
        .run();
    }
  }
}
