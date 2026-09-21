import { useCallback } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

export interface ReorderableItem {
  id: string;
}

interface ReorderableGridProps<T extends ReorderableItem> {
  items: T[];
  numColumns: number;
  cellSize: number;
  gap: number;
  renderItem: (item: T, dragging: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onPress?: (item: T) => void;
  enabled?: boolean;
}

const SPRING = { damping: 22, stiffness: 220, mass: 0.6 };

function positionOf(index: number, numColumns: number, cellSize: number, gap: number) {
  "worklet";
  const column = index % numColumns;
  const row = Math.floor(index / numColumns);
  return { x: column * (cellSize + gap), y: row * (cellSize + gap) };
}

function indexAt(
  x: number,
  y: number,
  numColumns: number,
  cellSize: number,
  gap: number,
  count: number
) {
  "worklet";
  const column = Math.max(0, Math.min(numColumns - 1, Math.round(x / (cellSize + gap))));
  const row = Math.max(0, Math.round(y / (cellSize + gap)));
  return Math.max(0, Math.min(count - 1, row * numColumns + column));
}

export function ReorderableGrid<T extends ReorderableItem>({
  items,
  numColumns,
  cellSize,
  gap,
  renderItem,
  onReorder,
  onPress,
  enabled = true,
}: ReorderableGridProps<T>) {
  const order = useSharedValue<string[]>(items.map((item) => item.id));
  const activeId = useSharedValue<string | null>(null);

  order.value = items.map((item) => item.id);

  const rows = Math.ceil(items.length / numColumns);
  const height = rows === 0 ? 0 : rows * cellSize + (rows - 1) * gap;

  const commit = useCallback(
    (next: string[]) => {
      onReorder(next);
    },
    [onReorder]
  );

  return (
    <View style={{ height, width: numColumns * cellSize + (numColumns - 1) * gap }}>
      {items.map((item) => (
        <ReorderableCell
          key={item.id}
          item={item}
          order={order}
          activeId={activeId}
          numColumns={numColumns}
          cellSize={cellSize}
          gap={gap}
          count={items.length}
          enabled={enabled}
          onCommit={commit}
          onPress={onPress}
        >
          {renderItem}
        </ReorderableCell>
      ))}
    </View>
  );
}

interface CellProps<T extends ReorderableItem> {
  item: T;
  order: SharedValue<string[]>;
  activeId: SharedValue<string | null>;
  numColumns: number;
  cellSize: number;
  gap: number;
  count: number;
  enabled: boolean;
  onCommit: (next: string[]) => void;
  onPress?: (item: T) => void;
  children: (item: T, dragging: boolean) => React.ReactNode;
}

function ReorderableCell<T extends ReorderableItem>({
  item,
  order,
  activeId,
  numColumns,
  cellSize,
  gap,
  count,
  enabled,
  onCommit,
  onPress,
  children,
}: CellProps<T>) {
  const index = order.value.indexOf(item.id);
  const start = positionOf(index < 0 ? 0 : index, numColumns, cellSize, gap);
  const translateX = useSharedValue(start.x);
  const translateY = useSharedValue(start.y);
  const dragging = useSharedValue(false);

  useAnimatedReaction(
    () => order.value.indexOf(item.id),
    (position, previous) => {
      if (position < 0 || dragging.value) return;
      const target = positionOf(position, numColumns, cellSize, gap);
      if (previous === null) {
        translateX.value = target.x;
        translateY.value = target.y;
        return;
      }
      translateX.value = withSpring(target.x, SPRING);
      translateY.value = withSpring(target.y, SPRING);
    },
    [numColumns, cellSize, gap]
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .enabled(enabled)
    .onStart(() => {
      dragging.value = true;
      activeId.value = item.id;
    })
    .onUpdate((event) => {
      const from = order.value.indexOf(item.id);
      if (from < 0) return;
      const home = positionOf(from, numColumns, cellSize, gap);
      translateX.value = home.x + event.translationX;
      translateY.value = home.y + event.translationY;

      const to = indexAt(translateX.value, translateY.value, numColumns, cellSize, gap, count);
      if (to !== from) {
        const next = [...order.value];
        next.splice(from, 1);
        next.splice(to, 0, item.id);
        order.value = next;
      }
    })
    .onEnd(() => {
      const settled = order.value.indexOf(item.id);
      const target = positionOf(settled < 0 ? 0 : settled, numColumns, cellSize, gap);
      translateX.value = withSpring(target.x, SPRING);
      translateY.value = withSpring(target.y, SPRING);
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      activeId.value = null;
      runOnJS(onCommit)(order.value);
    });

  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success && onPress !== undefined) runOnJS(onPress)(item);
  });

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    width: cellSize,
    height: cellSize,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: withTiming(dragging.value ? 1.08 : 1, { duration: 140 }) },
    ],
    zIndex: dragging.value ? 10 : 0,
    shadowColor: "#000",
    shadowOpacity: withTiming(dragging.value ? 0.45 : 0, { duration: 140 }),
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <Animated.View style={style}>{children(item, false)}</Animated.View>
    </GestureDetector>
  );
}
