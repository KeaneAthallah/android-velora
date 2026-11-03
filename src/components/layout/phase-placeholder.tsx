import type { LucideIcon } from "lucide-react-native";
import { Check } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

type PhasePlaceholderProps = {
  icon: LucideIcon;
  phase: string;
  title: string;
  description: string;
  bullets: string[];
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Honest "this module is not built yet" surface. It is used only where the
 * feature genuinely lands in a later phase — it never pretends to be the real
 * screen, and its action always navigates somewhere that exists today.
 */
export function PhasePlaceholder({
  icon: Icon,
  phase,
  title,
  description,
  bullets,
  actionLabel,
  onAction,
}: PhasePlaceholderProps) {
  const { colors, radii } = useTheme();

  return (
    <Card style={styles.card}>
      <View
        style={[
          styles.iconTile,
          { backgroundColor: colors.primarySoft, borderRadius: radii.xl },
        ]}
      >
        <Icon size={30} color={colors.primary} />
      </View>

      <Badge label={phase} tone="primary" />

      <Text variant="heading" align="center">
        {title}
      </Text>

      <Text variant="bodySmall" align="center" style={styles.description}>
        {description}
      </Text>

      <View style={styles.bullets}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.bullet}>
            <View style={[styles.bulletDot, { backgroundColor: colors.successBg }]}>
              <Check size={11} color={colors.success} strokeWidth={3} />
            </View>
            <Text variant="bodySmall" style={styles.bulletText}>
              {bullet}
            </Text>
          </View>
        ))}
      </View>

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  iconTile: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  description: {
    maxWidth: 320,
  },
  bullets: {
    alignSelf: "stretch",
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  bullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  bulletDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    flex: 1,
  },
});
