import { AlbumsService } from "@backend/api/albums/albums.service";
import { SettingsService } from "@backend/api/settings/settings.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import {
  FAMILY_PLANS,
  MINIMUM_INTERVAL_MINUTES,
  coverageHours,
  nextChangeAt,
  reloadsPerDay,
  type FamilyPlan,
} from "@const/widgetPlan";
import { usedBytes } from "@native/photoStore";

export interface FamilyReport extends FamilyPlan {
  coverageHours: number;
  reloadsPerDay: number;
}

export interface DiagnosticsReport {
  intervalMinutes: number;
  effectiveIntervalMinutes: number;
  shuffle: boolean;
  nextChangeAt: number;
  families: FamilyReport[];
  albumCount: number;
  photoCount: number;
  largestAlbum: { name: string; photos: number } | null;
  storageBytes: number;
  snapshotGeneratedAt: number | null;
}

export class DiagnosticsService {
  static async read(): Promise<DiagnosticsReport> {
    const settings = await SettingsService.read();
    const albums = await AlbumsService.list();
    const snapshot = await WidgetService.build();
    const effective = Math.max(MINIMUM_INTERVAL_MINUTES, settings.refreshMinutes);
    const biggest = albums.reduce<{ name: string; photos: number } | null>(
      (best, album) =>
        best === null || album.photoCount > best.photos
          ? { name: album.name, photos: album.photoCount }
          : best,
      null
    );

    return {
      intervalMinutes: settings.refreshMinutes,
      effectiveIntervalMinutes: effective,
      shuffle: settings.shuffle,
      nextChangeAt: nextChangeAt(settings.refreshMinutes),
      families: FAMILY_PLANS.map((plan) => ({
        ...plan,
        coverageHours: coverageHours(plan, settings.refreshMinutes),
        reloadsPerDay: reloadsPerDay(plan, settings.refreshMinutes),
      })),
      albumCount: albums.length,
      photoCount: albums.reduce((total, album) => total + album.photoCount, 0),
      largestAlbum: biggest,
      storageBytes: await usedBytes(),
      snapshotGeneratedAt: snapshot.generatedAt ?? null,
    };
  }
}
