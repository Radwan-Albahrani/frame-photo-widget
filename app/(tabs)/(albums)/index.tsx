import { Stack, useRouter } from "expo-router";
import { LibraryBrowser } from "@ui/components/media/LibraryBrowser";
import { colors } from "@ui/theme";

export default function AlbumsScreen() {
  const router = useRouter();
  return (
    <>
      <LibraryBrowser groupId={null} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon="plus"
          tintColor={colors.accent}
          accessibilityLabel="Create"
          accessibilityHint="Choose a new album or a new folder"
        >
          <Stack.Toolbar.MenuAction
            icon="rectangle.stack.badge.plus"
            onPress={() => router.push("/name")}
          >
            New album
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="folder.badge.plus"
            onPress={() => router.push({ pathname: "/name", params: { kind: "group" } })}
          >
            New folder
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
