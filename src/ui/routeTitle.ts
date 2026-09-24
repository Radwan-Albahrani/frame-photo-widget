import { useNavigation } from "expo-router";
import { useEffect } from "react";

export function routeTitle(params: object | undefined): string {
  return params !== undefined && "name" in params && typeof params.name === "string"
    ? params.name
    : "";
}

export function useRenamedTitle(name: string, routeName: string | undefined): void {
  const navigation = useNavigation();
  useEffect(() => {
    if (name.length > 0 && name !== routeName) navigation.setOptions({ title: name });
  }, [navigation, name, routeName]);
}
