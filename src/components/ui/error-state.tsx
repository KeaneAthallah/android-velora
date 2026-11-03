import { CloudOff, RefreshCw, ShieldX } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import { Button } from "./button";
import { Text } from "./text";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  title?: string;
  forbidden?: boolean;
  compact?: boolean;
};

export function ErrorState({
  message,
  onRetry,
  title,
  forbidden = false,
  compact = false,
}: ErrorStateProps) {
  const { colors, radii } = useTheme();
  const Icon = forbidden ? ShieldX : CloudOff;

  return (
    <View style={[styles.wrapper, compact ? styles.compact : null]}>
      <View
        style={[
          styles.iconTile,
          { backgroundColor: colors.dangerBg, borderRadius: radii.lg },
        ]}
      >
        <Icon size={compact ? 20 : 24} color={colors.danger} />
      </View>

      <Text variant="title" align="center">
        {title ?? (forbidden ? "Not available for your role" : "Something went wrong")}
      </Text>

      <Text variant="bodySmall" align="center" style={styles.message}>
        {message}
      </Text>

      {onRetry ? (
        <Button
          label="Try again"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={15} color={colors.ink} />}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  compact: {
    paddingVertical: 20,
  },
  iconTile: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  message: {
    maxWidth: 320,
  },
  action: {
    marginTop: 8,
  },
});
