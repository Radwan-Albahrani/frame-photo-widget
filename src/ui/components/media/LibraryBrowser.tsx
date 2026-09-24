import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { AlbumsService, type AlbumWithCount } from "@backend/api/albums/albums.service";
import {
  GroupsService,
  type GroupNode,
  type GroupWithCounts,
} from "@backend/api/groups/groups.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { reportFailure } from "@backend/core/log/logger";
import { photoUri } from "@native/photoStore";
import { EmptyState } from "@ui/components/feedback/EmptyState";
import { AlbumCard } from "@ui/components/media/AlbumCard";
import { GroupCard } from "@ui/components/media/GroupCard";
import { ConfirmDialog } from "@ui/components/overlays/ConfirmDialog";
import { groupCountLabel, photoCountLabel } from "@ui/format";
import {
  type DragItem,
  type DragKind,
  DropZone,
  HoldMenu,
  type MenuAction,
  type NativeActionEvent,
} from "@ui/menu";
import { space } from "@ui/theme";

const COLUMNS = 2;
const MOVE_PREFIX = "move:";
const RENAME = "rename";
const DELETE = "delete";
const NEW_FOLDER_NAME = "New Folder";
const FOLDER_ACCEPTS: DragKind[] = ["album", "group"];
const ALBUM_ACCEPTS: DragKind[] = ["album"];

interface LibraryBrowserProps {
  groupId: string | null;
}

function moveSubactions(folders: GroupNode[], currentId: string | null): MenuAction[] {
  return [
    {
      id: MOVE_PREFIX,
      title: "Top level",
      image: "tray",
      state: currentId === null ? "on" : "off",
    },
    ...folders.map((folder) => ({
      id: `${MOVE_PREFIX}${folder.id}`,
      title: folder.path,
      image: "folder",
      state: currentId === folder.id ? ("on" as const) : ("off" as const),
    })),
  ];
}

function cardActions(moveTargets: MenuAction[], deleteLabel: string): MenuAction[] {
  return [
    { id: "move", title: "Move to folder", image: "folder", subactions: moveTargets },
    { id: RENAME, title: "Rename", image: "pencil" },
    { id: DELETE, title: deleteLabel, image: "trash", attributes: { destructive: true } },
  ];
}

