import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlbumsService } from "@backend/api/albums/albums.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import type { PhotoRow } from "@backend/core/db/schema";
import { photoUri } from "@native/photoStore";
import { ConfirmSheet, PromptSheet } from "@ui/Sheet";
import { radius, spacing } from "@ui/theme";
import { useTheme } from "@ui/useTheme";

export default function AlbumScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deletingAlbum, setDeletingAlbum] = useState(false);

  const reload = useCallback(async () => {
    const album = await AlbumsService.byId(id);
    if (album === null) {
      router.back();
      return;
    }
    setName(album.name);
    setPhotos(await PhotosService.listByAlbum(id));
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const addPhotos = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
      exif: false,
    });
    if (result.canceled) return;
    setImporting(true);
    await PhotosService.add(
      id,
      result.assets.map((asset) => asset.uri)
    );
    setImporting(false);
    await reload();
    await WidgetService.sync();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [id, reload]);

  const toggle = useCallback((photoId: string) => {
    setSelected((current) =>
      current.includes(photoId)
        ? current.filter((value) => value !== photoId)
        : [...current, photoId]
    );
  }, []);

  const removeSelected = useCallback(async () => {
    await PhotosService.remove(selected);
    setSelected([]);
    await reload();
    await WidgetService.sync();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [selected, reload]);

  const deleteAlbum = useCallback(async () => {
    await PhotosService.removeAlbumPhotos(id);
    await AlbumsService.remove(id);
    setDeletingAlbum(false);
    await WidgetService.sync();
    router.back();
  }, [id, router]);

  const columns = 3;
  const gutter = 3;
  const cell = (width - gutter * (columns - 1)) / columns;
  const selecting = selected.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          gap: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <SymbolView name="chevron.left" tintColor={theme.text} size={22} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: theme.text, fontSize: 20, fontWeight: "700" }}
        >
          {name}
        </Text>
        {selecting ? (
          <Pressable onPress={() => void removeSelected()} hitSlop={12}>
            <SymbolView name="trash" tintColor={theme.danger} size={21} />
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.lg }}>
            <Pressable onPress={() => setRenaming(true)} hitSlop={12}>
              <SymbolView name="pencil" tintColor={theme.text} size={21} />
            </Pressable>
            <Pressable onPress={() => setDeletingAlbum(true)} hitSlop={12}>
              <SymbolView name="trash" tintColor={theme.danger} size={21} />
            </Pressable>
          </View>
        )}
      </View>

      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        contentContainerStyle={{ gap: gutter, paddingBottom: spacing.xl * 4 }}
        columnWrapperStyle={{ gap: gutter }}
        ListHeaderComponent={
          <AddPhotosRow onPress={() => void addPhotos()} busy={importing} count={photos.length} />
        }
        renderItem={({ item }) => (
          <PhotoCell
            photo={item}
            size={cell}
            selected={selected.includes(item.id)}
            selecting={selecting}
            onPress={() => toggle(item.id)}
          />
        )}
      />

      <PromptSheet
        visible={renaming}
        title="Rename album"
        placeholder="Album name"
        initialValue={name}
        confirmLabel="Save"
        onCancel={() => setRenaming(false)}
        onConfirm={(value) => {
          void (async () => {
            await AlbumsService.rename(id, value);
            setRenaming(false);
            await reload();
            await WidgetService.sync();
          })();
        }}
      />

      <ConfirmSheet
        visible={deletingAlbum}
        title={`Delete "${name}"?`}
        message="The album and its copies are removed. Your originals in Photos are untouched."
        confirmLabel="Delete"
        onCancel={() => setDeletingAlbum(false)}
        onConfirm={() => void deleteAlbum()}
      />
    </SafeAreaView>
  );
}

function AddPhotosRow({
  onPress,
  busy,
  count,
}: {
  onPress: () => void;
  busy: boolean;
  count: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm }}>
      <Pressable
        onPress={onPress}
        disabled={busy}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          backgroundColor: theme.accent,
          paddingVertical: spacing.md + 2,
          borderRadius: radius.medium,
          opacity: pressed || busy ? 0.75 : 1,
        })}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <SymbolView name="plus" tintColor="#FFFFFF" size={18} />
        )}
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
          {busy ? "Adding photos" : "Add photos"}
        </Text>
      </Pressable>
      {count > 0 ? (
        <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: "center" }}>
          Tap a photo to select it, then delete.
        </Text>
      ) : null}
    </View>
  );
}

function PhotoCell({
  photo,
  size,
  selected,
  selecting,
  onPress,
}: {
  photo: PhotoRow;
  size: number;
  selected: boolean;
  selecting: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const uri = photoUri(photo.fileName);
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }}>
      {uri === null ? null : (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%", opacity: selecting && !selected ? 0.5 : 1 }}
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
            backgroundColor: theme.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView name="checkmark" tintColor="#FFFFFF" size={12} />
        </View>
      ) : null}
    </Pressable>
  );
}
