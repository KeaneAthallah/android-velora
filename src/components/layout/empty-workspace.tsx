import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Logo } from "@/components/ui/logo";

type EmptyWorkspaceProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  hint: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onSignOut: () => void;
  signingOut?: boolean;
};

/**
 * Shown when an authenticated account cannot use the tabs yet: no business
 * membership, or a business that has no outlets. The mobile app does not
 * create workspaces (that stays in the web onboarding flow), but it offers a
 * real refresh and a real sign out instead of a dead end.
 */
export function EmptyWorkspace({
  icon: Icon,
  title,
  description,
  hint,
  onRefresh,
  refreshing = false,
  onSignOut,
  signingOut = false,
}: EmptyWorkspaceProps) {
  const { colors, radii } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.canvas,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <Logo width={110} height={28} />

      <Card style={styles.card}>
        <View
          style={[
            styles.iconTile,
            { backgroundColor: colors.primarySoft, borderRadius: radii.xl },
          ]}
        >
          <Icon size={28} color={colors.primary} />
        </View>

        <Text variant="heading" align="center">
          {title}
        </Text>
        <Text variant="bodySmall" align="center">
          {description}
        </Text>
        <Text variant="caption" align="center" style={styles.hint}>
          {hint}
        </Text>

        <View style={styles.actions}>
          {onRefresh ? (
            <Button
              label="Refresh"
              onPress={onRefresh}
              variant="secondary"
              loading={refreshing}
              fullWidth
            />
          ) : null}
          <Button
            label="Sign out"
            onPress={onSignOut}
            variant="ghost"
            loading={signingOut}
            fullWidth
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 24,
  },
  card: {
    gap: 10,
    paddingVertical: 24,
    alignItems: "center",
  },
  iconTile: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  hint: {
    maxWidth: 300,
    marginTop: 2,
  },
  actions: {
    alignSelf: "stretch",
    gap: 8,
    marginTop: 12,
  },
});
