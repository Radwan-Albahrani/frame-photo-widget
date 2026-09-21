import { asc, eq, sql } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albums, photos, type AlbumRow } from "@backend/core/db/schema";

export interface AlbumWithCount extends AlbumRow {
  photoCount: number;
  coverFileName: string | null;
}

export class AlbumsService {
  static list(): AlbumWithCount[] {
    const rows = db
      .select({
        id: albums.id,
        name: albums.name,
        coverPhotoId: albums.coverPhotoId,
        sortOrder: albums.sortOrder,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
        photoCount: sql<number>`count(${photos.id})`,
        coverFileName: sql<string | null>`min(${photos.fileName})`,
      })
      .from(albums)
      .leftJoin(photos, eq(photos.albumId, albums.id))
      .groupBy(albums.id)
      .orderBy(asc(albums.sortOrder), asc(albums.createdAt))
      .all();
    return rows as AlbumWithCount[];
  }

  static byId(id: string): AlbumRow | null {
    return db.select().from(albums).where(eq(albums.id, id)).get() ?? null;
  }

  static create(name: string): AlbumRow {
    const timestamp = now();
    const highest = db
      .select({ value: sql<number>`coalesce(max(${albums.sortOrder}), -1)` })
      .from(albums)
      .get();
    const row: AlbumRow = {
      id: createId(),
      name: name.trim().length > 0 ? name.trim() : "Untitled",
      coverPhotoId: null,
      sortOrder: (highest?.value ?? -1) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(albums).values(row).run();
    return row;
  }

  static rename(id: string, name: string): void {
    db.update(albums)
      .set({ name: name.trim(), updatedAt: now() })
      .where(eq(albums.id, id))
      .run();
  }

  static setCover(id: string, photoId: string | null): void {
    db.update(albums)
      .set({ coverPhotoId: photoId, updatedAt: now() })
      .where(eq(albums.id, id))
      .run();
  }

  static remove(id: string): void {
    db.delete(albums).where(eq(albums.id, id)).run();
  }

  static reorder(orderedIds: string[]): void {
    const timestamp = now();
    orderedIds.forEach((id, index) => {
      db.update(albums)
        .set({ sortOrder: index, updatedAt: timestamp })
        .where(eq(albums.id, id))
        .run();
    });
  }
}
