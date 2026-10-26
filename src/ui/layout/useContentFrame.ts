import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useContentFrame() {
  const { width } = useWindowDimensions();
  const { left, right, bottom } = useSafeAreaInsets();
  return { width: width - left - right, left, right, bottom };
}
