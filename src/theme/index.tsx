import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { dark, light } from "./tokens";

export { dark, light };

export type ThemeScheme = "light" | "dark";
export type SchemeMode = ThemeScheme | "system";
export type ThemeColors = typeof light;

export type FontFamily = {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;
  mono: string;
};

export type Theme = {
  colors: ThemeColors;
  fonts: FontFamily;
  radii: typeof radii;
  spacing: typeof spacing;
  shadows: typeof shadows;
  scheme: ThemeScheme;
  isDark: boolean;
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#141623",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: "#141623",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  sheet: {
    shadowColor: "#08060f",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

export const fonts: FontFamily = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }) as string,
};

const THEME_MODE_KEY = "velora.theme.mode";

type ThemeContextValue = {
  theme: Theme;
  scheme: ThemeScheme;
  schemeMode: SchemeMode;
  isReady: boolean;
  setSchemeMode: (mode: SchemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useSchemeMode(): {
  schemeMode: SchemeMode;
  setSchemeMode: (mode: SchemeMode) => void;
} {
  const { schemeMode, setSchemeMode } = useThemeContext();
  return { schemeMode, setSchemeMode };
}

/** Fonts (and therefore the brand type scale) are ready to render. */
export function useThemeReady(): boolean {
  return useThemeContext().isReady;
}

function resolveScheme(
  mode: SchemeMode,
  system: ThemeScheme | null | undefined,
): ThemeScheme {
  if (mode === "system") return system === "dark" ? "dark" : "light";
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [schemeMode, setSchemeModeState] = useState<SchemeMode>("system");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_MODE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setSchemeModeState(stored);
        }
      })
      .catch(() => {
        /* default to system */
      });
    return () => {
      active = false;
    };
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: PlusJakartaSans_400Regular,
    [fonts.medium]: PlusJakartaSans_500Medium,
    [fonts.semibold]: PlusJakartaSans_600SemiBold,
    [fonts.bold]: PlusJakartaSans_700Bold,
    [fonts.extrabold]: PlusJakartaSans_800ExtraBold,
  });
  const fontsReady = fontsLoaded || fontError != null;

  const scheme = resolveScheme(schemeMode, system);
  const colors = scheme === "dark" ? dark : light;

  const setSchemeMode = useCallback((next: SchemeMode) => {
    setSchemeModeState(next);
    AsyncStorage.setItem(THEME_MODE_KEY, next).catch(() => {});
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => {});
  }, [colors.canvas]);

  const theme = useMemo<Theme>(
    () => ({
      colors,
      fonts,
      radii,
      spacing,
      shadows,
      scheme,
      isDark: scheme === "dark",
    }),
    [colors, scheme],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      scheme,
      schemeMode,
      isReady: fontsReady,
      setSchemeMode,
    }),
    [theme, scheme, schemeMode, fontsReady, setSchemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
