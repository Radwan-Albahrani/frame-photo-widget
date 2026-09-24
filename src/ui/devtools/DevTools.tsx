import { useReactNavigationDevTools } from "@rozenite/react-navigation-plugin";
import { useNavigationContainerRef } from "expo-router";
import { Genie } from "genie-react/native";

const GENIE_URL = "ws://127.0.0.1:4390/__genie/ws";

function DevToolsInner() {
  const ref = useNavigationContainerRef();
  useReactNavigationDevTools({ ref });
  return process.env.EXPO_PUBLIC_GENIE === "1" ? <Genie url={GENIE_URL} /> : null;
}

export function DevTools() {
  if (!__DEV__) return null;
  return <DevToolsInner />;
}
