import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { GroupsService, type GroupNode } from "@backend/api/groups/groups.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { reportFailure } from "@backend/core/log/logger";
import { ConfirmDialog } from "@ui/components";
import { LibraryBrowser } from "@ui/components/media/LibraryBrowser";
import { colors } from "@ui/theme";

export default function GroupScreen() {
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
    const [tree, blocked] = await Promise.all([
      GroupsService.tree(),
      GroupsService.descendantIds(id),
    ]);
    setTargets(tree.filter((node) => !blocked.includes(node.id)));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const move = useCallback(
    async (nextParentId: string | null) => {
      const moved = await GroupsService.setParent(id, nextParentId);
      if (!moved) {
        reportFailure(
          { op: "group.move", groupId: id, parentId: nextParentId },
          new Error("target folder is inside the folder being moved")
        );
        return;
      }
      await WidgetService.sync();
      void Haptics.selectionAsync();
      await load();
    },
    [id, load]
  );

  const remove = useCallback(async () => {
    await GroupsService.remove(id);
    await WidgetService.sync();
    setConfirmingDelete(false);
    router.back();
  }, [id, router]);

  return (
    <>
      <LibraryBrowser groupId={id} />
      <Stack.Screen.Title>{name}</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" tintColor={colors.accent}>
          <Stack.Toolbar.MenuAction
            icon="rectangle.stack.badge.plus"
            onPress={() => router.push({ pathname: "/name", params: { group: id } })}
          >
            New album here
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="folder.badge.plus"
            onPress={() =>
              router.push({ pathname: "/name", params: { kind: "group", parent: id } })
            }
          >
            New folder here
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu icon="ellipsis" tintColor={colors.accent}>
          <Stack.Toolbar.Menu icon="folder" title="Move to folder">
            <Stack.Toolbar.MenuAction
              icon="tray"
              isOn={parentId === null}
              onPress={() => void move(null)}
            >
              Top level
            </Stack.Toolbar.MenuAction>
            {targets.map((node) => (
              <Stack.Toolbar.MenuAction
                key={node.id}
                icon="folder"
                isOn={parentId === node.id}
                onPress={() => void move(node.id)}
              >
                {node.path}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.MenuAction
            icon="pencil"
            onPress={() => router.push({ pathname: "/name", params: { kind: "group", id } })}
          >
            Rename
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={() => setConfirmingDelete(true)}
          >
            Delete folder
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete "${name}"?`}
        message="Only the folder is removed. Everything inside it moves up one level, and no photos are deleted."
        confirmLabel="Delete folder"
        onVisibleChange={setConfirmingDelete}
        onConfirm={() => void remove()}
      />
    </>
  );
}
