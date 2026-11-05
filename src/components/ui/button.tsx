import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, radii, fonts } = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      background: colors.primary,
      pressed: colors.primaryPress,
      foreground: colors.primaryForeground,
      disabledBg: colors.primarySoft,
      disabledFg: colors.inkMuted,
      border: "transparent",
    },
    secondary: {
      background: colors.surface,
      pressed: colors.surfaceMuted,
      foreground: colors.ink,
      disabledBg: colors.surfaceMuted,
      disabledFg: colors.inkMuted,
      border: colors.border,
    },
    ghost: {
      background: "transparent",
      pressed: colors.surfaceMuted,
      foreground: colors.primary,
      disabledBg: "transparent",
      disabledFg: colors.inkMuted,
      border: "transparent",
    },
    danger: {
      background: colors.danger,
      pressed: colors.dangerHover,
      foreground: colors.primaryForeground,
      disabledBg: colors.dangerBg,
      disabledFg: colors.danger,
      border: "transparent",
    },
  }[variant];

  const metrics = {
    sm: { height: 44, paddingHorizontal: 14, fontSize: 13 },
    md: { height: 48, paddingHorizontal: 18, fontSize: 15 },
    lg: { height: 56, paddingHorizontal: 22, fontSize: 16 },
  }[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      android_ripple={
        variant === "ghost"
          ? undefined
          : {
              color:
                variant === "primary" || variant === "danger"
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.06)",
              borderless: false,
            }
      }
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
          backgroundColor: isDisabled ? palette.disabledBg : palette.background,
          borderColor: palette.border,
          borderWidth: palette.border === "transparent" ? 0 : 1,
          borderRadius: radii.md,
           opacity: 1,
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isDisabled ? palette.disabledFg : palette.foreground}
        />
      ) : icon ? (
        <View style={styles.icon}>{icon}</View>
      ) : null}
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: metrics.fontSize,
          color: isDisabled ? palette.disabledFg : palette.foreground,
        }}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  icon: {
    marginRight: 2,
  },
});
