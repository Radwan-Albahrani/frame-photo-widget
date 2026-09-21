import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { AlbumsService, type AlbumWithCount } from "@backend/api/albums/albums.service";
import { photoUri } from "@native/photoStore";
import { AlbumCard, EmptyState } from "@ui/components";
import { space } from "@ui/theme";

export default function AlbumsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);

  const reload = useCallback(async () => {
    setAlbums(await AlbumsService.list());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const columns = 2;
  const cardSize = (width - space.lg * (columns + 1)) / columns;

  return (
    <>
      <FlatList
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        data={albums}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        contentContainerStyle={{
          padding: space.lg,
          gap: space.lg,
          paddingBottom: space.xxxl * 3,
        }}
        columnWrapperStyle={{ gap: space.lg }}
        ListEmptyComponent={
          <View style={{ paddingTop: space.xxxl * 2 }}>
            <EmptyState
              icon="rectangle.stack"
              title="No albums yet"
              message="Make an album, add your photos, then pick it from the widget on your Home Screen."
              actionLabel="Create an album"
              onAction={() => router.push("/name")}
            />
          </View>
        }
        renderItem={({ item }) => (
          <AlbumCard
            name={item.name}
            photoCount={item.photoCount}
            coverUri={item.coverFileName === null ? null : photoUri(item.coverFileName)}
            size={cardSize}
            recyclingKey={item.id}
            onPress={() => router.push(`/album/${item.id}`)}
          />
        )}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" onPress={() => router.push("/name")} />
      </Stack.Toolbar>
    </>
  );
}
