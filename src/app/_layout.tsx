import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/providers";
import { useTheme, useThemeReady } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { OfflineBanner } from "@/components/layout/offline-banner";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* the splash may already be hidden in a fast refresh */
});

function RootNavigator() {
  const { status } = useAuth();
  const themeReady = useThemeReady();
  const { colors, isDark } = useTheme();

  const booting = status === "loading" || !themeReady;

  useEffect(() => {
    if (!booting) {
      SplashScreen.hideAsync().catch(() => {
        /* already hidden */
      });
    }
  }, [booting]);

  if (booting) {
    // The native splash stays up until the stored token and the brand fonts
    // have both resolved, so the first frame is never a half-themed shell.
    return null;
  }

  const authenticated = status === "authenticated";

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {authenticated ? <OfflineBanner /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Protected guard={authenticated} redirectTo="/login">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="products/[id]"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="checkout"
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="receipt/[id]"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="order/[id]"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="order/checkout"
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="inventory"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="transactions"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="menu"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="tables"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="suppliers"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="promotions"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="stock-transfers"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="stocktakes"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="recipes"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="team"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="channels"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="subscription"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="kitchen"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="customers"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="purchasing"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="shifts"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="reports"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="settings"
            options={{ animation: "slide_from_right" }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!authenticated} redirectTo="/">
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Providers>
          <RootNavigator />
        </Providers>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
