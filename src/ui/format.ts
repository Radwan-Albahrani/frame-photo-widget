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

export function clockAt(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function dayAndClockAt(epoch: number, from: number = Date.now()): string {
  const midnight = new Date(from);
  midnight.setHours(24, 0, 0, 0);
  const days = Math.ceil((epoch - midnight.getTime()) / 86_400_000);
  if (days <= 0) return clockAt(epoch);
  if (days === 1) return `tomorrow, ${clockAt(epoch)}`;
  const day = new Date(epoch).toLocaleDateString([], { weekday: "short", day: "numeric" });
  return `${day}, ${clockAt(epoch)}`;
}

export function agoFrom(epoch: number, from: number = Date.now()): string {
  const minutes = Math.round((from - epoch) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${countLabel(minutes, "minute", "minutes")} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${countLabel(hours, "hour", "hours")} ago`;
  return `${countLabel(Math.round(hours / 24), "day", "days")} ago`;
}

export function everyLabel(minutes: number): string {
  if (minutes >= 1440) return "once a day";
  if (minutes >= 60) return `every ${countLabel(minutes / 60, "hour", "hours")}`;
  return `every ${countLabel(minutes, "minute", "minutes")}`;
}
