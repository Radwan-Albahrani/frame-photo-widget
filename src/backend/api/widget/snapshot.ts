import type { AlbumGroupRow, AlbumRow, PhotoRow } from "@backend/core/db/schema";

export interface SnapshotAlbum {
  id: string;
  name: string;
  groupId: string | null;
  photos: string[];
}

export interface SnapshotGroup {
  id: string;
  name: string;
  parentId: string | null;
}

export interface WidgetSnapshot {
  albums: SnapshotAlbum[];
  groups: SnapshotGroup[];
  generatedAt: number;
}

export function toSnapshot(
  albums: Pick<AlbumRow, "id" | "name" | "groupId">[],
  photosByAlbum: Map<string, Pick<PhotoRow, "fileName">[]>,
  groups: Pick<AlbumGroupRow, "id" | "name" | "parentId">[],
  generatedAt: number
): WidgetSnapshot {
  return {
    albums: albums.map((album) => ({
      id: album.id,
      name: album.name,
      groupId: album.groupId,
      photos: (photosByAlbum.get(album.id) ?? []).map((photo) => photo.fileName),
    })),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      parentId: group.parentId,
    })),
    generatedAt,
  };
}