export function LibraryBrowser({ groupId }: LibraryBrowserProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [groups, setGroups] = useState<GroupWithCounts[]>([]);
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [covers, setCovers] = useState<Record<string, (string | null)[]>>({});
  const [folders, setFolders] = useState<GroupNode[]>([]);
  const [subtrees, setSubtrees] = useState<Record<string, string[]>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const reload = useCallback(async () => {
    const [browse, everyAlbum] = await Promise.all([
      GroupsService.browse(groupId),
      AlbumsService.list(),
    ]);

    const next: Record<string, (string | null)[]> = {};
    for (const group of browse.children) {
      const inside = new Set(browse.subtrees[group.id]);
      next[group.id] = everyAlbum
        .filter((album) => album.groupId !== null && inside.has(album.groupId))
        .slice(0, 4)
        .map((album) => (album.coverFileName === null ? null : photoUri(album.coverFileName)));
    }

    setGroups(browse.children);
    setAlbums(everyAlbum.filter((album) => album.groupId === groupId));
    setFolders(browse.tree);
    setCovers(next);
    setSubtrees(browse.subtrees);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const moveItems = useCallback(
    async (items: DragItem[], targetGroupId: string | null) => {
      for (const item of items) {
        if (item.kind === "album") {
          await AlbumsService.setGroup(item.id, targetGroupId);
          continue;
        }
        const moved = await GroupsService.setParent(item.id, targetGroupId);
        if (!moved) {
          reportFailure(
            { op: "library.group.move", groupId: item.id, parentId: targetGroupId },
            new Error("target folder is inside the folder being moved")
          );
        }
      }
      await WidgetService.sync();
      await reload();
    },
    [reload]
  );

  const makeFolderWith = useCallback(
    async (album: AlbumWithCount, items: DragItem[]) => {
      const folder = await GroupsService.create(NEW_FOLDER_NAME, groupId);
      await moveItems([{ id: album.id, kind: "album" }, ...items], folder.id);
    },
    [groupId, moveItems]
  );

  const deleteGroup = useCallback(
    async (group: GroupWithCounts) => {
      await GroupsService.remove(group.id);
      await WidgetService.sync();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await reload();
    },
    [reload]
  );

  const deleteAlbum = useCallback(
    async (album: AlbumWithCount) => {
      await PhotosService.removeAlbumPhotos(album.id);
      await AlbumsService.remove(album.id);
      await WidgetService.sync();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await reload();
    },
    [reload]
  );

  const onGroupAction = useCallback(
    (group: GroupWithCounts, event: NativeActionEvent) => {
      const action = event.nativeEvent.event;
      if (action.startsWith(MOVE_PREFIX)) {
        const target = action.slice(MOVE_PREFIX.length);
        void moveItems([{ id: group.id, kind: "group" }], target.length === 0 ? null : target).then(
          () => Haptics.selectionAsync()
        );
        return;
      }
      if (action === RENAME) {
        router.push({ pathname: "/name", params: { kind: "group", id: group.id } });
        return;
      }
      if (action === DELETE) {
        void deleteGroup(group);
      }
    },
    [moveItems, deleteGroup, router]
  );

  const onAlbumAction = useCallback(
    (album: AlbumWithCount, event: NativeActionEvent) => {
      const action = event.nativeEvent.event;
      if (action.startsWith(MOVE_PREFIX)) {
        const target = action.slice(MOVE_PREFIX.length);
        void moveItems([{ id: album.id, kind: "album" }], target.length === 0 ? null : target).then(
          () => Haptics.selectionAsync()
        );
        return;
      }
      if (action === RENAME) {
        router.push({ pathname: "/name", params: { id: album.id } });
        return;
      }
      if (action === DELETE) {
        if (album.photoCount === 0) {
          void deleteAlbum(album);
          return;
        }
        setDeleteTargetId(album.id);
        setConfirmingDelete(true);
      }
    },
    [moveItems, deleteAlbum, router]
  );

  const cardSize = (width - space.lg * (COLUMNS + 1)) / COLUMNS;
  const isEmpty = groups.length === 0 && albums.length === 0;

  const ownedIds = [...groups.map((group) => group.id), ...albums.map((album) => album.id)];

  return (
    <DropZone
      ownedIds={ownedIds}
      onDrop={(items) => void moveItems(items, groupId)}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl * 3 }}
      >
        {isEmpty ? (
          <View style={{ paddingTop: space.xxxl * 2 }}>
            <EmptyState
              icon={groupId === null ? "rectangle.stack" : "folder"}
              title={groupId === null ? "No albums yet" : "This folder is empty"}
              message={
                groupId === null
                  ? "Make an album, add your photos, then pick it from the widget on your Home Screen."
                  : "Add an album here, or move an existing one into this folder."
              }
              actionLabel="Create an album"
              onAction={() =>
                router.push({
                  pathname: "/name",
                  params: groupId === null ? {} : { group: groupId },
                })
              }
            />
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: space.lg,
            }}
          >
            {groups.map((group) => {
              const blocked = subtrees[group.id] ?? [group.id];
              const targets = moveSubactions(
                folders.filter((folder) => !blocked.includes(folder.id)),
                group.parentId
              );
              return (
                <HoldMenu
                  key={group.id}
                  actions={cardActions(targets, "Delete folder")}
                  onPressAction={(event) => onGroupAction(group, event)}
                  onPress={() => router.push(`/group/${group.id}`)}
                  title={group.name}
                  accessibilityLabel={`${group.name}, ${groupCountLabel(
                    group.albumCount,
                    group.childGroupCount
                  )}`}
                  accessibilityHint="Touch and hold for folder actions, or drag albums onto it"
                  drag={{ id: group.id, kind: "group" }}
                  drop={{
                    accepts: FOLDER_ACCEPTS,
                    onDrop: (items) => void moveItems(items, group.id),
                    onSpringLoad: () => router.push(`/group/${group.id}`),
                  }}
                >
                  <GroupCard
                    name={group.name}
                    albumCount={group.albumCount}
                    folderCount={group.childGroupCount}
                    coverUris={covers[group.id] ?? []}
                    size={cardSize}
                  />
                </HoldMenu>
              );
            })}
            {albums.map((album) => (
              <View key={album.id}>
                <HoldMenu
                  actions={cardActions(moveSubactions(folders, album.groupId), "Delete album")}
                  onPressAction={(event) => onAlbumAction(album, event)}
                  onPress={() => router.push(`/album/${album.id}`)}
                  title={album.name}
                  accessibilityLabel={`${album.name}, ${photoCountLabel(album.photoCount)}`}
                  accessibilityHint="Touch and hold for album actions, or drag it onto a folder or album"
                  drag={{ id: album.id, kind: "album" }}
                  drop={{
                    accepts: ALBUM_ACCEPTS,
                    onDrop: (items) => void makeFolderWith(album, items),
                  }}
                >
                  <AlbumCard
                    name={album.name}
                    photoCount={album.photoCount}
                    coverUri={album.coverFileName === null ? null : photoUri(album.coverFileName)}
                    size={cardSize}
                    recyclingKey={album.id}
                  />
                </HoldMenu>
                {deleteTargetId === album.id ? (
                  <ConfirmDialog
                    visible={confirmingDelete}
                    title={`Delete "${album.name}"?`}
                    message={`${photoCountLabel(album.photoCount)} will be removed from Frame. Your originals in Photos are untouched.`}
                    confirmLabel="Delete album"
                    onVisibleChange={setConfirmingDelete}
                    onConfirm={() => void deleteAlbum(album)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </DropZone>
  );
}
