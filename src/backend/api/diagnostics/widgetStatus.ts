const LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  extraLarge: "Extra large",
};

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type WidgetState = "ok" | "noAlbum" | "noPhotos";

export interface WidgetReport {
  family: string;
  albumId: string;
  albumName: string;
  groupName: string;
  shuffle: boolean;
  state: WidgetState;
  photos: number;
  entries: number;
  decodePixels: number;
  intervalMinutes: number;
  firstEntryAt: number;
  updatedAt: number;
}

export type Health = "healthy" | "waiting" | "none" | "unreadable" | "needsAlbum";

export function familyLabel(family: string): string {
  return LABELS[family] ?? family;
}

export function nextChangeAfter(widget: WidgetReport, now: number): number {
  const step = widget.intervalMinutes * 60_000;
  if (step <= 0) return widget.firstEntryAt;
  const elapsed = Math.max(0, now - widget.firstEntryAt);
  return widget.firstEntryAt + (Math.floor(elapsed / step) + 1) * step;
}

export function coversUntil(widget: WidgetReport): number {
  return widget.firstEntryAt + (widget.entries - 1) * widget.intervalMinutes * 60_000;
}

export function readWidgetStatus(raw: string | null, placed: number, now: number): WidgetReport[] {
  if (raw === null || placed === 0) return [];
  const parsed = JSON.parse(raw) as Record<string, WidgetReport>;
  return Object.values(parsed)
    .filter((widget) => now - widget.updatedAt < STALE_AFTER_MS)
    .sort((a, b) => a.albumName.localeCompare(b.albumName) || a.family.localeCompare(b.family));
}

export function verdict(placed: number, widgets: WidgetReport[]): Health {
  if (widgets.length === 0) return placed === 0 ? "none" : "waiting";
  if (widgets.every((widget) => widget.state !== "ok")) return "needsAlbum";
  return "healthy";
}
