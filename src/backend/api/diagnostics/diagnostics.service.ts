import { AlbumsService } from "@backend/api/albums/albums.service";
import {
  readWidgetStatus,
  verdict,
  type Health,
  type WidgetReport,
} from "@backend/api/diagnostics/widgetStatus";
import { WidgetService } from "@backend/api/widget/widget.service";
import { SettingsService, type AppSettings } from "@backend/api/settings/settings.service";
import { placedWidgetCount, usedBytes } from "@native/photoStore";

export type { Health, WidgetReport };

export interface DiagnosticsReport {
  widgets: WidgetReport[];
  placedCount: number;
  health: Health;
  display: AppSettings;
  albumCount: number;
  photoCount: number;
  largestAlbum: { name: string; photos: number } | null;
  storageBytes: number;
}

export class DiagnosticsService {
  static async read(): Promise<DiagnosticsReport> {
    const now = Date.now();
    const [albums, placed, bytes, display] = await Promise.all([
      AlbumsService.list(),
      placedWidgetCount(),
      usedBytes(),
      SettingsService.read(),
    ]);
    const widgets = readWidgetStatus(WidgetService.readStatus(), placed, now);
    const biggest = albums.reduce<{ name: string; photos: number } | null>(
      (best, album) =>
        best === null || album.photoCount > best.photos
          ? { name: album.name, photos: album.photoCount }
          : best,
      null
    );

    return {
      widgets,
      placedCount: placed,
      health: verdict(placed, widgets),
      display,
      albumCount: albums.length,
      photoCount: albums.reduce((total, album) => total + album.photoCount, 0),
      largestAlbum: biggest,
      storageBytes: bytes,
    };
  }
}
