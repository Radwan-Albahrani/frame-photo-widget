import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albums, photos, type PhotoRow } from "@backend/core/db/schema";
import { deletePhotoFiles, savePhoto } from "@native/photoStore";

export class PhotosService {
  static async listByAlbum(albumId: string): Promise<PhotoRow[]> {
    return db
      .select()
      .from(photos)
      .where(eq(photos.albumId, albumId))
      .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
      .all();
  }

  static async countByAlbum(albumId: string): Promise<number> {
    const row = await db
      .select({ value: sql<number>`count(*)` })
      .from(photos)
      .where(eq(photos.albumId, albumId))
      .get();
    return row?.value ?? 0;
  }

  static async add(albumId: string, sourceUris: string[]): Promise<PhotoRow[]> {
    const highest = await db
      .select({ value: sql<number>`coalesce(max(${photos.sortOrder}), -1)` })
      .from(photos)
      .where(eq(photos.albumId, albumId))
      .get();
    let order = (highest?.value ?? -1) + 1;
    const created: PhotoRow[] = [];

    for (const sourceUri of sourceUris) {
      const id = createId();
      const saved = await savePhoto(sourceUri, `${id}.jpg`);
      if (saved === null) continue;
      const row: PhotoRow = {
        id,
        albumId,
        fileName: saved.fileName,
        width: saved.width,
        height: saved.height,
        bytes: saved.bytes,
        sortOrder: order,
        createdAt: now(),
      };
      await db.insert(photos).values(row).run();
      created.push(row);
      order += 1;
    }

    if (created.length > 0) {
      await db.update(albums).set({ updatedAt: now() }).where(eq(albums.id, albumId)).run();
    }
    return created;
  }

  static async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const rows = await db.select().from(photos).where(inArray(photos.id, ids)).all();
    await db.delete(photos).where(inArray(photos.id, ids)).run();
    await deletePhotoFiles(rows.map((row) => row.fileName));
  }

  static async removeAlbumPhotos(albumId: string): Promise<void> {
    const rows = await db.select().from(photos).where(eq(photos.albumId, albumId)).all();
    await db.delete(photos).where(eq(photos.albumId, albumId)).run();
    await deletePhotoFiles(rows.map((row) => row.fileName));
  }

  static async reorder(albumId: string, orderedIds: string[]): Promise<void> {
    for (const [index, id] of orderedIds.entries()) {
      await db.update(photos).set({ sortOrder: index }).where(eq(photos.id, id)).run();
    }
    await db.update(albums).set({ updatedAt: now() }).where(eq(albums.id, albumId)).run();
  }
}
