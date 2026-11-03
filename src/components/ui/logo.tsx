import { Image } from "react-native";
import { useTheme } from "@/theme";

/** Velora wordmark. Uses the light/dark brand assets from `assets/brand`. */
export function Logo({ width = 124, height = 32 }: { width?: number; height?: number }) {
  const { isDark } = useTheme();

  return (
    <Image
      source={
        isDark
          ? require("@/assets/brand/logo-dark.png")
          : require("@/assets/brand/logo.png")
      }
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="Velora"
      fadeDuration={0}
    />
  );
}
