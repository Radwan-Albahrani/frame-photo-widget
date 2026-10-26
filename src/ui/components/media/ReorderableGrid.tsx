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
import { cellIndexAt, cellPosition, gridHeight, type GridLayout } from "@ui/layout/grid";

export interface ReorderableItem {
  id: string;
}

interface ReorderableGridProps<T extends ReorderableItem> {
  items: T[];
  layout: GridLayout;
  width: number;
  gap: number;
  renderItem: (item: T) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onPress?: (item: T) => void;
}

const SPRING = { damping: 20, stiffness: 200, mass: 0.5 };

export function ReorderableGrid<T extends ReorderableItem>({
  items,
  layout,
  width,
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

  return (
    <View style={{ height: gridHeight(items.length, layout, gap), width }}>
      {items.map((item, initialIndex) => (
        <ReorderableCell
          key={item.id}
          item={item}
          initialIndex={initialIndex}
          order={order}
          layout={layout}
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
  layout: GridLayout;
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
  layout,
  gap,
  count,
  onReorder,
  onPress,
  children,
}: CellProps<T>) {
  const home = cellPosition(initialIndex, layout, gap);
  const translateX = useSharedValue(home.x);
  const translateY = useSharedValue(home.y);
  const originX = useSharedValue(home.x);
  const originY = useSharedValue(home.y);
  const dragging = useSharedValue(false);

  useAnimatedReaction(
    () => order.value.indexOf(item.id),
    (position, previous) => {
      if (position < 0 || dragging.value) return;
      const target = cellPosition(position, layout, gap);
      if (previous === null || previous < 0) {
        translateX.value = target.x;
        translateY.value = target.y;
        return;
      }
      translateX.value = withSpring(target.x, SPRING);
      translateY.value = withSpring(target.y, SPRING);
    },
    [layout, gap]
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
      const to = cellIndexAt(translateX.value, translateY.value, layout, gap, count);
      if (from >= 0 && to !== from) {
        const next = [...order.value];
        next.splice(from, 1);
        next.splice(to, 0, item.id);
        order.value = next;
      }
    })
    .onEnd(() => {
      const settled = order.value.indexOf(item.id);
      const target = cellPosition(Math.max(settled, 0), layout, gap);
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
    width: layout.cellSize,
    height: layout.cellSize,
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
