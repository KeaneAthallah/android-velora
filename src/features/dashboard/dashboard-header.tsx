import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { TenantSwitcher } from "@/components/tenant/tenant-switcher";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  } catch {
    return new Date().toDateString();
  }
}

/** Dashboard top block: greeting, date, signed-in user and workspace switcher. */
export function DashboardHeader() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { outlet } = useTenant();

  const firstName = session?.user.name.trim().split(/\s+/)[0] ?? "there";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topRow}>
        <View style={styles.text}>
          <Text variant="label" color={colors.inkMuted} style={styles.date}>
            {todayLabel()}
          </Text>
          <Text variant="display" numberOfLines={1} adjustsFontSizeToFit style={styles.greeting}>
            {greeting()}, {firstName}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {outlet ? `Working at ${outlet.name}` : "Choose an outlet to begin"}
          </Text>
        </View>

        {session ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push("/settings")}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          >
            <Avatar
              name={session.user.name}
              uri={session.user.avatarUrl}
              size={44}
            />
          </Pressable>
        ) : null}
      </View>

      <TenantSwitcher />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  date: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 11,
  },
  greeting: {
    fontSize: 26,
    lineHeight: 32,
  },
  pressed: {
    opacity: 0.75,
  },
});
