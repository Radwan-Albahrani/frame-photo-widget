import { Button, ConfirmationDialog, Host, Text } from "@expo/ui/swift-ui";

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
    <Host style={{ position: "absolute", width: 0, height: 0 }}>
      <ConfirmationDialog title={title} isPresented={visible} onIsPresentedChange={onVisibleChange}>
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
