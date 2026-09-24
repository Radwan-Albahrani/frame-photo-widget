import { Stack } from "expo-router";
import { albumHeaderItems, albumHeaders, albumTitle } from "@ui/header/albumHeader";
import { folderHeaderItems, folderHeaders, folderTitle } from "@ui/header/folderHeader";
import { libraryHeaderItems } from "@ui/header/libraryHeader";
import { routeParam } from "@ui/header/routeParam";
import { DARK_HEADER } from "@ui/headerOptions";

export const unstable_settings = { anchor: "index" };

export default function AlbumsStackLayout() {
  return (
    <Stack screenOptions={DARK_HEADER}>
      <Stack.Screen
        name="index"
        options={{
          title: "Albums",
          headerLargeTitleEnabled: true,
          unstable_headerRightItems: libraryHeaderItems,
        }}
      />
      <Stack.Screen
        name="group/[id]"
        options={({ route }) => {
          const id = routeParam(route.params, "id");
          return {
            title: folderTitle(folderHeaders.state(id)),
            unstable_headerRightItems: () => folderHeaderItems(id),
          };
        }}
      />
      <Stack.Screen
        name="album/[id]"
        options={({ route }) => {
          const id = routeParam(route.params, "id");
          return {
            title: albumTitle(albumHeaders.state(id)),
            unstable_headerRightItems: () => albumHeaderItems(id),
          };
        }}
      />
      <Stack.Screen
        name="name"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.34],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
    </Stack>
  );
}
