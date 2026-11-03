import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/theme";
import { Text } from "./text";

type ListRowProps = {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

export function ListRow({
  icon: Icon,
  title,
  subtitle,
  right,
  onPress,
  disabled = false,
}: ListRowProps) {
  const { colors, radii } = useTheme();

  const content = (
    <>
      {Icon ? (
        <View style={[styles.iconTile, { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm }]}>
          <Icon size={17} color={disabled ? colors.inkMuted : colors.inkSecondary} />
        </View>
      ) : null}

      <View style={styles.text}>
        <Text variant="body" numberOfLines={1} color={disabled ? colors.inkMuted : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}

      {onPress && !disabled ? (
        <ChevronRight size={16} color={colors.inkMuted} />
      ) : null}
    </>
  );

  if (!onPress || disabled) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed ? { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm } : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  iconTile: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
