import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { GroupsService, type GroupNode } from "@backend/api/groups/groups.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { ConfirmDialog, SectionHeader, Text } from "@ui/components";
import { colors, radius, space } from "@ui/theme";

export default function GroupActionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [targets, setTargets] = useState<GroupNode[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(async () => {
    const group = await GroupsService.byId(id);
    if (group !== null) {
      setName(group.name);
      setParentId(group.parentId);
    }
    const tree = await GroupsService.tree();
    const blocked = await GroupsService.descendantIds(id);
    setTargets(tree.filter((node) => !blocked.includes(node.id)));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const move = useCallback(
    async (nextParentId: string | null) => {
      const moved = await GroupsService.setParent(id, nextParentId);
      if (!moved) return;
      setParentId(nextParentId);
      await WidgetService.sync();
      Haptics.selectionAsync();
      router.back();
    },
    [id, router]
  );

  const remove = useCallback(async () => {
    await GroupsService.remove(id);
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
          <SectionHeader title="Move folder into" />
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <ActionRow
              label="Top level"
              icon="tray"
              selected={parentId === null}
              onPress={() => void move(null)}
            />
            {targets.map((node) => (
              <ActionRow
                key={node.id}
                label={node.path}
                icon="folder"
                selected={parentId === node.id}
                onPress={() => void move(node.id)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title="Folder" />
          <View
            style={{
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <ActionRow
              label="Rename"
              icon="pencil"
              selected={false}
              onPress={() => {
                router.back();
                router.push({ pathname: "/name", params: { kind: "group", id } });
              }}
            />
            <ActionRow
              label="Delete folder"
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
        message="Only the folder is removed. Everything inside it moves up one level, and no photos are deleted."
        confirmLabel="Delete folder"
        onVisibleChange={setConfirmingDelete}
        onConfirm={() => void remove()}
      />
    </View>
  );
}

function ActionRow({
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
      <Text variant="body" numberOfLines={1} style={{ flex: 1, color: tint }}>
        {label}
      </Text>
      {selected ? <SymbolView name="checkmark" tintColor={colors.accent} size={16} /> : null}
    </Pressable>
  );
}
