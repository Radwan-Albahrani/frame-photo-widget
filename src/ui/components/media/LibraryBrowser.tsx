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
import { HoldMenu, type MenuAction, type NativeActionEvent } from "@ui/menu";
import { space } from "@ui/theme";

const COLUMNS = 2;
const MOVE_PREFIX = "move:";
const RENAME = "rename";
const DELETE = "delete";

interface LibraryBrowserProps {
  groupId: string | null;
}

interface PendingDelete {
  kind: "group" | "album";
  id: string;
  name: string;
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
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
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

  const moveGroup = useCallback(
    async (group: GroupWithCounts, parentId: string | null) => {
      const moved = await GroupsService.setParent(group.id, parentId);
      if (!moved) {
        reportFailure(
          { op: "library.group.move", groupId: group.id, parentId },
          new Error("target folder is inside the folder being moved")
        );
        return;
      }
      await WidgetService.sync();
      void Haptics.selectionAsync();
      await reload();
    },
    [reload]
  );

  const moveAlbum = useCallback(
    async (album: AlbumWithCount, nextGroupId: string | null) => {
      await AlbumsService.setGroup(album.id, nextGroupId);
      await WidgetService.sync();
      void Haptics.selectionAsync();
      await reload();
    },
    [reload]
  );

  const confirmDelete = useCallback(async () => {
    if (pendingDelete === null) return;
    if (pendingDelete.kind === "group") {
      await GroupsService.remove(pendingDelete.id);
    } else {
      await PhotosService.removeAlbumPhotos(pendingDelete.id);
      await AlbumsService.remove(pendingDelete.id);
    }
    await WidgetService.sync();
    setConfirmingDelete(false);
    setPendingDelete(null);
    await reload();
  }, [pendingDelete, reload]);

  const onGroupAction = useCallback(
    (group: GroupWithCounts, event: NativeActionEvent) => {
      const action = event.nativeEvent.event;
      if (action.startsWith(MOVE_PREFIX)) {
        const target = action.slice(MOVE_PREFIX.length);
        void moveGroup(group, target.length === 0 ? null : target);
        return;
      }
      if (action === RENAME) {
        router.push({ pathname: "/name", params: { kind: "group", id: group.id } });
        return;
      }
      if (action === DELETE) {
        setPendingDelete({ kind: "group", id: group.id, name: group.name });
        setConfirmingDelete(true);
      }
    },
    [moveGroup, router]
  );

  const onAlbumAction = useCallback(
    (album: AlbumWithCount, event: NativeActionEvent) => {
      const action = event.nativeEvent.event;
      if (action.startsWith(MOVE_PREFIX)) {
        const target = action.slice(MOVE_PREFIX.length);
        void moveAlbum(album, target.length === 0 ? null : target);
        return;
      }
      if (action === RENAME) {
        router.push({ pathname: "/name", params: { id: album.id } });
        return;
      }
      if (action === DELETE) {
        setPendingDelete({ kind: "album", id: album.id, name: album.name });
        setConfirmingDelete(true);
      }
    },
    [moveAlbum, router]
  );

  const cardSize = (width - space.lg * (COLUMNS + 1)) / COLUMNS;
  const isEmpty = groups.length === 0 && albums.length === 0;

  return (
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
                accessibilityHint="Touch and hold for folder actions"
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
            <HoldMenu
              key={album.id}
              actions={cardActions(moveSubactions(folders, album.groupId), "Delete album")}
              onPressAction={(event) => onAlbumAction(album, event)}
              onPress={() => router.push(`/album/${album.id}`)}
              title={album.name}
              accessibilityLabel={`${album.name}, ${photoCountLabel(album.photoCount)}`}
              accessibilityHint="Touch and hold for album actions"
            >
              <AlbumCard
                name={album.name}
                photoCount={album.photoCount}
                coverUri={album.coverFileName === null ? null : photoUri(album.coverFileName)}
                size={cardSize}
                recyclingKey={album.id}
              />
            </HoldMenu>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={confirmingDelete}
        title={pendingDelete === null ? "" : `Delete "${pendingDelete.name}"?`}
        message={
          pendingDelete?.kind === "group"
            ? "Only the folder is removed. Everything inside it moves up one level, and no photos are deleted."
            : "The album and its copies are removed. Your originals in Photos are untouched."
        }
        confirmLabel={pendingDelete?.kind === "group" ? "Delete folder" : "Delete"}
        onVisibleChange={setConfirmingDelete}
        onConfirm={() => void confirmDelete()}
      />
    </ScrollView>
  );
}
