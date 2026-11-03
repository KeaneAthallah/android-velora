import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import { Button } from "./button";
import { Text } from "./text";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors, radii } = useTheme();

  return (
    <View style={[styles.wrapper, compact ? styles.compact : null]}>
      <View
        style={[
          styles.iconTile,
          { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg },
        ]}
      >
        <Icon size={compact ? 20 : 26} color={colors.inkMuted} />
      </View>

      <Text variant="title" align="center">
        {title}
      </Text>

      {description ? (
        <Text variant="bodySmall" align="center" style={styles.description}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  compact: {
    paddingVertical: 20,
  },
  iconTile: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  description: {
    maxWidth: 300,
  },
  action: {
    marginTop: 8,
  },
});
