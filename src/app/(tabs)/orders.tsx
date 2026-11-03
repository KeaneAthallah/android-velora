import { router } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { usePermissions } from "@/providers/auth-provider";
import { AppHeader } from "@/components/layout/app-header";
import { PhasePlaceholder } from "@/components/layout/phase-placeholder";
import { Screen, ScreenScroll } from "@/components/ui/screen";

export default function OrdersScreen() {
  const { has } = usePermissions();
  const canSeeProducts = has("products.view");

  return (
    <Screen>
      <AppHeader title="Orders" subtitle="Open tickets and kitchen flow" showAvatar />
      <ScreenScroll bottomPadding={28} contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <PhasePlaceholder
          icon={ClipboardList}
          phase="Phase 5"
          title="Order board is on the way"
          description="Open tabs, status changes, cancellation and the kitchen ticket flow arrive in the operations phase. No order actions are simulated here yet."
          bullets={[
            "Open tabs with table and channel context",
            "Forward-only status updates",
            "Kitchen tickets with station filtering",
            "Cancel with permission checks",
          ]}
          actionLabel={canSeeProducts ? "Browse products" : "Back to home"}
          onAction={() =>
            router.navigate(canSeeProducts ? "/products" : "/")
          }
        />
      </ScreenScroll>
    </Screen>
  );
}
