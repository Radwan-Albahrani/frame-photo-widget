import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { AlbumsService } from "@backend/api/albums/albums.service";
import { GroupsService } from "@backend/api/groups/groups.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { Button, ConfirmDialog, Text } from "@ui/components";
import { colors, radius, space } from "@ui/theme";

export default function NameScreen() {
  const router = useRouter();
  const { id, kind, parent } = useLocalSearchParams<{
    id?: string;
    kind?: string;
    parent?: string;
  }>();
  const parentId = typeof parent === "string" && parent.length > 0 ? parent : null;
  const isGroup = kind === "group";
  const editing = typeof id === "string" && id.length > 0;
  const [value, setValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!editing) return;
    if (isGroup) {
      GroupsService.byId(id).then((group) => {
        if (group !== null) setValue(group.name);
      });
      return;
    }
    AlbumsService.byId(id).then((album) => {
      if (album !== null) setValue(album.name);
    });
  }, [editing, id, isGroup]);

  const trimmed = value.trim();

  const submit = async () => {
    if (trimmed.length === 0) return;
    if (isGroup) {
      if (editing) await GroupsService.rename(id, trimmed);
      else await GroupsService.create(trimmed, parentId ?? null);
      await WidgetService.sync();
      router.back();
      return;
    }
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

  const title = isGroup
    ? editing
      ? "Rename group"
      : "New group"
    : editing
      ? "Rename album"
      : "New album";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: space.xl, gap: space.xl }}>
      <Text variant="title2">{title}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={isGroup ? "Page 1" : "Trip to Kyoto"}
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
      {isGroup && editing ? (
        <Button
          label="Delete group"
          variant="destructive"
          icon="trash"
          onPress={() => setConfirmingDelete(true)}
        />
      ) : null}

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
      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete "${trimmed}"?`}
        message="The group is removed. Its albums and photos are kept and simply stop being grouped."
        confirmLabel="Delete group"
        onVisibleChange={setConfirmingDelete}
        onConfirm={() => {
          void (async () => {
            if (editing) await GroupsService.remove(id);
            await WidgetService.sync();
            setConfirmingDelete(false);
            router.back();
          })();
        }}
      />
    </View>
  );
}
