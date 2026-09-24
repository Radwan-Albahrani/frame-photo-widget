import { SettingsService } from "@backend/api/settings/settings.service";
import { RETIRED_WIDGET_KEYS, WIDGET_SETTINGS_KEY, WIDGET_STATUS_KEY } from "@const/identifiers";
import {
  getSharedValue,
  reloadWidgets,
  removeSharedValue,
  setSharedValue,
} from "@native/photoStore";

export class WidgetService {
  static readStatus(): string | null {
    return getSharedValue(WIDGET_STATUS_KEY);
  }

  static async sync(): Promise<void> {
    const appSettings = await SettingsService.read();
    setSharedValue(WIDGET_SETTINGS_KEY, JSON.stringify(appSettings));
    for (const key of RETIRED_WIDGET_KEYS) removeSharedValue(key);
    reloadWidgets();
  }
}
