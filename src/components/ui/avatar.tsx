import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./text";

type AvatarProps = {
  name: string;
  size?: number;
  uri?: string | null;
};

export function Avatar({ name, size = 40, uri }: AvatarProps) {
  const { colors } = useTheme();

  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primarySoft,
        },
      ]}
    >
      <Text
        style={{
          fontSize: size * 0.36,
          lineHeight: size * 0.46,
          color: colors.primary,
        }}
      >
        {letters}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
});
