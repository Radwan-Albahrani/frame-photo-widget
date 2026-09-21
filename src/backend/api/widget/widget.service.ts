import { AlbumsService } from "@backend/api/albums/albums.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { SettingsService } from "@backend/api/settings/settings.service";
import { WIDGET_SETTINGS_KEY, WIDGET_SNAPSHOT_KEY, WIDGET_SOURCE_KEY } from "@const/identifiers";
import { reloadWidgets, setSnapshot } from "@native/photoStore";

export interface SnapshotAlbum {
  id: string;
  name: string;
  photos: string[];
}

export interface WidgetSnapshot {
  albums: SnapshotAlbum[];
  generatedAt: number;
}

export class WidgetService {
  static async build(): Promise<WidgetSnapshot> {
    const albums = await AlbumsService.list();
    const withPhotos: SnapshotAlbum[] = [];
    for (const album of albums) {
      const photos = await PhotosService.listByAlbum(album.id);
      withPhotos.push({
        id: album.id,
        name: album.name,
        photos: photos.map((photo) => photo.fileName),
      });
    }
    return { albums: withPhotos, generatedAt: Date.now() };
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
