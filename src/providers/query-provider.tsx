import { useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { ApiError } from "@/api/client";

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.code === "API_NOT_CONFIGURED") return false;
    if (error.status != null && error.status >= 400 && error.status < 500) {
      return false;
    }
  }
  return failureCount < 2;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
        staleTime: 30_000,
        gcTime: 10 * 60 * 1_000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// React Native does not expose navigator.onLine / window focus, so wire
// TanStack Query's online and focus managers to their native equivalents.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  }),
);

function handleAppState(status: string | null | undefined) {
  focusManager.setFocused(status === "active");
}

const queryClient = createQueryClient();

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    handleAppState(AppState.currentState);
    const subscription = AppState.addEventListener("change", handleAppState);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
