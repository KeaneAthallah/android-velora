import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Compass } from "lucide-react-native";
import { useTheme } from "@/theme";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.root}>
        <EmptyState
          icon={Compass}
          title="This screen does not exist"
          description="The link points somewhere the mobile app has not built yet."
          actionLabel="Back to Velora"
          onAction={() => router.replace("/")}
        />
        <Text variant="caption" align="center" color={colors.inkMuted}>
          If you followed a deep link, check that the workspace is set up.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
});
