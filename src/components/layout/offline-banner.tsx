import { Pressable, StyleSheet, View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useOffline } from "@/providers/offline-provider";
import { useTheme } from "@/theme";
import { Text } from "@/components/ui/text";

export function OfflineBanner() {
  const { colors } = useTheme();
  const { isOnline, queuedCount, replay } = useOffline();

  if (isOnline && queuedCount === 0) return null;

  const tone = isOnline ? colors.warning : colors.danger;
  const message = isOnline
    ? `${queuedCount} queued sale${queuedCount === 1 ? "" : "s"} pending sync`
    : "Offline — sales will be queued";

  return (
    <View
      style={[styles.banner, { backgroundColor: isOnline ? colors.warningBg : colors.dangerBg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <WifiOff size={14} color={tone} />
      <Text variant="caption" color={tone} style={styles.text}>
        {message}
      </Text>
      {isOnline && queuedCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sync ${queuedCount} queued sale${queuedCount === 1 ? "" : "s"} now`}
          hitSlop={8}
          onPress={() => void replay()}
          style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
        >
          <Text variant="caption" color={colors.warning} style={styles.actionLabel}>
            Sync now
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: { flex: 1 },
  // A 44pt-tall target: the inline text was a 17pt tap area.
  action: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 6,
    marginVertical: -8,
  },
  actionPressed: { opacity: 0.7 },
  actionLabel: { fontWeight: "600" },
});
