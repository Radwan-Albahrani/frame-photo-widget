import { AlbumsService } from "@backend/api/albums/albums.service";
import { GroupsService } from "@backend/api/groups/groups.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { SettingsService } from "@backend/api/settings/settings.service";
import { toSnapshot, type WidgetSnapshot } from "@backend/api/widget/snapshot";
import { WIDGET_SETTINGS_KEY, WIDGET_SNAPSHOT_KEY, WIDGET_SOURCE_KEY } from "@const/identifiers";
import { reloadWidgets, setSnapshot } from "@native/photoStore";

export type { SnapshotAlbum, SnapshotGroup, WidgetSnapshot } from "@backend/api/widget/snapshot";

export class WidgetService {
  static async build(): Promise<WidgetSnapshot> {
    const [albums, photosByAlbum, groups] = await Promise.all([
      AlbumsService.list(),
      PhotosService.fileNamesByAlbum(),
      GroupsService.all(),
    ]);
    return toSnapshot(albums, photosByAlbum, groups, Date.now());
  }

  static async sync(): Promise<WidgetSnapshot> {
    const snapshot = await WidgetService.build();
    const appSettings = await SettingsService.read();
    setSnapshot(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
    setSnapshot(WIDGET_SETTINGS_KEY, JSON.stringify(appSettings));
    setSnapshot(WIDGET_SOURCE_KEY, appSettings.widgetSource);
    reloadWidgets();
    return snapshot;
  }
}
