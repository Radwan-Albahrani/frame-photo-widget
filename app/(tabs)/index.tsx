import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlbumsService, type AlbumWithCount } from "@backend/api/albums/albums.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { photoUri } from "@native/photoStore";
import { PromptSheet } from "@ui/Sheet";
import { radius, spacing } from "@ui/theme";
import { useTheme } from "@ui/useTheme";

export default function AlbumsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    setAlbums(await AlbumsService.list());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const createAlbum = useCallback(
    async (name: string) => {
      const album = await AlbumsService.create(name);
      setCreating(false);
      await reload();
      await WidgetService.sync();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/album/${album.id}`);
    },
    [reload, router]
  );

  const columns = 2;
  const gutter = spacing.lg;
  const cardSize = (width - gutter * (columns + 1)) / columns;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: gutter,
          paddingBottom: spacing.md,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>
          Albums
        </Text>
        <Pressable
          onPress={() => setCreating(true)}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SymbolView name="plus" tintColor={theme.text} size={20} />
        </Pressable>
      </View>

      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        contentContainerStyle={{ padding: gutter, gap: gutter }}
        columnWrapperStyle={{ gap: gutter }}
        ListEmptyComponent={<EmptyAlbums onCreate={() => setCreating(true)} />}
        renderItem={({ item }) => (
          <AlbumCard
            album={item}
            size={cardSize}
            onPress={() => router.push(`/album/${item.id}`)}
          />
        )}
      />

      <PromptSheet
        visible={creating}
        title="New album"
        placeholder="Trip to Kyoto"
        confirmLabel="Create"
        onCancel={() => setCreating(false)}
        onConfirm={(name) => void createAlbum(name)}
      />
    </SafeAreaView>
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
  const theme = useTheme();
  const cover = album.coverFileName === null ? null : photoUri(album.coverFileName);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ width: size, opacity: pressed ? 0.8 : 1, gap: spacing.sm })}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.large,
          overflow: "hidden",
          backgroundColor: theme.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cover === null ? (
          <SymbolView name="photo" tintColor={theme.textMuted} size={30} />
        ) : (
          <Image
            source={{ uri: cover }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="disk"
          />
        )}
      </View>
      <View style={{ gap: 2 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
          {album.name}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          {album.photoCount === 1 ? "1 photo" : `${album.photoCount} photos`}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyAlbums({ onCreate }: { onCreate: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", paddingTop: spacing.xl * 3, gap: spacing.md }}>
      <SymbolView name="rectangle.stack" tintColor={theme.textMuted} size={44} />
      <Text style={{ color: theme.text, fontSize: 19, fontWeight: "700" }}>No albums yet</Text>
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 15,
          textAlign: "center",
          paddingHorizontal: spacing.xl,
          lineHeight: 21,
        }}
      >
        Make an album, add your photos, then pick it from the widget on your Home Screen.
      </Text>
      <Pressable
        onPress={onCreate}
        style={({ pressed }) => ({
          marginTop: spacing.sm,
          backgroundColor: theme.accent,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: radius.medium,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>Create an album</Text>
      </Pressable>
    </View>
  );
}
