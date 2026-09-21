import { colors } from "@ui/theme";

export const DARK_HEADER = {
  headerShown: true,
  headerLargeTitle: true,
  headerShadowVisible: false,
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.ink },
  headerLargeTitleStyle: { color: colors.ink },
  contentStyle: { backgroundColor: colors.surface },
} as const;
