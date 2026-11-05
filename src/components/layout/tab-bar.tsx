import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import {
  ClipboardList,
  Home,
  LayoutGrid,
  Package,
  ReceiptText,
  type LucideIcon,
} from "lucide-react-native";
import { radii, shadows, spacing, useTheme } from "@/theme";
import { Text } from "@/components/ui/text";
import * as Haptics from "expo-haptics";

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  sales: ReceiptText,
  orders: ClipboardList,
  products: Package,
  more: LayoutGrid,
};

/**
 * Custom tab bar. Expo Router 58 renders the JS bottom tabs navigator and
 * hands the bar `state`, `descriptors`, `navigateToTab` and `insets`; the
 * default React Navigation bar does not match Velora's floating card language.
 */
export function TabBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, fonts, isDark } = useTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.canvas,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? colors.borderStrong : colors.border,
            borderRadius: radii.xl,
          },
          shadows.card,
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.title === "string"
              ? options.title
              : typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : route.name;

          const focused = state.index === index;
          const Icon = ICONS[route.name] ?? LayoutGrid;
          const tint = focused ? colors.primary : colors.inkMuted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                if (!focused) {
                  void Haptics.selectionAsync();
                  navigateToTab(route.key);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              <View
                style={[
                  styles.iconTile,
                  focused ? { backgroundColor: colors.primarySoft } : null,
                ]}
              >
                <Icon
                  size={19}
                  color={tint}
                  strokeWidth={focused ? 2.3 : 1.9}
                />
              </View>

              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={{
                  fontSize: 10.5,
                  lineHeight: 13,
                  color: tint,
                  fontFamily: focused ? fonts.semibold : fonts.medium,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 2,
  },
  iconTile: {
    width: 40,
    height: 26,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
