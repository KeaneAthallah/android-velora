import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.canvas }, style]}>{children}</View>;
}

type ScreenScrollProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
  bottomPadding?: number;
  horizontalPadding?: number;
};

export function ScreenScroll({
  children,
  contentStyle,
  refreshing = false,
  onRefresh,
  keyboardShouldPersistTaps = "handled",
  bottomPadding = 32,
  horizontalPadding = 16,
}: ScreenScrollProps) {
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.canvas }}
        contentContainerStyle={[
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: bottomPadding,
            flexGrow: 1,
          },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
