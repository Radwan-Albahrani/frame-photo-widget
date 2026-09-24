import { Button, ConfirmationDialog, Host, Spacer, Text } from "@expo/ui/swift-ui";
import { StyleSheet } from "react-native";

const DESTRUCTIVE = "destructive" as const;
const CANCEL = "cancel" as const;

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onVisibleChange: (visible: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onVisibleChange,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Host style={StyleSheet.absoluteFill} pointerEvents="none">
      <ConfirmationDialog title={title} isPresented={visible} onIsPresentedChange={onVisibleChange}>
        <ConfirmationDialog.Trigger>
          <Spacer />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button role={DESTRUCTIVE} label={confirmLabel} onPress={onConfirm} />
          <Button role={CANCEL} label="Cancel" />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{message}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Host>
  );
}
