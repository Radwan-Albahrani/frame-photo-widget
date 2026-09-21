import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { SectionList, View, useWindowDimensions } from "react-native";
import { AlbumsService, type AlbumWithCount } from "@backend/api/albums/albums.service";
import { GroupsService } from "@backend/api/groups/groups.service";
import type { AlbumGroupRow } from "@backend/core/db/schema";
import { photoUri } from "@native/photoStore";
import { AlbumCard, EmptyState, SectionHeader } from "@ui/components";
import { colors, space } from "@ui/theme";

interface AlbumSection {
  title: string;
  groupId: string | null;
  data: AlbumWithCount[][];
}

const COLUMNS = 2;

function intoRows(albums: AlbumWithCount[], columns: number): AlbumWithCount[][] {
  const rows: AlbumWithCount[][] = [];
  for (let index = 0; index < albums.length; index += columns) {
    rows.push(albums.slice(index, index + columns));
  }
  return rows;
}

export default function AlbumsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [sections, setSections] = useState<AlbumSection[]>([]);
  const [empty, setEmpty] = useState(false);

  const reload = useCallback(async () => {
    const [albums, groups] = await Promise.all([AlbumsService.list(), GroupsService.list()]);
    setEmpty(albums.length === 0 && groups.length === 0);

    const grouped: AlbumSection[] = groups.map((group: AlbumGroupRow) => ({
      title: group.name,
      groupId: group.id,
      data: intoRows(
        albums.filter((album) => album.groupId === group.id),
        COLUMNS
      ),
    }));

    const ungrouped = albums.filter((album) => album.groupId === null);
    if (ungrouped.length > 0) {
      grouped.push({
        title: groups.length > 0 ? "Not in a group" : "Albums",
        groupId: null,
        data: intoRows(ungrouped, COLUMNS),
      });
    }
    setSections(grouped);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const cardSize = (width - space.lg * (COLUMNS + 1)) / COLUMNS;

  return (
    <>
      <SectionList
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(row) => row.map((album) => album.id).join("-")}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          padding: space.lg,
          paddingBottom: space.xxxl * 3,
          gap: space.md,
        }}
        renderSectionHeader={({ section }) =>
          sections.length > 1 || section.groupId !== null ? (
            <View style={{ paddingTop: space.sm }}>
              <SectionHeader
                title={section.title}
                onPress={
                  section.groupId === null
                    ? undefined
                    : () =>
                        router.push({
                          pathname: "/name",
                          params: { kind: "group", id: section.groupId },
                        })
                }
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          empty ? (
            <View style={{ paddingTop: space.xxxl * 2 }}>
              <EmptyState
                icon="rectangle.stack"
                title="No albums yet"
                message="Make an album, add your photos, then pick it from the widget on your Home Screen."
                actionLabel="Create an album"
                onAction={() => router.push("/name")}
              />
            </View>
          ) : null
        }
        renderItem={({ item: row }) => (
          <View style={{ flexDirection: "row", gap: space.lg, marginBottom: space.lg }}>
            {row.map((album) => (
              <AlbumCard
                key={album.id}
                name={album.name}
                photoCount={album.photoCount}
                coverUri={album.coverFileName === null ? null : photoUri(album.coverFileName)}
                size={cardSize}
                recyclingKey={album.id}
                onPress={() => router.push(`/album/${album.id}`)}
              />
            ))}
          </View>
        )}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" tintColor={colors.accent}>
          <Stack.Toolbar.MenuAction
            icon="rectangle.stack.badge.plus"
            onPress={() => router.push("/name")}
          >
            New album
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="folder.badge.plus"
            onPress={() => router.push({ pathname: "/name", params: { kind: "group" } })}
          >
            New group
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
