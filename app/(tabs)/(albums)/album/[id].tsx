import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from "react-native";
import { AlbumsService } from "@backend/api/albums/albums.service";
import { GroupsService } from "@backend/api/groups/groups.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import type { PhotoRow } from "@backend/core/db/schema";
import { photoUri } from "@native/photoStore";
import { ConfirmDialog, EmptyState, Text } from "@ui/components";
import { photoCountLabel } from "@ui/format";
import { ReorderableGrid } from "@ui/components/media/ReorderableGrid";
import {
  albumHeaderItems,
  albumHeaders,
  albumTitle,
  sameAlbumHeader,
} from "@ui/header/albumHeader";
import { useScreenHeader } from "@ui/header/useScreenHeader";
import { colors, radius, space } from "@ui/theme";

function samePhotos(a: PhotoRow[], b: PhotoRow[]): boolean {
  return (
    a.length === b.length &&
    a.every((photo, index) => {
      const other = b[index];
      return other !== undefined && photo.id === other.id && photo.fileName === other.fileName;
    })
  );
}

export default function AlbumScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [header, commitHeader] = useScreenHeader({
    store: albumHeaders,
    id,
    same: sameAlbumHeader,
    title: albumTitle,
    items: albumHeaderItems,
  });
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { name } = header;

  const reload = useCallback(async () => {
    const [album, tree, rows] = await Promise.all([
      AlbumsService.byId(id),
      GroupsService.tree(),
      PhotosService.listByAlbum(id),
    ]);
    if (album === null) {
      router.back();
      return;
    }
    commitHeader({
      ...albumHeaders.state(id),
      name: album.name,
      groupId: album.groupId,
      groups: tree,
    });
    setPhotos((current) => (samePhotos(current, rows) ? current : rows));
  }, [id, router, commitHeader]);

  const select = useCallback(
    (next: string[]) => {
      setSelected(next);
      commitHeader({
        ...albumHeaders.state(id),
        selectedCount: next.length,
        onlySelected: next.length === 1 ? (next[0] ?? null) : null,
      });
    },
    [id, commitHeader]
  );

  const addPhotos = useCallback(async () => {
    setImporting(true);
    const result = await PhotosService.editFromLibrary(id);
    setImporting(false);
    if (result.added === 0 && result.rebuilt === 0) return;
    await reload();
    await WidgetService.sync();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [id, reload]);

  const removeSelected = useCallback(async () => {
    await PhotosService.remove(selected);
    select([]);
    await reload();
    await WidgetService.sync();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [selected, reload, select]);

  const makeCover = useCallback(
    async (photoId: string) => {
      await AlbumsService.setCover(id, photoId);
      select([]);
      await reload();
      await WidgetService.sync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [id, reload, select]
  );

  const moveToFront = useCallback(
    async (photoId: string) => {
      await PhotosService.moveToFront(id, photoId);
      select([]);
      await reload();
      await WidgetService.sync();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [id, reload, select]
  );

  const moveToGroup = useCallback(
    async (nextGroupId: string | null) => {
      await AlbumsService.setGroup(id, nextGroupId);
      commitHeader({ ...albumHeaders.state(id), groupId: nextGroupId });
      await WidgetService.sync();
      Haptics.selectionAsync();
    },
    [id, commitHeader]
  );

  const applyOrder = useCallback(
    async (orderedIds: string[]) => {
      await PhotosService.reorder(id, orderedIds);
      setPhotos(await PhotosService.listByAlbum(id));
      await WidgetService.sync();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [id]
  );

  const deleteAlbum = useCallback(async () => {
    await PhotosService.removeAlbumPhotos(id);
    await AlbumsService.remove(id);
    await WidgetService.sync();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [id, router]);

  const requestDelete = useCallback(async () => {
    const rows = await PhotosService.listByAlbum(id);
    if (rows.length === 0) {
      await deleteAlbum();
      return;
    }
    setConfirmingDelete(true);
  }, [id, deleteAlbum]);

  const columns = 3;
  const gutter = 6;
  const cell = (width - gutter * (columns + 1)) / columns;
  const selecting = selected.length > 0;

  useFocusEffect(
    useCallback(() => {
      void reload();
      return albumHeaders.bind(id, {
        add: () => void addPhotos(),
        removeSelected: () => void removeSelected(),
        makeCover: (photoId) => void makeCover(photoId),
        moveToFront: (photoId) => void moveToFront(photoId),
        deselect: () => select([]),
        move: (groupId) => void moveToGroup(groupId),
        remove: () => void requestDelete(),
      });
    }, [
      id,
      reload,
      addPhotos,
      removeSelected,
      makeCover,
      moveToFront,
      select,
      moveToGroup,
      requestDelete,
    ])
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingBottom: space.xxxl * 3,
          alignItems: "center",
        }}
      >
        {photos.length === 0 ? (
          <View style={{ paddingTop: space.xxxl * 2 }}>
            <EmptyState
              icon="photo.on.rectangle.angled"
              title="No photos yet"
              message="Add photos from your library. Frame keeps a resized copy so your widget keeps working."
              actionLabel={importing ? "Adding photos" : "Add photos"}
              onAction={() => void addPhotos()}
            />
          </View>
        ) : (
          <>
            <Text variant="footnote" tone="muted" center style={{ paddingVertical: space.sm }}>
              Tap to select. Touch and hold to drag a photo into a new order.
            </Text>
            <ReorderableGrid
              items={photos}
              numColumns={columns}
              cellSize={cell}
              gap={gutter}
              onReorder={(orderedIds) => void applyOrder(orderedIds)}
              onPress={(photo) =>
                select(
                  selected.includes(photo.id)
                    ? selected.filter((value) => value !== photo.id)
                    : [...selected, photo.id]
                )
              }
              renderItem={(photo) => (
                <PhotoCell
                  photo={photo}
                  size={cell}
                  selected={selected.includes(photo.id)}
                  selecting={selecting}
                />
              )}
            />
          </>
        )}
      </ScrollView>

      {importing ? (
        <View
          style={{
            position: "absolute",
            bottom: space.xxxl * 2,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            backgroundColor: colors.surfaceTinted,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderRadius: radius.pill,
          }}
        >
          <ActivityIndicator color={colors.accent} />
          <Text variant="subhead">Adding photos</Text>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete "${name}"?`}
        message={`${photoCountLabel(photos.length)} will be removed from Frame. Your originals in Photos are untouched.`}
        confirmLabel="Delete album"
        onVisibleChange={setConfirmingDelete}
        onConfirm={() => void deleteAlbum()}
      />
    </>
  );
}

function PhotoCell({
  photo,
  size,
  selected,
  selecting,
}: {
  photo: PhotoRow;
  size: number;
  selected: boolean;
  selecting: boolean;
}) {
  const uri = photoUri(photo.fileName);
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm, overflow: "hidden" }}>
      {uri === null ? null : (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%", opacity: selecting && !selected ? 0.45 : 1 }}
          contentFit="cover"
          cachePolicy="disk"
          recyclingKey={photo.id}
        />
      )}
      {selected ? (
        <View
          style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView name="checkmark" tintColor={colors.accentInk} size={12} />
        </View>
      ) : null}
    </View>
  );
}
