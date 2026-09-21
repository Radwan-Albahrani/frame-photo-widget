import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View, useWindowDimensions } from "react-native";
import { AlbumsService } from "@backend/api/albums/albums.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import type { PhotoRow } from "@backend/core/db/schema";
import { photoUri } from "@native/photoStore";
import { ConfirmDialog, EmptyState, Text } from "@ui/components";
import { colors, radius, space } from "@ui/theme";

export default function AlbumScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  const deleteAlbum = useCallback(async () => {
    await PhotosService.removeAlbumPhotos(id);
    await AlbumsService.remove(id);
    await WidgetService.sync();
    router.back();
  }, [id, router]);

  const columns = 3;
  const gutter = 2;
  const cell = (width - gutter * (columns - 1)) / columns;
  const selecting = selected.length > 0;
  const onlySelected = selected.length === 1 ? selected[0] : null;

  return (
    <>
      <FlatList
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        contentContainerStyle={{ gap: gutter, paddingBottom: space.xxxl * 3 }}
        columnWrapperStyle={{ gap: gutter }}
        ListEmptyComponent={
          <View style={{ paddingTop: space.xxxl * 2 }}>
            <EmptyState
              icon="photo.on.rectangle.angled"
              title="No photos yet"
              message="Add photos from your library. Frame keeps a resized copy so your widget keeps working."
              actionLabel={importing ? "Adding photos" : "Add photos"}
              onAction={() => void addPhotos()}
            />
          </View>
        }
        renderItem={({ item }) => (
          <PhotoCell
            photo={item}
            size={cell}
            selected={selected.includes(item.id)}
            selecting={selecting}
            onPress={() =>
              setSelected((current) =>
                current.includes(item.id)
                  ? current.filter((value) => value !== item.id)
                  : [...current, item.id]
              )
            }
          />
        )}
      />

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

      <Stack.Screen.Title>{name}</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        {selecting ? (
          <Stack.Toolbar.Button
            icon="trash"
            tintColor={colors.error}
            onPress={() => void removeSelected()}
          />
        ) : (
          <Stack.Toolbar.Button
            icon="plus"
            tintColor={colors.accent}
            onPress={() => void addPhotos()}
          />
        )}
        <Stack.Toolbar.Menu icon="ellipsis" tintColor={colors.accent}>
          {onlySelected === null ? null : (
            <Stack.Toolbar.MenuAction icon="star" onPress={() => void makeCover(onlySelected)}>
              Use as cover
            </Stack.Toolbar.MenuAction>
          )}
          {onlySelected === null ? null : (
            <Stack.Toolbar.MenuAction
              icon="arrow.up.to.line"
              onPress={() => void moveToFront(onlySelected)}
            >
              Show first
            </Stack.Toolbar.MenuAction>
          )}
          {selecting ? (
            <Stack.Toolbar.MenuAction icon="xmark.circle" onPress={() => setSelected([])}>
              Deselect
            </Stack.Toolbar.MenuAction>
          ) : null}
          <Stack.Toolbar.MenuAction
            icon="pencil"
            onPress={() => router.push({ pathname: "/name", params: { id } })}
          >
            Rename
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={() => setConfirmingDelete(true)}
          >
            Delete album
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete "${name}"?`}
        message="The album and its copies are removed. Your originals in Photos are untouched."
        confirmLabel="Delete"
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
  onPress,
}: {
  photo: PhotoRow;
  size: number;
  selected: boolean;
  selecting: boolean;
  onPress: () => void;
}) {
  const uri = photoUri(photo.fileName);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ width: size, height: size }}>
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
    </Pressable>
  );
}
