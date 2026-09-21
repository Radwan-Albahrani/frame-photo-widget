import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { AlbumsService } from "@backend/api/albums/albums.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { Button, Text } from "@ui/components";
import { colors, radius, space } from "@ui/theme";

export default function NameAlbumScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === "string" && id.length > 0;
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!editing) return;
    AlbumsService.byId(id).then((album) => {
      if (album !== null) setValue(album.name);
    });
  }, [editing, id]);

  const trimmed = value.trim();

  const submit = async () => {
    if (trimmed.length === 0) return;
    if (editing) {
      await AlbumsService.rename(id, trimmed);
      await WidgetService.sync();
      router.back();
      return;
    }
    const album = await AlbumsService.create(trimmed);
    await WidgetService.sync();
    router.back();
    router.push(`/album/${album.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: space.xl, gap: space.xl }}>
      <Text variant="title2">{editing ? "Rename album" : "New album"}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Trip to Kyoto"
        placeholderTextColor={colors.inkMuted}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        style={{
          backgroundColor: colors.surfaceTinted,
          borderRadius: radius.lg,
          borderCurve: "continuous",
          paddingHorizontal: space.lg,
          paddingVertical: space.md + 2,
          fontSize: 17,
          color: colors.ink,
        }}
      />
      <View style={{ flexDirection: "row", gap: space.md }}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <Button
          label={editing ? "Save" : "Create"}
          onPress={() => void submit()}
          disabled={trimmed.length === 0}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
