import { colors } from "@ui/theme";

export const DARK_HEADER = {
  headerShown: true,
  headerLargeTitleEnabled: false,
  headerBackButtonDisplayMode: "minimal",
  headerShadowVisible: false,
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.ink },
  headerLargeTitleStyle: { color: colors.ink },
  contentStyle: { backgroundColor: colors.surface },
} as const;
