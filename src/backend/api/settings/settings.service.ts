import { eq } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { now } from "@backend/core/db/ids";
import { settings } from "@backend/core/db/schema";

export type PhotoFit = "fill" | "fit";

export type WidgetSource = "snapshot" | "sqlite";

export type PretickMode = "off" | "album" | "frame";

export interface AppSettings {
  refreshMinutes: number;
  showAlbumTitle: boolean;
  showDate: boolean;
  fit: PhotoFit;
  widgetSource: WidgetSource;
  pretick: PretickMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  refreshMinutes: 60,
  showAlbumTitle: false,
  showDate: false,
  fit: "fill",
  widgetSource: "snapshot",
  pretick: "album",
};

const KEY = "app";

export class SettingsService {
  static async read(): Promise<AppSettings> {
    const row = await db.select().from(settings).where(eq(settings.key, KEY)).get();
    if (row === undefined) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(row.value) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  }

  static async write(next: Partial<AppSettings>): Promise<AppSettings> {
    const current = await SettingsService.read();
    const merged = { ...current, ...next };
    await db
      .insert(settings)
      .values({ key: KEY, value: JSON.stringify(merged), updatedAt: now() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(merged), updatedAt: now() },
      })
      .run();
    return merged;
  }
}
