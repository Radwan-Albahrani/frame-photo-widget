import type { PhotoRow } from "@backend/core/db/schema";

export interface DuplicateCopy {
  photo: PhotoRow;
  albumId: string;
  albumName: string;
}

export interface DuplicateSet {
  key: string;
  copies: DuplicateCopy[];
}

export function identityOf(photo: PhotoRow): string | null {
  if (photo.assetId !== null && photo.assetId.length > 0) return `asset:${photo.assetId}`;
  if (photo.contentHash !== null && photo.contentHash.length > 0) {
    return `hash:${photo.contentHash}`;
  }
  return null;
}

export function groupDuplicates(rows: { photo: PhotoRow; albumName: string }[]): DuplicateSet[] {
  const buckets = new Map<string, DuplicateCopy[]>();
  for (const row of rows) {
    const key = identityOf(row.photo);
    if (key === null) continue;
    const copies = buckets.get(key) ?? [];
    copies.push({ photo: row.photo, albumId: row.photo.albumId, albumName: row.albumName });
    buckets.set(key, copies);
  }
  return [...buckets.entries()]
    .filter(([, copies]) => copies.length > 1)
    .map(([key, copies]) => ({ key, copies }));
}
