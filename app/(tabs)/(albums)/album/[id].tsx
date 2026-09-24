import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { memo, useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from "react-native";
import { AlbumsService } from "@backend/api/albums/albums.service";
import { GroupsService, type GroupNode } from "@backend/api/groups/groups.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import type { PhotoRow } from "@backend/core/db/schema";
import { photoUri } from "@native/photoStore";
import { ConfirmDialog, EmptyState, Text } from "@ui/components";
import { photoCountLabel } from "@ui/format";
import { ReorderableGrid } from "@ui/components/media/ReorderableGrid";
import { useRenamedTitle } from "@ui/routeTitle";
import { colors, radius, space } from "@ui/theme";
import { useSettledState } from "@ui/useSettledState";

function samePhotos(a: PhotoRow[], b: PhotoRow[]): boolean {
  return (
    a.length === b.length &&
    a.every((photo, index) => {
      const other = b[index];
      return other !== undefined && photo.id === other.id && photo.fileName === other.fileName;
    })
  );
}

interface AlbumHeader {
  name: string;
  groupId: string | null;
  groups: GroupNode[];
}

function sameAlbumHeader(a: AlbumHeader, b: AlbumHeader): boolean {
  return a.name === b.name && a.groupId === b.groupId && GroupsService.sameTree(a.groups, b.groups);
}

export default function AlbumScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id, name: routeName } = useLocalSearchParams<{ id: string; name?: string }>();

  const [header, commitHeader] = useSettledState<AlbumHeader>(
    { name: routeName ?? "", groupId: null, groups: [] },
    sameAlbumHeader
  );
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { name } = header;
  useRenamedTitle(name, routeName);

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
    commitHeader({ name: album.name, groupId: album.groupId, groups: tree });
    setPhotos((current) => (samePhotos(current, rows) ? current : rows));
  }, [id, router, commitHeader]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
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
    setSelected([]);
    await reload();
    await WidgetService.sync();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [selected, reload]);

  const makeCover = useCallback(
    async (photoId: string) => {
      await AlbumsService.setCover(id, photoId);
      setSelected([]);
      await reload();
      await WidgetService.sync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [id, reload]
  );

  const moveToFront = useCallback(
    async (photoId: string) => {
      await PhotosService.moveToFront(id, photoId);
      setSelected([]);
      await reload();
      await WidgetService.sync();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [id, reload]
  );

  const moveToGroup = useCallback(
    async (nextGroupId: string | null) => {
      await AlbumsService.setGroup(id, nextGroupId);
      commitHeader({ ...header, groupId: nextGroupId });
      await WidgetService.sync();
      Haptics.selectionAsync();
    },
    [id, header, commitHeader]
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

  const deselect = useCallback(() => setSelected([]), []);

  const rename = useCallback(
    () => router.push({ pathname: "/name", params: { id } }),
    [id, router]
  );

  const columns = 3;
  const gutter = 6;
  const cell = (width - gutter * (columns + 1)) / columns;
  const selecting = selected.length > 0;
  const onlySelected = selected.length === 1 ? selected[0] : null;

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
                setSelected((current) =>
                  current.includes(photo.id)
                    ? current.filter((value) => value !== photo.id)
                    : [...current, photo.id]
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

      <AlbumToolbar
        selecting={selecting}
        onlySelected={onlySelected}
        groupId={header.groupId}
        groups={header.groups}
        onAdd={addPhotos}
        onRemoveSelected={removeSelected}
        onMakeCover={makeCover}
        onMoveToFront={moveToFront}
        onDeselect={deselect}
        onRename={rename}
        onMove={moveToGroup}
        onDelete={requestDelete}
      />

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

interface AlbumToolbarProps {
  selecting: boolean;
  onlySelected: string | null;
  groupId: string | null;
  groups: GroupNode[];
  onAdd: () => Promise<void>;
  onRemoveSelected: () => Promise<void>;
  onMakeCover: (photoId: string) => Promise<void>;
  onMoveToFront: (photoId: string) => Promise<void>;
  onDeselect: () => void;
  onRename: () => void;
  onMove: (groupId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
}

const AlbumToolbar = memo(function AlbumToolbar({
  selecting,
  onlySelected,
  groupId,
  groups,
  onAdd,
  onRemoveSelected,
  onMakeCover,
  onMoveToFront,
  onDeselect,
  onRename,
  onMove,
  onDelete,
}: AlbumToolbarProps) {
  return (
    <Stack.Toolbar placement="right">
      {selecting ? (
        <Stack.Toolbar.Button
          icon="trash"
          tintColor={colors.error}
          accessibilityLabel="Delete selected photos"
          onPress={() => void onRemoveSelected()}
        />
      ) : (
        <Stack.Toolbar.Button
          icon="plus"
          tintColor={colors.accent}
          accessibilityLabel="Add photos"
          onPress={() => void onAdd()}
        />
      )}
      <Stack.Toolbar.Menu
        icon="ellipsis"
        tintColor={colors.accent}
        accessibilityLabel="Album options"
      >
        {onlySelected === null ? null : (
          <Stack.Toolbar.MenuAction icon="star" onPress={() => void onMakeCover(onlySelected)}>
            Use as cover
          </Stack.Toolbar.MenuAction>
        )}
        {onlySelected === null ? null : (
          <Stack.Toolbar.MenuAction
            icon="arrow.up.to.line"
            onPress={() => void onMoveToFront(onlySelected)}
          >
            Show first
          </Stack.Toolbar.MenuAction>
        )}
        {selecting ? (
          <Stack.Toolbar.MenuAction icon="xmark.circle" onPress={onDeselect}>
            Deselect
          </Stack.Toolbar.MenuAction>
        ) : null}
        <Stack.Toolbar.MenuAction icon="pencil" onPress={onRename}>
          Rename
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.Menu icon="folder" title="Move to folder">
          <Stack.Toolbar.MenuAction
            icon={groupId === null ? "checkmark" : "tray"}
            onPress={() => void onMove(null)}
          >
            No folder
          </Stack.Toolbar.MenuAction>
          {groups.map((group) => (
            <Stack.Toolbar.MenuAction
              key={group.id}
              icon={groupId === group.id ? "checkmark" : "folder"}
              onPress={() => void onMove(group.id)}
            >
              {group.path}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => void onDelete()}>
          Delete album
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
});

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
