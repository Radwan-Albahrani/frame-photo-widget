import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { AlbumsService, type AlbumWithCount } from "@backend/api/albums/albums.service";
import { GroupsService, type GroupWithCounts } from "@backend/api/groups/groups.service";
import { photoUri } from "@native/photoStore";
import { AlbumCard } from "@ui/components/media/AlbumCard";
import { GroupCard } from "@ui/components/media/GroupCard";
import { EmptyState } from "@ui/components/feedback/EmptyState";
import { space } from "@ui/theme";

const COLUMNS = 2;

interface LibraryBrowserProps {
  groupId: string | null;
}

export function LibraryBrowser({ groupId }: LibraryBrowserProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [groups, setGroups] = useState<GroupWithCounts[]>([]);
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [covers, setCovers] = useState<Record<string, (string | null)[]>>({});

  const reload = useCallback(async () => {
    const [childGroups, childAlbums, everyAlbum] = await Promise.all([
      GroupsService.children(groupId),
      AlbumsService.inGroup(groupId),
      AlbumsService.list(),
    ]);
    setGroups(childGroups);
    setAlbums(childAlbums);

    const next: Record<string, (string | null)[]> = {};
    for (const group of childGroups) {
      const ids = await GroupsService.descendantIds(group.id);
      next[group.id] = everyAlbum
        .filter((album) => album.groupId !== null && ids.includes(album.groupId))
        .slice(0, 4)
        .map((album) => (album.coverFileName === null ? null : photoUri(album.coverFileName)));
    }
    setCovers(next);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
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
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              name={group.name}
              albumCount={group.albumCount + group.childGroupCount}
              coverUris={covers[group.id] ?? []}
              size={cardSize}
              onPress={() => router.push(`/group/${group.id}`)}
              onLongPress={() =>
                router.push({ pathname: "/group-actions", params: { id: group.id } })
              }
            />
          ))}
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              name={album.name}
              photoCount={album.photoCount}
              coverUri={album.coverFileName === null ? null : photoUri(album.coverFileName)}
              size={cardSize}
              recyclingKey={album.id}
              onPress={() => router.push(`/album/${album.id}`)}
              onLongPress={() =>
                router.push({ pathname: "/album-actions", params: { id: album.id } })
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
