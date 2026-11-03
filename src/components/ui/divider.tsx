import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.root, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  root: {
    height: 1,
    alignSelf: "stretch",
  },
});
