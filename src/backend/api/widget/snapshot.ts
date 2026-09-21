import type { AlbumRow, PhotoRow } from "@backend/core/db/schema";

export interface SnapshotAlbum {
  id: string;
  name: string;
  photos: string[];
}

export interface WidgetSnapshot {
  albums: SnapshotAlbum[];
  generatedAt: number;
}

export function toSnapshot(
  albums: Pick<AlbumRow, "id" | "name">[],
  photosByAlbum: Map<string, Pick<PhotoRow, "fileName">[]>,
  generatedAt: number
): WidgetSnapshot {
  return {
    albums: albums.map((album) => ({
      id: album.id,
      name: album.name,
      photos: (photosByAlbum.get(album.id) ?? []).map((photo) => photo.fileName),
    })),
    generatedAt,
  };
}
