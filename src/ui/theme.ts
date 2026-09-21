import { Platform } from "react-native";

export const palette = {
  light: {
    background: "#F7F7F8",
    surface: "#FFFFFF",
    surfaceAlt: "#EFEFF2",
    text: "#0B0B0C",
    textMuted: "#6B6B73",
    border: "#E2E2E7",
    accent: "#2F6BFF",
    danger: "#E5484D",
  },
  dark: {
    background: "#0A0A0B",
    surface: "#151517",
    surfaceAlt: "#1F1F23",
    text: "#FFFFFF",
    textMuted: "#9A9AA3",
    border: "#2A2A30",
    accent: "#5B8CFF",
    danger: "#FF6166",
  },
};

export type Palette = (typeof palette)["light"];

export const radius = {
  small: 10,
  medium: 16,
  large: 22,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const fonts = {
  title: Platform.select({ ios: "SF Pro Rounded", default: "System" }),
};
