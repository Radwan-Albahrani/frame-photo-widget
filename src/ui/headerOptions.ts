import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const BAR_HEIGHT = Platform.OS === "ios" ? 44 : 56;

const CONTENT_GAP = 12;

export const TRANSPARENT_HEADER = {
  headerShown: true,
  headerTransparent: true,
  headerShadowVisible: false,
} as const;

export function useBarOffset(): number {
  return useSafeAreaInsets().top + BAR_HEIGHT;
}

export function useHeaderPad(): number {
  return useBarOffset() + CONTENT_GAP;
}
