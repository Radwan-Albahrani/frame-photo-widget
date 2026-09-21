import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { DuplicatesService, type DuplicateSet } from "@backend/api/duplicates/duplicates.service";
import { PhotosService } from "@backend/api/photos/photos.service";
import { WidgetService } from "@backend/api/widget/widget.service";
import { photoUri } from "@native/photoStore";
import { EmptyState, Text } from "@ui/components";
import { colors, radius, space } from "@ui/theme";

export default function DuplicatesScreen() {
  const [sets, setSets] = useState<DuplicateSet[]>([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(true);

  const reload = useCallback(async () => {
    setScanning(true);
    await PhotosService.backfillHashes();
    setSets(await DuplicatesService.find());
    setScanning(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const keepFirst = useCallback(
    async (set: DuplicateSet) => {
      setBusy(true);
      await PhotosService.remove(set.copies.slice(1).map((copy) => copy.photo.id));
      await WidgetService.sync();
      await reload();
      setBusy(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [reload]
  );

  const extras = sets.reduce((total, set) => total + set.copies.length - 1, 0);

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl * 3 }}
      >
        {scanning ? (
          <View style={{ paddingTop: space.xxxl * 2, alignItems: "center", gap: space.md }}>
            <ActivityIndicator color={colors.accent} />
            <Text variant="subhead" tone="dim">
              Checking every photo in your library…
            </Text>
          </View>
        ) : sets.length === 0 ? (
          <View style={{ paddingTop: space.xxxl * 2 }}>
            <EmptyState
              icon="checkmark.circle"
              title="No duplicates"
              message="Every photo in your albums is unique. Frame checks the photo you picked from your library, and the image itself."
            />
          </View>
        ) : (
          <>
            <Text variant="subhead" tone="dim">
              {extras === 1 ? "1 extra copy" : `${extras} extra copies`} across{" "}
              {sets.length === 1 ? "1 photo" : `${sets.length} photos`}. Keeping the first copy
              removes the rest.
            </Text>
            {sets.map((set) => (
              <View
                key={set.key}
                style={{
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radius.lg,
                  borderCurve: "continuous",
                  padding: space.md,
                  gap: space.md,
                }}
              >
                <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
                  {set.copies.map((copy) => {
                    const uri = photoUri(copy.photo.fileName);
                    return (
                      <View key={copy.photo.id} style={{ gap: 4, width: 84 }}>
                        <View
                          style={{
                            width: 84,
                            height: 84,
                            borderRadius: radius.sm,
                            overflow: "hidden",
                            backgroundColor: colors.surfaceTinted,
                          }}
                        >
                          {uri === null ? null : (
                            <Image
                              source={{ uri }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                              cachePolicy="disk"
                            />
                          )}
                        </View>
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {copy.albumName}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Keep the first copy"
                  disabled={busy}
                  onPress={() => void keepFirst(set)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: space.sm,
                    paddingVertical: space.md,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceTinted,
                    opacity: pressed || busy ? 0.7 : 1,
                  })}
                >
                  <SymbolView name="wand.and.stars" tintColor={colors.accent} size={16} />
                  <Text variant="subhead" style={{ color: colors.accent }}>
                    Keep the first, remove {set.copies.length - 1}
                  </Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <Stack.Screen.Title>Duplicates</Stack.Screen.Title>
    </>
  );
}
