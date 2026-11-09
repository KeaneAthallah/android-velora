import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/theme";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { TenantSwitcher } from "@/components/tenant/tenant-switcher";
import { useAuth } from "@/providers/auth-provider";

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  /** Show a circular back control. Defaults to `router.back()`. */
  showBack?: boolean;
  onBack?: () => void;
  /** Render the business/outlet switcher pill on the right. */
  showTenant?: boolean;
  /** Render the signed-in user's avatar on the right (opens settings). */
  showAvatar?: boolean;
  right?: ReactNode;
  /** Display-size title used by top-level tabs. */
  large?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  showTenant = false,
  showAvatar = false,
  right,
  large = false,
  style,
}: AppHeaderProps) {
  const { colors, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          backgroundColor: colors.canvas,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={handleBack}
              style={({ pressed }) => [
                styles.back,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.full,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <ArrowLeft size={18} color={colors.ink} />
            </Pressable>
          ) : null}

          {title ? (
            <View style={styles.titleBlock}>
              <Text variant={large ? "display" : "heading"} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.right}>
          {showTenant ? <TenantSwitcher /> : null}
          {right}

          {showAvatar && session ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              hitSlop={4}
              onPress={() => router.push("/settings")}
              style={({ pressed }) => (pressed ? styles.avatarPressed : undefined)}
            >
              <Avatar
                name={session.user.name}
                uri={session.user.avatarUrl}
                size={38}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  titleBlock: {
    flexShrink: 1,
    gap: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  back: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarPressed: {
    opacity: 0.75,
  },
});
