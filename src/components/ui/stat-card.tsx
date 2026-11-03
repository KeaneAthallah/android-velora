import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import { Card } from "./card";
import { Skeleton } from "./skeleton";
import { Text } from "./text";

export type StatTone = "default" | "success" | "warning" | "danger" | "primary";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  loading?: boolean;
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading = false,
}: StatCardProps) {
  const { colors } = useTheme();

  const accent = {
    default: colors.inkMuted,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        {Icon ? <Icon size={16} color={accent} /> : null}
      </View>

      {loading ? (
        <Skeleton height={24} width="70%" />
      ) : (
        <Text
          variant="heading"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.value}
        >
          {value}
        </Text>
      )}

      {hint && !loading ? (
        <Text variant="caption" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    flexShrink: 1,
  },
  value: {
    fontSize: 20,
    lineHeight: 26,
  },
});
