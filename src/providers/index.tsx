import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/theme";
import { ToastProvider } from "@/components/providers/toast";
import { AuthProvider } from "@/providers/auth-provider";
import { TenantProvider } from "@/providers/tenant-provider";
import { OfflineProvider } from "@/providers/offline-provider";

/**
 * Provider order matters:
 * Query (network cache) → Theme (tokens + fonts) → Toast (needs insets/theme)
 * → Auth (needs the query client) → Tenant (needs the session and permissions).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TenantProvider>
              <OfflineProvider>{children}</OfflineProvider>
            </TenantProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
