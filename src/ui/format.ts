export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export function photoCountLabel(count: number): string {
  return countLabel(count, "photo", "photos");
}

export function groupCountLabel(albumCount: number, folderCount: number): string {
  const albumPart = countLabel(albumCount, "album", "albums");
  if (folderCount === 0) return albumPart;
  return `${albumPart} · ${countLabel(folderCount, "folder", "folders")}`;
}
