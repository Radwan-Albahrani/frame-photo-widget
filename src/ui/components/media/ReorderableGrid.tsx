import { useEffect } from "react";
import { View } from "react-native";
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
  renderItem: (item: T) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onPress?: (item: T) => void;
}

const SPRING = { damping: 20, stiffness: 200, mass: 0.5 };

function positionOf(index: number, numColumns: number, cellSize: number, gap: number) {
  "worklet";
  return {
    x: (index % numColumns) * (cellSize + gap),
    y: Math.floor(index / numColumns) * (cellSize + gap),
  };
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
}: ReorderableGridProps<T>) {
  const order = useSharedValue<string[]>(items.map((item) => item.id));
  const signature = items.map((item) => item.id).join(",");

  useEffect(() => {
    order.value = signature.length === 0 ? [] : signature.split(",");
  }, [signature, order]);

  const rows = Math.ceil(items.length / numColumns);
  const height = rows === 0 ? 0 : rows * cellSize + (rows - 1) * gap;

  return (
    <View style={{ height, width: numColumns * cellSize + (numColumns - 1) * gap }}>
      {items.map((item, initialIndex) => (
        <ReorderableCell
          key={item.id}
          item={item}
          initialIndex={initialIndex}
          order={order}
          numColumns={numColumns}
          cellSize={cellSize}
          gap={gap}
          count={items.length}
          onReorder={onReorder}
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
  initialIndex: number;
  order: SharedValue<string[]>;
  numColumns: number;
  cellSize: number;
  gap: number;
  count: number;
  onReorder: (orderedIds: string[]) => void;
  onPress?: (item: T) => void;
  children: (item: T) => React.ReactNode;
}

function ReorderableCell<T extends ReorderableItem>({
  item,
  initialIndex,
  order,
  numColumns,
  cellSize,
  gap,
  count,
  onReorder,
  onPress,
  children,
}: CellProps<T>) {
  const home = positionOf(initialIndex, numColumns, cellSize, gap);
  const translateX = useSharedValue(home.x);
  const translateY = useSharedValue(home.y);
  const originX = useSharedValue(home.x);
  const originY = useSharedValue(home.y);
  const dragging = useSharedValue(false);

  useAnimatedReaction(
    () => order.value.indexOf(item.id),
    (position, previous) => {
      if (position < 0 || dragging.value) return;
      const target = positionOf(position, numColumns, cellSize, gap);
      if (previous === null || previous < 0) {
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
    .activateAfterLongPress(250)
    .onStart(() => {
      dragging.value = true;
      // what: the finger must track from where the cell already sits, not its live index
      originX.value = translateX.value;
      originY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = originX.value + event.translationX;
      translateY.value = originY.value + event.translationY;

      const from = order.value.indexOf(item.id);
      const to = indexAt(translateX.value, translateY.value, numColumns, cellSize, gap, count);
      if (from >= 0 && to !== from) {
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
      runOnJS(onReorder)([...order.value]);
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
      { scale: withTiming(dragging.value ? 1.1 : 1, { duration: 120 }) },
    ],
    zIndex: dragging.value ? 20 : 0,
    shadowColor: "#000",
    shadowOpacity: withTiming(dragging.value ? 0.5 : 0, { duration: 120 }),
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View style={style}>{children(item)}</Animated.View>
    </GestureDetector>
  );
}
