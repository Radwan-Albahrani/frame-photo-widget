import { AlbumsService } from "@backend/api/albums/albums.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { SettingsService } from "@backend/api/settings/settings.service";
import {
  WIDGET_SETTINGS_KEY,
  WIDGET_SNAPSHOT_KEY,
  WIDGET_SOURCE_KEY,
} from "@const/identifiers";
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
  static build(): WidgetSnapshot {
    const albums = AlbumsService.list().map((album) => ({
      id: album.id,
      name: album.name,
      photos: PhotosService.listByAlbum(album.id).map((photo) => photo.fileName),
    }));
    return { albums, generatedAt: Date.now() };
  }

  static sync(): WidgetSnapshot {
    const snapshot = WidgetService.build();
    const appSettings = SettingsService.read();
    setSnapshot(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
    setSnapshot(WIDGET_SETTINGS_KEY, JSON.stringify(appSettings));
    setSnapshot(WIDGET_SOURCE_KEY, appSettings.widgetSource);
    reloadWidgets();
    return snapshot;
  }
}
