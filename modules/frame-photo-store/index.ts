import { requireOptionalNativeModule } from "expo";

export interface RebuiltPhoto extends SavedPhoto {
  assetId: string;
}

export interface SavedPhoto {
  fileName: string;
  uri: string;
  width: number;
  height: number;
  bytes: number;
  contentHash: string;
}

interface FramePhotoStoreModule {
  savePhoto(
    sourceUri: string,
    fileName: string,
    maxPixels: number,
    quality: number
  ): Promise<SavedPhoto>;
  deletePhotos(fileNames: string[]): Promise<number>;
  hashPhotos(fileNames: string[]): Promise<Record<string, string>>;
  photoUri(fileName: string): string | null;
  containerPath(): string | null;
  setSnapshot(key: string, json: string): void;
  getSnapshot(key: string): string | null;
  reloadWidgets(): void;
  placedWidgetCount(): Promise<number>;
  rebuildCopies(
    fileNamesByAsset: Record<string, string[]>,
    maxPixels: number,
    quality: number
  ): Promise<RebuiltPhoto[]>;
  usedBytes(): Promise<number>;
}

const native = requireOptionalNativeModule<FramePhotoStoreModule>("FramePhotoStore");

export const isPhotoStoreAvailable = native != null;

export default native;
