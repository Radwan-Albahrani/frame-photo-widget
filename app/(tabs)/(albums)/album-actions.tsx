import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AlbumsService } from "@backend/api/albums/albums.service";
import { GroupsService, type GroupNode } from "@backend/api/groups/groups.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { WidgetService } from "@backend/api/widget/widget.service";

import { ConfirmDialog, SectionHeader, Text } from "@ui/components";
import { colors, radius, space } from "@ui/theme";

export default function AlbumActionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    AlbumsService.byId(id).then((album) => {
      if (album === null) return;
      setName(album.name);
      setGroupId(album.groupId);
    });
    GroupsService.tree().then(setGroups);
  }, [id]);

  const move = useCallback(
    async (nextGroupId: string | null) => {
      await AlbumsService.setGroup(id, nextGroupId);
      setGroupId(nextGroupId);
      await WidgetService.sync();
      Haptics.selectionAsync();
      router.back();
    },
    [id, router]
  );

  const remove = useCallback(async () => {
    await PhotosService.removeAlbumPhotos(id);
    await AlbumsService.remove(id);
    await WidgetService.sync();
    setConfirmingDelete(false);
    router.back();
  }, [id, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        <Text variant="title2" numberOfLines={1}>
          {name}
        </Text>

        <View style={{ gap: space.sm }}>
          <SectionHeader title="Move to group" />
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <GroupRow
              label="No group"
              icon="tray"
              selected={groupId === null}
              onPress={() => void move(null)}
            />
            {groups.map((group) => (
              <GroupRow
                key={group.id}
                label={group.path}
                icon="folder"
                selected={groupId === group.id}
                onPress={() => void move(group.id)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title="Album" />
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <GroupRow
              label="Rename"
              icon="pencil"
              selected={false}
              onPress={() => {
                router.back();
                router.push({ pathname: "/name", params: { id } });
              }}
            />
            <GroupRow
              label="Delete album"
              icon="trash"
              selected={false}
              destructive
              onPress={() => setConfirmingDelete(true)}
            />
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete "${name}"?`}
        message="The album and its copies are removed. Your originals in Photos are untouched."
        confirmLabel="Delete"
        onVisibleChange={setConfirmingDelete}
        onConfirm={() => void remove()}
      />
    </View>
  );
}

function GroupRow({
  label,
  icon,
  selected,
  destructive = false,
  onPress,
}: {
  label: string;
  icon: "tray" | "folder" | "pencil" | "trash";
  selected: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  const tint = destructive ? colors.error : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        paddingVertical: space.md + 2,
        backgroundColor: pressed ? colors.surfaceTinted : "transparent",
      })}
    >
      <SymbolView name={icon} tintColor={tint} size={18} />
      <Text variant="body" style={{ flex: 1, color: tint }}>
        {label}
      </Text>
      {selected ? <SymbolView name="checkmark" tintColor={colors.accent} size={16} /> : null}
    </Pressable>
  );
}
