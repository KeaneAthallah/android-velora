import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, X } from "lucide-react-native";
import { useTheme } from "@/theme";
import { Text } from "./text";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Centered confirmation dialog. Deliberately a Modal rather than a Sheet:
 * destructive confirmations should not be dismissed by a stray backdrop tap
 * without the user seeing the consequence first.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, radii, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  const accent = tone === "danger" ? colors.danger : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          disabled={loading}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={onCancel}
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              marginBottom: Math.max(insets.bottom, 16),
            },
            shadows.card,
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <View
              style={[
                styles.iconTile,
                {
                  backgroundColor: tone === "danger" ? colors.dangerBg : colors.primarySoft,
                  borderRadius: radii.md,
                },
              ]}
            >
              <AlertTriangle size={19} color={accent} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              disabled={loading}
              onPress={onCancel}
              style={styles.close}
            >
              <X size={17} color={colors.inkMuted} />
            </Pressable>
          </View>

          <Text variant="title">{title}</Text>
          <Text variant="bodySmall" style={styles.message}>
            {message}
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              disabled={loading}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radii.md,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text variant="body" style={styles.actionLabel}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ busy: loading, disabled: loading }}
              disabled={loading}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: accent,
                  borderRadius: radii.md,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text
                  variant="body"
                  style={[styles.actionLabel, { color: colors.primaryForeground }]}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  iconTile: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  action: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  actionLabel: {
    fontSize: 14,
  },
});
