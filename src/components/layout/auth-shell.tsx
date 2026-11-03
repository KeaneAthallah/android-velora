import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScreenScroll } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Shared layout for sign-in and registration. */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas, paddingTop: insets.top + 20 }]}>
      <ScreenScroll
        bottomPadding={insets.bottom + 28}
        contentStyle={styles.content}
      >
        <View style={styles.brandRow}>
          <Logo width={112} height={29} />
          <Badge label={eyebrow} tone="primary" />
        </View>

        <View style={styles.heading}>
          <Text variant="display">{title}</Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>

        <Card style={styles.card}>{children}</Card>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    gap: 22,
    paddingTop: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heading: {
    gap: 6,
  },
  subtitle: {
    maxWidth: 360,
  },
  card: {
    gap: 14,
    padding: 18,
  },
  footer: {
    alignItems: "center",
    gap: 10,
  },
});
