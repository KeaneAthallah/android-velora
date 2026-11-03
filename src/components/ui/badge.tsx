import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./text";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = "neutral", style }: BadgeProps) {
  const { colors, radii } = useTheme();

  const palette = {
    neutral: { background: colors.surfaceMuted, foreground: colors.inkSecondary },
    primary: { background: colors.primarySoft, foreground: colors.primary },
    success: { background: colors.successBg, foreground: colors.success },
    warning: { background: colors.warningBg, foreground: colors.warning },
    danger: { background: colors.dangerBg, foreground: colors.danger },
    info: { background: colors.infoBg, foreground: colors.info },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.background,
          borderRadius: radii.full,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 11,
          lineHeight: 14,
          letterSpacing: 0.2,
          color: palette.foreground,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
