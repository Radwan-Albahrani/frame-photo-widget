import type { NativeStackHeaderItemMenuAction } from "expo-router";

type HeaderIcon = NonNullable<NativeStackHeaderItemMenuAction["icon"]>;
type SymbolName = Extract<HeaderIcon, { type: "sfSymbol" }>["name"];

export function symbol(name: SymbolName): HeaderIcon {
  return { type: "sfSymbol", name };
}
