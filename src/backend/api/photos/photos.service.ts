import { asc, eq, inArray, isNull } from "drizzle-orm";
import { groupBy } from "@backend/core/collections";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albums, photos, type PhotoRow } from "@backend/core/db/schema";
import { nextSortOrder } from "@backend/core/db/sortOrder";
import { deletePhotoFiles, hashPhotoFiles, rebuildCopies, savePhoto } from "@native/photoStore";

export class PhotosService {
  static async listByAlbum(albumId: string): Promise<PhotoRow[]> {
    return db
      .select()
      .from(photos)
      .where(eq(photos.albumId, albumId))
      .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
      .all();
  }

  static async fileNamesByAlbum(): Promise<Map<string, { fileName: string }[]>> {
    const rows = await db
      .select({ albumId: photos.albumId, fileName: photos.fileName })
      .from(photos)
      .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
      .all();
    return groupBy(rows, (row) => row.albumId);
  }

  static async add(
    albumId: string,
    sources: { uri: string; assetId?: string | null }[]
  ): Promise<PhotoRow[]> {
    let order = await nextSortOrder(photos, photos.sortOrder, eq(photos.albumId, albumId));
    const created: PhotoRow[] = [];

    for (const source of sources) {
      const id = createId();
      const saved = await savePhoto(source.uri, `${id}.jpg`);
      if (saved === null) continue;
      const row: PhotoRow = {
        id,
        albumId,
        fileName: saved.fileName,
        assetId: source.assetId ?? null,
        contentHash: saved.contentHash,
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

  static async rebuildAllCopies(): Promise<{ rebuilt: number; unlinked: number; picked: number }> {
    const rows = await db.select().from(photos).all();
    const linked = rows.filter((row) => row.assetId !== null && row.assetId !== "");
    const fileNamesByAsset: Record<string, string[]> = {};
    for (const row of linked) {
      const assetId = row.assetId as string;
      fileNamesByAsset[assetId] = [...(fileNamesByAsset[assetId] ?? []), row.fileName];
    }
    const saved = await rebuildCopies(fileNamesByAsset);
    for (const copy of saved) {
      await db
        .update(photos)
        .set({
          width: copy.width,
          height: copy.height,
          bytes: copy.bytes,
          contentHash: copy.contentHash,
        })
        .where(eq(photos.fileName, copy.fileName))
        .run();
    }
    return {
      rebuilt: saved.length,
      unlinked: rows.length - linked.length,
      picked: new Set(saved.map((copy) => copy.assetId)).size,
    };
  }

  static async backfillHashes(): Promise<number> {
    const missing = await db
      .select({ id: photos.id, fileName: photos.fileName })
      .from(photos)
      .where(isNull(photos.contentHash))
      .all();
    if (missing.length === 0) return 0;

    const digests = await hashPhotoFiles(missing.map((row) => row.fileName));
    let updated = 0;
    for (const row of missing) {
      const digest = digests[row.fileName];
      if (digest === undefined) continue;
      await db.update(photos).set({ contentHash: digest }).where(eq(photos.id, row.id)).run();
      updated += 1;
    }
    return updated;
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

  static async moveToFront(albumId: string, photoId: string): Promise<void> {
    const rows = await PhotosService.listByAlbum(albumId);
    const reordered = [photoId, ...rows.map((row) => row.id).filter((id) => id !== photoId)];
    await PhotosService.reorder(albumId, reordered);
  }

  static async reorder(albumId: string, orderedIds: string[]): Promise<void> {
    for (const [index, id] of orderedIds.entries()) {
      await db.update(photos).set({ sortOrder: index }).where(eq(photos.id, id)).run();
    }
    await db.update(albums).set({ updatedAt: now() }).where(eq(albums.id, albumId)).run();
  }
}
