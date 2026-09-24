import {
  type NativeStackHeaderItem,
  type NativeStackNavigationProp,
  useNavigation,
} from "expo-router";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { RouteHeaderStore } from "@ui/header/routeHeaderStore";

type StackParams = Record<string, object | undefined>;

interface ScreenHeaderConfig<State, Actions> {
  store: RouteHeaderStore<State, Actions>;
  id: string;
  same: (a: State, b: State) => boolean;
  title: (state: State) => string;
  items: (id: string) => NativeStackHeaderItem[];
}

// what: UIKit re-animates Back on any header change mid-transition, so a change waits for transitionEnd
export function useScreenHeader<State, Actions>({
  store,
  id,
  same,
  title,
  items,
}: ScreenHeaderConfig<State, Actions>): readonly [State, (next: State) => void] {
  const navigation = useNavigation<NativeStackNavigationProp<StackParams>>();
  const state = useSyncExternalStore(
    useCallback((listener: () => void) => store.subscribe(id, listener), [store, id]),
    () => store.state(id)
  );
  const settled = useRef(false);
  const pending = useRef<State | null>(null);

  const apply = useCallback(
    (next: State) => {
      if (same(store.state(id), next)) return;
      store.set(id, next);
      navigation.setOptions({ title: title(next), unstable_headerRightItems: () => items(id) });
    },
    [store, id, same, title, items, navigation]
  );

  useEffect(() => {
    const unsettle = () => {
      settled.current = false;
    };
    const offStart = navigation.addListener("transitionStart", unsettle);
    const offBlur = navigation.addListener("blur", unsettle);
    const offEnd = navigation.addListener("transitionEnd", () => {
      settled.current = true;
      const queued = pending.current;
      pending.current = null;
      if (queued !== null) apply(queued);
    });
    return () => {
      offStart();
      offBlur();
      offEnd();
    };
  }, [navigation, apply]);

  const commit = useCallback(
    (next: State) => {
      if (settled.current) {
        apply(next);
        return;
      }
      pending.current = next;
    },
    [apply]
  );

  return [state, commit] as const;
}
