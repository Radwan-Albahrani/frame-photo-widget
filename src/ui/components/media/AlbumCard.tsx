import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@ui/components/primitives/Text";
import { photoCountLabel } from "@ui/format";
import { colors, radius, space } from "@ui/theme";

interface AlbumCardProps {
  name: string;
  photoCount: number;
  coverUri: string | null;
  size: number;
  recyclingKey: string;
  onPress: () => void;
}

const STACK_INSET = 10;
const STACK_OFFSET = 6;

export function AlbumCard({
  name,
  photoCount,
  coverUri,
  size,
  recyclingKey,
  onPress,
}: AlbumCardProps) {
  const stacked = photoCount > 1;
  const coverHeight = stacked ? size - STACK_OFFSET * 2 : size;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${photoCountLabel(photoCount)}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        gap: space.sm,
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ width: size, height: size, justifyContent: "flex-end" }}>
        {stacked ? (
          <View
            style={[
              styles.stackLayer,
              {
                left: STACK_INSET * 2,
                right: STACK_INSET * 2,
                top: 0,
                height: coverHeight,
                backgroundColor: colors.surfaceTinted,
              },
            ]}
          />
        ) : null}
        {stacked ? (
          <View
            style={[
              styles.stackLayer,
              {
                left: STACK_INSET,
                right: STACK_INSET,
                top: STACK_OFFSET,
                height: coverHeight,
                backgroundColor: colors.skeleton,
              },
            ]}
          />
        ) : null}
        <View
          style={{
            width: size,
            height: coverHeight,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            overflow: "hidden",
            backgroundColor: colors.surfaceElevated,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.rimLight,
          }}
        >
          {coverUri === null ? (
            <SymbolView name="photo" tintColor={colors.inkSubtle} size={28} />
          ) : (
            <Image
              source={{ uri: coverUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="disk"
              recyclingKey={recyclingKey}
              transition={180}
            />
          )}
        </View>
      </View>

      <View style={{ gap: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="footnote" tone="muted">
          {photoCountLabel(photoCount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stackLayer: {
    position: "absolute",
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
});
