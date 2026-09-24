import {
  type NativeStackHeaderItem,
  type NativeStackHeaderItemMenuAction,
  router,
} from "expo-router";
import type { GroupNode } from "@backend/api/groups/groups.service";
import { GroupsService } from "@backend/api/groups/groups.service";
import { symbol } from "@ui/header/headerIcon";
import { RouteHeaderStore } from "@ui/header/routeHeaderStore";
import { colors } from "@ui/theme";

export interface AlbumHeaderState {
  name: string;
  groupId: string | null;
  groups: GroupNode[];
  selectedCount: number;
  onlySelected: string | null;
}

export interface AlbumHeaderActions {
  add: () => void;
  removeSelected: () => void;
  makeCover: (photoId: string) => void;
  moveToFront: (photoId: string) => void;
  deselect: () => void;
  move: (groupId: string | null) => void;
  remove: () => void;
}

export const albumHeaders = new RouteHeaderStore<AlbumHeaderState, AlbumHeaderActions>({
  name: "",
  groupId: null,
  groups: [],
  selectedCount: 0,
  onlySelected: null,
});

export function sameAlbumHeader(a: AlbumHeaderState, b: AlbumHeaderState): boolean {
  return (
    a.name === b.name &&
    a.groupId === b.groupId &&
    a.selectedCount === b.selectedCount &&
    a.onlySelected === b.onlySelected &&
    GroupsService.sameTree(a.groups, b.groups)
  );
}

export function albumTitle(state: AlbumHeaderState): string {
  return state.name;
}

function selectionActions(
  state: AlbumHeaderState,
  actions: () => AlbumHeaderActions | undefined
): NativeStackHeaderItemMenuAction[] {
  const only = state.onlySelected;
  const single: NativeStackHeaderItemMenuAction[] =
    only === null
      ? []
      : [
          {
            type: "action",
            label: "Use as cover",
            icon: symbol("star"),
            onPress: () => actions()?.makeCover(only),
          },
          {
            type: "action",
            label: "Show first",
            icon: symbol("arrow.up.to.line"),
            onPress: () => actions()?.moveToFront(only),
          },
        ];
  const clear: NativeStackHeaderItemMenuAction[] =
    state.selectedCount > 0
      ? [
          {
            type: "action",
            label: "Deselect",
            icon: symbol("xmark.circle"),
            onPress: () => actions()?.deselect(),
          },
        ]
      : [];
  return [...single, ...clear];
}

export function albumHeaderItems(id: string): NativeStackHeaderItem[] {
  const state = albumHeaders.state(id);
  const actions = () => albumHeaders.actions(id);
  const selecting = state.selectedCount > 0;
  return [
    selecting
      ? {
          type: "button",
          label: "",
          icon: symbol("trash"),
          tintColor: colors.error,
          accessibilityLabel: "Delete selected photos",
          onPress: () => actions()?.removeSelected(),
        }
      : {
          type: "button",
          label: "",
          icon: symbol("plus"),
          tintColor: colors.accent,
          accessibilityLabel: "Add photos",
          onPress: () => actions()?.add(),
        },
    {
      type: "menu",
      label: "",
      icon: symbol("ellipsis"),
      tintColor: colors.accent,
      accessibilityLabel: "Album options",
      menu: {
        items: [
          ...selectionActions(state, actions),
          {
            type: "action",
            label: "Rename",
            icon: symbol("pencil"),
            onPress: () => router.push({ pathname: "/name", params: { id } }),
          },
          {
            type: "submenu",
            label: "Move to folder",
            icon: symbol("folder"),
            items: [
              {
                type: "action",
                label: "No folder",
                icon: symbol(state.groupId === null ? "checkmark" : "tray"),
                onPress: () => actions()?.move(null),
              },
              ...state.groups.map((group) => ({
                type: "action" as const,
                label: group.path,
                icon: symbol(state.groupId === group.id ? "checkmark" : "folder"),
                onPress: () => actions()?.move(group.id),
              })),
            ],
          },
          {
            type: "action",
            label: "Delete album",
            icon: symbol("trash"),
            destructive: true,
            onPress: () => actions()?.remove(),
          },
        ],
      },
    },
  ];
}
