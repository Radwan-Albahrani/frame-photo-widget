import { asc, eq } from "drizzle-orm";
import { groupDuplicates, type DuplicateSet } from "@backend/api/duplicates/grouping";
import { db } from "@backend/core/db/client";
import { albums, photos } from "@backend/core/db/schema";

export type { DuplicateCopy, DuplicateSet } from "@backend/api/duplicates/grouping";

export class DuplicatesService {
  static async find(): Promise<DuplicateSet[]> {
    const rows = await db
      .select({ photo: photos, albumName: albums.name })
      .from(photos)
      .innerJoin(albums, eq(albums.id, photos.albumId))
      .orderBy(asc(photos.createdAt))
      .all();
    return groupDuplicates(rows);
  }

  static async count(): Promise<number> {
    const sets = await DuplicatesService.find();
    return sets.reduce((total, set) => total + set.copies.length - 1, 0);
  }
}
