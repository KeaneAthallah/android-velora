import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { radii, shadows, spacing, useTheme } from "@/theme";

export type ToastTone = "default" | "success" | "warning" | "danger";

type ToastState = {
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}

const TONE_ICONS = {
  default: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: TriangleAlert,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((message: string, tone: ToastTone = "default") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3_200);
    return () => clearTimeout(timeout);
  }, [toast]);

  const value = useMemo(
    () => ({ showToast, hideToast }),
    [showToast, hideToast],
  );

  const toneColor =
    toast?.tone === "success"
      ? colors.success
      : toast?.tone === "warning"
        ? colors.warning
        : toast?.tone === "danger"
          ? colors.danger
          : colors.info;

  const Icon = toast ? TONE_ICONS[toast.tone] : Info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          entering={FadeInDown.duration(180)}
          exiting={FadeOut.duration(140)}
          style={[styles.wrapper, { bottom: insets.bottom + 76 }]}
          pointerEvents="none"
          // Announce the message: without a live region every confirmation and
          // error would be silent for a screen-reader user.
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <View
            style={[
              styles.toast,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon size={18} color={toneColor} />
            <Text variant="bodySmall" color={colors.ink} style={styles.message}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: 520,
    ...shadows.card,
  },
  message: {
    flexShrink: 1,
  },
});
