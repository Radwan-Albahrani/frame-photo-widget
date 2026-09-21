import { and, asc, count, eq, min } from "drizzle-orm";
import { alias, type SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core";
import { albums, photos, type AlbumRow } from "@backend/core/db/schema";

export type AsyncDatabase = SQLiteAsyncDatabase<"async", unknown>;

export interface AlbumWithCount extends AlbumRow {
  photoCount: number;
  coverFileName: string | null;
}

export async function albumsWithCounts(database: AsyncDatabase): Promise<AlbumWithCount[]> {
  // what: SQLite reads bare columns from the row that produced min(), so this is the first photo
  const firstPhoto = database
    .select({
      albumId: photos.albumId,
      fileName: photos.fileName,
      lowestSortOrder: min(photos.sortOrder).as("lowest_sort_order"),
      total: count().as("total"),
    })
    .from(photos)
    .groupBy(photos.albumId)
    .as("first_photo");

  const chosenCover = alias(photos, "chosen_cover");

  const rows = await database
    .select({
      album: albums,
      total: firstPhoto.total,
      firstFileName: firstPhoto.fileName,
      chosenFileName: chosenCover.fileName,
    })
    .from(albums)
    .leftJoin(firstPhoto, eq(firstPhoto.albumId, albums.id))
    .leftJoin(
      chosenCover,
      and(eq(chosenCover.id, albums.coverPhotoId), eq(chosenCover.albumId, albums.id))
    )
    .orderBy(asc(albums.sortOrder), asc(albums.createdAt))
    .all();

  return rows.map((row) => ({
    ...row.album,
    photoCount: row.total ?? 0,
    coverFileName: row.chosenFileName ?? row.firstFileName ?? null,
  }));
}
