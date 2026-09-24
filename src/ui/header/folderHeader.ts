import { type NativeStackHeaderItem, router } from "expo-router";
import type { GroupNode } from "@backend/api/groups/groups.service";
import { GroupsService } from "@backend/api/groups/groups.service";
import { symbol } from "@ui/header/headerIcon";
import { RouteHeaderStore } from "@ui/header/routeHeaderStore";
import { colors } from "@ui/theme";

export interface FolderHeaderState {
  name: string;
  parentId: string | null;
  targets: GroupNode[];
}

export interface FolderHeaderActions {
  move: (parentId: string | null) => void;
  remove: () => void;
}

export const folderHeaders = new RouteHeaderStore<FolderHeaderState, FolderHeaderActions>({
  name: "",
  parentId: null,
  targets: [],
});

export function sameFolderHeader(a: FolderHeaderState, b: FolderHeaderState): boolean {
  return (
    a.name === b.name && a.parentId === b.parentId && GroupsService.sameTree(a.targets, b.targets)
  );
}

export function folderTitle(state: FolderHeaderState): string {
  return state.name;
}

export function folderHeaderItems(id: string): NativeStackHeaderItem[] {
  const { parentId, targets } = folderHeaders.state(id);
  const actions = () => folderHeaders.actions(id);
  return [
    {
      type: "menu",
      label: "",
      icon: symbol("plus"),
      tintColor: colors.accent,
      accessibilityLabel: "Create",
      accessibilityHint: "Choose a new album or a new folder",
      menu: {
        items: [
          {
            type: "action",
            label: "New album here",
            icon: symbol("rectangle.stack.badge.plus"),
            onPress: () => router.push({ pathname: "/name", params: { group: id } }),
          },
          {
            type: "action",
            label: "New folder here",
            icon: symbol("folder.badge.plus"),
            onPress: () =>
              router.push({ pathname: "/name", params: { kind: "group", parent: id } }),
          },
        ],
      },
    },
    {
      type: "menu",
      label: "",
      icon: symbol("ellipsis"),
      tintColor: colors.accent,
      accessibilityLabel: "Folder options",
      menu: {
        items: [
          {
            type: "submenu",
            label: "Move to folder",
            icon: symbol("folder"),
            items: [
              {
                type: "action",
                label: "Top level",
                icon: symbol("tray"),
                state: parentId === null ? "on" : "off",
                onPress: () => actions()?.move(null),
              },
              ...targets.map((node) => ({
                type: "action" as const,
                label: node.path,
                icon: symbol("folder"),
                state: parentId === node.id ? ("on" as const) : ("off" as const),
                onPress: () => actions()?.move(node.id),
              })),
            ],
          },
          {
            type: "action",
            label: "Rename",
            icon: symbol("pencil"),
            onPress: () => router.push({ pathname: "/name", params: { kind: "group", id } }),
          },
          {
            type: "action",
            label: "Delete folder",
            icon: symbol("trash"),
            destructive: true,
            onPress: () => actions()?.remove(),
          },
        ],
      },
    },
  ];
}
