import { LinkZoomTransitionSource } from "expo-router/build/link/preview/native";
import { INTERNAL_EXPO_ROUTER_ZOOM_TRANSITION_SOURCE_ID_PARAM_NAME } from "expo-router/build/navigationParams";

// what: expo-router's zoom is public only via <Link>; card taps come from a native menu host, not a Link
export { LinkZoomTransitionSource };

export function zoomParams(sourceId: string): Record<string, string> {
  return { [INTERNAL_EXPO_ROUTER_ZOOM_TRANSITION_SOURCE_ID_PARAM_NAME]: sourceId };
}
