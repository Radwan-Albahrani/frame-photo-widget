import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import { Text } from "@ui/components/primitives/Text";
import { groupCountLabel } from "@ui/format";
import { colors, radius, space } from "@ui/theme";
import { LinkZoomTransitionSource } from "@ui/zoom";

interface GroupCardProps {
  name: string;
  albumCount: number;
  folderCount: number;
  coverUris: (string | null)[];
  size: number;
  zoomSourceId: string;
}

const TILE_GAP = 4;

export function GroupCard({
  name,
  albumCount,
  folderCount,
  coverUris,
  size,
  zoomSourceId,
}: GroupCardProps) {
  const padding = space.sm;
  const mosaic = size - padding * 2;
  const tile = (mosaic - TILE_GAP) / 2;
  const SLOTS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
  const tiles = SLOTS.map((slot, index) => ({ slot, uri: coverUris[index] ?? null }));

  return (
    <View style={{ width: size, gap: space.sm }}>
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
        <LinkZoomTransitionSource identifier={zoomSourceId}>
          <View
            collapsable={false}
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
        </LinkZoomTransitionSource>

        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <SymbolView name="folder.fill" tintColor={colors.inkMuted} size={13} />
          <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
            {name}
          </Text>
        </View>
      </View>

      <Text variant="footnote" tone="muted">
        {groupCountLabel(albumCount, folderCount)}
      </Text>
    </View>
  );
}
