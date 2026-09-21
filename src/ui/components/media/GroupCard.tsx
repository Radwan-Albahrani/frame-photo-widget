import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@ui/components/primitives/Text";
import { colors, radius, space } from "@ui/theme";

interface GroupCardProps {
  name: string;
  albumCount: number;
  coverUris: (string | null)[];
  size: number;
  onPress: () => void;
  onLongPress?: () => void;
}

const TILE_GAP = 4;

export function GroupCard({
  name,
  albumCount,
  coverUris,
  size,
  onPress,
  onLongPress,
}: GroupCardProps) {
  const padding = space.sm;
  const mosaic = size - padding * 2;
  const tile = (mosaic - TILE_GAP) / 2;
  const SLOTS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
  const tiles = SLOTS.map((slot, index) => ({ slot, uri: coverUris[index] ?? null }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${albumCount === 1 ? "1 album" : `${albumCount} albums`}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={({ pressed }) => ({
        width: size,
        gap: space.sm,
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        style={{
          width: size,
          borderRadius: radius.xl,
          borderCurve: "continuous",
          backgroundColor: colors.surfaceElevated,
          padding,
          gap: space.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.hairline,
        }}
      >
        <View
          style={{
            width: mosaic,
            height: mosaic,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: TILE_GAP,
          }}
        >
          {tiles.map((entry) => (
            <View
              key={entry.slot}
              style={{
                width: tile,
                height: tile,
                borderRadius: radius.sm,
                borderCurve: "continuous",
                overflow: "hidden",
                backgroundColor: colors.surfaceTinted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {entry.uri === null ? null : (
                <Image
                  source={{ uri: entry.uri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="disk"
                />
              )}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <SymbolView name="folder.fill" tintColor={colors.inkMuted} size={13} />
          <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
            {name}
          </Text>
        </View>
      </View>

      <Text variant="footnote" tone="muted">
        {albumCount === 1 ? "1 album" : `${albumCount} albums`}
      </Text>
    </Pressable>
  );
}
