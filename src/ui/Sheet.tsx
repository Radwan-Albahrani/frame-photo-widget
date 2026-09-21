import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { radius, spacing } from "./theme";
import { useTheme } from "./useTheme";

interface SheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

export function Sheet({ visible, onDismiss, children }: SheetProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        onPress={onDismiss}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: radius.large,
              borderTopRightRadius: radius.large,
              padding: spacing.xl,
              paddingBottom: spacing.xl * 1.6,
              gap: spacing.lg,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 38,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
              }}
            />
            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

interface PromptSheetProps {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function PromptSheet({
  visible,
  title,
  placeholder,
  initialValue,
  confirmLabel,
  onCancel,
  onConfirm,
}: PromptSheetProps) {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    if (visible) setValue(initialValue ?? "");
  }, [visible, initialValue]);

  const trimmed = value.trim();

  return (
    <Sheet visible={visible} onDismiss={onCancel}>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>{title}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => trimmed.length > 0 && onConfirm(trimmed)}
        style={{
          backgroundColor: theme.surfaceAlt,
          borderRadius: radius.medium,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md + 2,
          fontSize: 17,
          color: theme.text,
        }}
      />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <SheetButton label="Cancel" onPress={onCancel} tone="neutral" />
        <SheetButton
          label={confirmLabel}
          onPress={() => onConfirm(trimmed)}
          tone="accent"
          disabled={trimmed.length === 0}
        />
      </View>
    </Sheet>
  );
}

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmSheetProps) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onDismiss={onCancel}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 15, lineHeight: 21 }}>{message}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <SheetButton label="Cancel" onPress={onCancel} tone="neutral" />
        <SheetButton label={confirmLabel} onPress={onConfirm} tone="danger" />
      </View>
    </Sheet>
  );
}

interface SheetButtonProps {
  label: string;
  onPress: () => void;
  tone: "neutral" | "accent" | "danger";
  disabled?: boolean;
}

export function SheetButton({ label, onPress, tone, disabled }: SheetButtonProps) {
  const theme = useTheme();
  const background =
    tone === "accent" ? theme.accent : tone === "danger" ? theme.danger : theme.surfaceAlt;
  const color = tone === "neutral" ? theme.text : "#FFFFFF";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: background,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        borderRadius: radius.medium,
        paddingVertical: spacing.md + 2,
        alignItems: "center",
      })}
    >
      <Text style={{ color, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
