import { StyleSheet, View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useOffline } from "@/providers/offline-provider";
import { useTheme } from "@/theme";
import { Text } from "@/components/ui/text";

export function OfflineBanner() {
  const { colors } = useTheme();
  const { isOnline, queuedCount, replay } = useOffline();

  if (isOnline && queuedCount === 0) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isOnline ? colors.warningBg : colors.dangerBg,
        },
      ]}
    >
      <WifiOff size={14} color={isOnline ? colors.warning : colors.danger} />
      <Text variant="caption" color={isOnline ? colors.warning : colors.danger} style={styles.text}>
        {isOnline
          ? `${queuedCount} queued sale${queuedCount === 1 ? "" : "s"} pending sync`
          : "Offline — sales will be queued"}
      </Text>
      {isOnline && queuedCount > 0 ? (
        <Text variant="caption" color={colors.warning} style={styles.action} onPress={() => void replay()}>
          Sync now
        </Text>
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
  action: { fontWeight: "600" },
});