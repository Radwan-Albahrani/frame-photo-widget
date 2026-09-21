import { asc, eq, sql } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albums, photos, type AlbumRow } from "@backend/core/db/schema";

export interface AlbumWithCount extends AlbumRow {
  photoCount: number;
  coverFileName: string | null;
}

export class AlbumsService {
  static async list(): Promise<AlbumWithCount[]> {
    const rows = await db
      .select({
        id: albums.id,
        name: albums.name,
        coverPhotoId: albums.coverPhotoId,
        groupId: albums.groupId,
        sortOrder: albums.sortOrder,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
        photoCount: sql<number>`(
          SELECT count(*) FROM ${photos} WHERE ${photos.albumId} = ${albums.id}
        )`,
        coverFileName: sql<string | null>`COALESCE(
          (SELECT ${photos.fileName} FROM ${photos} WHERE ${photos.id} = ${albums.coverPhotoId}),
          (SELECT ${photos.fileName} FROM ${photos}
           WHERE ${photos.albumId} = ${albums.id}
           ORDER BY ${photos.sortOrder} ASC, ${photos.createdAt} ASC
           LIMIT 1)
        )`,
      })
      .from(albums)
      .orderBy(asc(albums.sortOrder), asc(albums.createdAt))
      .all();
    return rows as AlbumWithCount[];
  }

  static async inGroup(groupId: string | null): Promise<AlbumWithCount[]> {
    const all = await AlbumsService.list();
    return all.filter((album) => album.groupId === groupId);
  }

  static async byId(id: string): Promise<AlbumRow | null> {
    const row = await db.select().from(albums).where(eq(albums.id, id)).get();
    return row ?? null;
  }

  static async create(name: string): Promise<AlbumRow> {
    const timestamp = now();
    const highest = await db
      .select({ value: sql<number>`coalesce(max(${albums.sortOrder}), -1)` })
      .from(albums)
      .get();
    const row: AlbumRow = {
      id: createId(),
      name: name.trim().length > 0 ? name.trim() : "Untitled",
      coverPhotoId: null,
      groupId: null,
      sortOrder: (highest?.value ?? -1) + 1,
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
