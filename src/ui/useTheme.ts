import { useColorScheme } from "react-native";
import { palette, type Palette } from "./theme";

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === "light" ? palette.light : palette.dark;
}
