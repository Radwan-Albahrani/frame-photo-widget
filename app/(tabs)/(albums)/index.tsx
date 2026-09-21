import { Image } from "expo-image";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { FlatList, Pressable, View, useWindowDimensions } from "react-native";
import { AlbumsService, type AlbumWithCount } from "@backend/api/albums/albums.service";
import { photoUri } from "@native/photoStore";
import { EmptyState, Text } from "@ui/components";
import { colors, radius, space } from "@ui/theme";

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
            album={item}
            size={cardSize}
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

function AlbumCard({
  album,
  size,
  onPress,
}: {
  album: AlbumWithCount;
  size: number;
  onPress: () => void;
}) {
  const cover = album.coverFileName === null ? null : photoUri(album.coverFileName);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={album.name}
      onPress={onPress}
      style={({ pressed }) => ({ width: size, opacity: pressed ? 0.8 : 1, gap: space.sm })}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.xl,
          borderCurve: "continuous",
          overflow: "hidden",
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cover === null ? (
          <SymbolView name="photo" tintColor={colors.inkSubtle} size={30} />
        ) : (
          <Image
            source={{ uri: cover }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="disk"
            recyclingKey={album.id}
          />
        )}
      </View>
      <View style={{ gap: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {album.name}
        </Text>
        <Text variant="footnote" tone="muted">
          {album.photoCount === 1 ? "1 photo" : `${album.photoCount} photos`}
        </Text>
      </View>
    </Pressable>
  );
}
