import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { GroupsService } from "@backend/api/groups/groups.service";
import { LibraryBrowser } from "@ui/components/media/LibraryBrowser";
import { colors } from "@ui/theme";

export default function GroupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");

  useEffect(() => {
    GroupsService.byId(id).then((group) => {
      if (group !== null) setName(group.name);
    });
  }, [id]);

  return (
    <>
      <LibraryBrowser groupId={id} />
      <Stack.Screen.Title>{name}</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus" tintColor={colors.accent}>
          <Stack.Toolbar.MenuAction
            icon="rectangle.stack.badge.plus"
            onPress={() => router.push({ pathname: "/name", params: { group: id } })}
          >
            New album here
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="folder.badge.plus"
            onPress={() =>
              router.push({ pathname: "/name", params: { kind: "group", parent: id } })
            }
          >
            New folder here
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button
          icon="ellipsis"
          tintColor={colors.accent}
          onPress={() => router.push({ pathname: "/group-actions", params: { id } })}
        />
      </Stack.Toolbar>
    </>
  );
}
