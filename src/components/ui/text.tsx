import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useTheme } from "@/theme";

export type TextVariant =
  | "display"
  | "heading"
  | "title"
  | "body"
  | "bodySmall"
  | "label"
  | "caption"
  | "code";

type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: string;
  align?: "left" | "center" | "right";
};

export function Text({
  variant = "body",
  color,
  align,
  style,
  ...rest
}: TextProps) {
  const { colors, fonts } = useTheme();

  const variants: Record<TextVariant, RNTextProps["style"]> = {
    display: {
      fontFamily: fonts.extrabold,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.6,
      color: colors.ink,
    },
    heading: {
      fontFamily: fonts.bold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.3,
      color: colors.ink,
    },
    title: {
      fontFamily: fonts.semibold,
      fontSize: 17,
      lineHeight: 23,
      color: colors.ink,
    },
    body: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.ink,
    },
    bodySmall: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.inkSecondary,
    },
    label: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      color: colors.inkSecondary,
    },
    caption: {
      fontFamily: fonts.regular,
      fontSize: 12,
      lineHeight: 16,
      color: colors.inkMuted,
    },
    code: {
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 16,
      color: colors.inkSecondary,
    },
  };

  return (
    <RNText
      style={[
        variants[variant],
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
