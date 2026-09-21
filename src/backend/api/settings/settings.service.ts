import { eq } from "drizzle-orm";
import { db } from "@backend/core/db/client";
import { now } from "@backend/core/db/ids";
import { settings } from "@backend/core/db/schema";

export type PhotoFit = "fill" | "fit";

export type WidgetSource = "snapshot" | "sqlite";

export interface AppSettings {
  refreshMinutes: number;
  showAlbumTitle: boolean;
  showDate: boolean;
  fit: PhotoFit;
  shuffle: boolean;
  widgetSource: WidgetSource;
}

export const DEFAULT_SETTINGS: AppSettings = {
  refreshMinutes: 60,
  showAlbumTitle: false,
  showDate: false,
  fit: "fill",
  shuffle: false,
  widgetSource: "snapshot",
};

const KEY = "app";

export class SettingsService {
  static read(): AppSettings {
    const row = db.select().from(settings).where(eq(settings.key, KEY)).get();
    if (row === undefined) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(row.value) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  }

  static write(next: Partial<AppSettings>): AppSettings {
    const merged = { ...SettingsService.read(), ...next };
    db.insert(settings)
      .values({ key: KEY, value: JSON.stringify(merged), updatedAt: now() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(merged), updatedAt: now() },
      })
      .run();
    return merged;
  }
}
