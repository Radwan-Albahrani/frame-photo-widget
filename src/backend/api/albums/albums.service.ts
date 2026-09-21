import { asc, eq } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { createId, now } from "@backend/core/db/ids";
import { albums, photos, type AlbumRow } from "@backend/core/db/schema";
import { nextSortOrder } from "@backend/core/db/sortOrder";

export interface AlbumWithCount extends AlbumRow {
  photoCount: number;
  coverFileName: string | null;
}

export interface AlbumLibrary {
  albums: AlbumWithCount[];
  photosByAlbum: Map<string, { fileName: string }[]>;
}

export class AlbumsService {
  static async library(): Promise<AlbumLibrary> {
    const [rows, everyPhoto] = await Promise.all([
      db.select().from(albums).orderBy(asc(albums.sortOrder), asc(albums.createdAt)).all(),
      // what: leading with album_id lets the photos_album_order index serve this without a sort
      db
        .select({ id: photos.id, albumId: photos.albumId, fileName: photos.fileName })
        .from(photos)
        .orderBy(asc(photos.albumId), asc(photos.sortOrder), asc(photos.createdAt))
        .all(),
    ]);

    const photosByAlbum = new Map<string, { id: string; fileName: string }[]>();
    for (const photo of everyPhoto) {
      const owned = photosByAlbum.get(photo.albumId);
      if (owned === undefined) photosByAlbum.set(photo.albumId, [photo]);
      else owned.push(photo);
    }

    return {
      albums: rows.map((album) => {
        const owned = photosByAlbum.get(album.id) ?? [];
        const cover = owned.find((photo) => photo.id === album.coverPhotoId) ?? owned[0];
        return { ...album, photoCount: owned.length, coverFileName: cover?.fileName ?? null };
      }),
      photosByAlbum,
    };
  }

  static async list(): Promise<AlbumWithCount[]> {
    return (await AlbumsService.library()).albums;
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
