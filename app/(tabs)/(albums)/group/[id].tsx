import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback } from "react";
import { GroupsService, type GroupNode } from "@backend/api/groups/groups.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { reportFailure } from "@backend/core/log/logger";
import { LibraryBrowser } from "@ui/components/media/LibraryBrowser";
import { useRenamedTitle } from "@ui/routeTitle";
import { colors } from "@ui/theme";
import { useSettledState } from "@ui/useSettledState";

interface FolderHeader {
  name: string;
  parentId: string | null;
  targets: GroupNode[];
}

function sameHeader(a: FolderHeader, b: FolderHeader): boolean {
  return (
    a.name === b.name && a.parentId === b.parentId && GroupsService.sameTree(a.targets, b.targets)
  );
}

export default function GroupScreen() {
  const router = useRouter();
  const { id, name: routeName } = useLocalSearchParams<{ id: string; name?: string }>();
  const [header, commitHeader] = useSettledState<FolderHeader>(
    { name: routeName ?? "", parentId: null, targets: [] },
    sameHeader
  );
  useRenamedTitle(header.name, routeName);

  const load = useCallback(async () => {
    const [group, tree, blocked] = await Promise.all([
      GroupsService.byId(id),
      GroupsService.tree(),
      GroupsService.descendantIds(id),
    ]);
    if (group === null) return;
    commitHeader({
      name: group.name,
      parentId: group.parentId,
      targets: tree.filter((node) => !blocked.includes(node.id)),
    });
  }, [id, commitHeader]);

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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [id, router]);

  return (
    <>
      <LibraryBrowser groupId={id} />
      <FolderToolbar
        id={id}
        parentId={header.parentId}
        targets={header.targets}
        onMove={move}
        onRemove={remove}
      />
    </>
  );
}

interface FolderToolbarProps {
  id: string;
  parentId: string | null;
  targets: GroupNode[];
  onMove: (parentId: string | null) => Promise<void>;
  onRemove: () => Promise<void>;
}

const FolderToolbar = memo(function FolderToolbar({
  id,
  parentId,
  targets,
  onMove,
  onRemove,
}: FolderToolbarProps) {
  const router = useRouter();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon="plus"
        tintColor={colors.accent}
        accessibilityLabel="Create"
        accessibilityHint="Choose a new album or a new folder"
      >
        <Stack.Toolbar.MenuAction
          icon="rectangle.stack.badge.plus"
          onPress={() => router.push({ pathname: "/name", params: { group: id } })}
        >
          New album here
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          icon="folder.badge.plus"
          onPress={() => router.push({ pathname: "/name", params: { kind: "group", parent: id } })}
        >
          New folder here
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
      <Stack.Toolbar.Menu
        icon="ellipsis"
        tintColor={colors.accent}
        accessibilityLabel="Folder options"
      >
        <Stack.Toolbar.Menu icon="folder" title="Move to folder">
          <Stack.Toolbar.MenuAction
            icon="tray"
            isOn={parentId === null}
            onPress={() => void onMove(null)}
          >
            Top level
          </Stack.Toolbar.MenuAction>
          {targets.map((node) => (
            <Stack.Toolbar.MenuAction
              key={node.id}
              icon="folder"
              isOn={parentId === node.id}
              onPress={() => void onMove(node.id)}
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
        <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => void onRemove()}>
          Delete folder
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
});
