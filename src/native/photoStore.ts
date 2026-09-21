import native, { type SavedPhoto } from "@/modules/frame-photo-store";
import { WIDGET_THUMBNAIL_MAX_PIXELS, WIDGET_THUMBNAIL_QUALITY } from "@const/identifiers";

export type { SavedPhoto };

export const isPhotoStoreAvailable = native != null;

export async function savePhoto(sourceUri: string, fileName: string): Promise<SavedPhoto | null> {
  if (native == null) return null;
  return native.savePhoto(
    sourceUri,
    fileName,
    WIDGET_THUMBNAIL_MAX_PIXELS,
    WIDGET_THUMBNAIL_QUALITY
  );
}

export async function deletePhotoFiles(fileNames: string[]): Promise<number> {
  if (native == null || fileNames.length === 0) return 0;
  return native.deletePhotos(fileNames);
}

export async function hashPhotoFiles(fileNames: string[]): Promise<Record<string, string>> {
  if (native == null || fileNames.length === 0) return {};
  return native.hashPhotos(fileNames);
}

export function photoUri(fileName: string): string | null {
  return native?.photoUri(fileName) ?? null;
}

export function containerPath(): string | null {
  return native?.containerPath() ?? null;
}

export function setSnapshot(key: string, json: string): void {
  native?.setSnapshot(key, json);
}

export function getSnapshot(key: string): string | null {
  return native?.getSnapshot(key) ?? null;
}

export function reloadWidgets(): void {
  native?.reloadWidgets();
}

export async function placedWidgetCount(): Promise<number> {
  if (native == null) return 0;
  return native.placedWidgetCount();
}

export async function usedBytes(): Promise<number> {
  if (native == null) return 0;
  return native.usedBytes();
}
