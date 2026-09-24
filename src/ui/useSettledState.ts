import { type NativeStackNavigationProp, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

type StackParams = Record<string, object | undefined>;

// what: each header change is re-sent to UIKit, and one landing mid-push or mid-pop re-animates Back
export function useSettledState<T>(
  initial: T,
  same: (a: T, b: T) => boolean
): readonly [T, (next: T) => void] {
  const navigation = useNavigation<NativeStackNavigationProp<StackParams>>();
  const [value, setValue] = useState(initial);
  const settled = useRef(false);
  const pending = useRef<{ value: T } | null>(null);

  const apply = useCallback(
    (next: T) => setValue((current) => (same(current, next) ? current : next)),
    [same]
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
      if (queued !== null) apply(queued.value);
    });
    return () => {
      offStart();
      offBlur();
      offEnd();
    };
  }, [navigation, apply]);

  const commit = useCallback(
    (next: T) => {
      if (settled.current) {
        apply(next);
        return;
      }
      pending.current = { value: next };
    },
    [apply]
  );

  return [value, commit] as const;
}
