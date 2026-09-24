import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { GroupsService } from "@backend/api/groups/groups.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { reportFailure } from "@backend/core/log/logger";
import { LibraryBrowser } from "@ui/components/media/LibraryBrowser";
import {
  type FolderHeaderState,
  folderHeaderItems,
  folderHeaders,
  folderTitle,
  sameFolderHeader,
} from "@ui/header/folderHeader";
import { useScreenHeader } from "@ui/header/useScreenHeader";

export default function GroupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [, commit] = useScreenHeader({
    store: folderHeaders,
    id,
    same: sameFolderHeader,
    title: folderTitle,
    items: folderHeaderItems,
  });

  const load = useCallback(async () => {
    const [group, tree, blocked] = await Promise.all([
      GroupsService.byId(id),
      GroupsService.tree(),
      GroupsService.descendantIds(id),
    ]);
    if (group === null) return;
    const next: FolderHeaderState = {
      name: group.name,
      parentId: group.parentId,
      targets: tree.filter((node) => !blocked.includes(node.id)),
    };
    commit(next);
  }, [id, commit]);

  const move = useCallback(
    async (parentId: string | null) => {
      const moved = await GroupsService.setParent(id, parentId);
      if (!moved) {
        reportFailure(
          { op: "group.move", groupId: id, parentId },
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

  useFocusEffect(
    useCallback(() => {
      void load();
      return folderHeaders.bind(id, {
        move: (parentId) => void move(parentId),
        remove: () => void remove(),
      });
    }, [id, load, move, remove])
  );

  return <LibraryBrowser groupId={id} />;
}
