import { type NativeStackHeaderItem, router } from "expo-router";
import { symbol } from "@ui/header/headerIcon";
import { colors } from "@ui/theme";

export function libraryHeaderItems(): NativeStackHeaderItem[] {
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
            label: "New album",
            icon: symbol("rectangle.stack.badge.plus"),
            onPress: () => router.push("/name"),
          },
          {
            type: "action",
            label: "New folder",
            icon: symbol("folder.badge.plus"),
            onPress: () => router.push({ pathname: "/name", params: { kind: "group" } }),
          },
        ],
      },
    },
  ];
}
