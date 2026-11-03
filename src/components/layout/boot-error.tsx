import { StyleSheet, View } from "react-native";
import { CloudOff, RefreshCw } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/**
 * Startup failure banner: the stored token could not be exchanged for a
 * session (usually the API address is wrong or the server is down). Without
 * this the sign-in form would look like an ordinary bad-password error.
 */
export function BootErrorNotice() {
  const { colors, radii } = useTheme();
  const { bootError, retryBootstrap } = useAuth();

  if (!bootError) return null;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.dangerBg,
          borderColor: colors.dangerBorder,
          borderRadius: radii.md,
        },
      ]}
    >
      <View style={styles.row}>
        <CloudOff size={18} color={colors.danger} />
        <View style={styles.text}>
          <Text variant="bodySmall" color={colors.danger}>
            Could not restore your session
          </Text>
          <Text variant="caption">{bootError}</Text>
        </View>
      </View>

      <Button
        label="Try again"
        onPress={() => void retryBootstrap()}
        variant="ghost"
        size="sm"
        icon={<RefreshCw size={14} color={colors.danger} />}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  action: {
    alignSelf: "flex-start",
  },
});
