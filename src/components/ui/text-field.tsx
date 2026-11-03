import { forwardRef, useState, type ComponentRef, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "@/theme";
import { Text } from "./text";

type TextFieldProps = RNTextInputProps & {
  label?: string;
  error?: string | null;
  helper?: string | null;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Renders a show/hide control for `secureTextEntry` fields. */
  passwordToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = forwardRef<ComponentRef<typeof RNTextInput>, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      helper,
      leftIcon,
      rightIcon,
      passwordToggle = false,
      containerStyle,
      secureTextEntry,
      style,
      onFocus,
      onBlur,
      ...inputProps
    },
    ref,
  ) {
    const { colors, radii, fonts } = useTheme();
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);

    const isSecure = secureTextEntry === true && !revealed;
    const borderColor = error
      ? colors.danger
      : focused
        ? colors.primary
        : colors.input;

    return (
      <View style={containerStyle}>
        {label ? (
          <Text variant="label" style={styles.label}>
            {label}
          </Text>
        ) : null}

        <View
          style={[
            styles.field,
            {
              backgroundColor: colors.surface,
              borderColor,
              borderRadius: radii.md,
            },
          ]}
        >
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}

          <RNTextInput
            ref={ref}
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.primary}
            secureTextEntry={isSecure}
            style={[
              styles.input,
              {
                color: colors.ink,
                fontFamily: fonts.regular,
                paddingLeft: leftIcon ? 0 : 14,
                paddingRight: rightIcon || passwordToggle ? 0 : 14,
              },
              style,
            ]}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            {...inputProps}
          />

          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}

          {passwordToggle ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={revealed ? "Hide password" : "Show password"}
              hitSlop={8}
              onPress={() => setRevealed((value) => !value)}
              style={styles.icon}
            >
              {revealed ? (
                <EyeOff size={18} color={colors.inkMuted} />
              ) : (
                <Eye size={18} color={colors.inkMuted} />
              )}
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Text variant="caption" color={colors.danger} style={styles.helper}>
            {error}
          </Text>
        ) : helper ? (
          <Text variant="caption" style={styles.helper}>
            {helper}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  icon: {
    paddingHorizontal: 12,
  },
  helper: {
    marginTop: 6,
  },
});
