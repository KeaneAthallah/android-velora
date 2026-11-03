import { View } from "react-native";
import { router } from "expo-router";
import { ReceiptText } from "lucide-react-native";
import { usePermissions } from "@/providers/auth-provider";
import { AppHeader } from "@/components/layout/app-header";
import { PhasePlaceholder } from "@/components/layout/phase-placeholder";
import { Screen, ScreenScroll } from "@/components/ui/screen";

export default function SalesScreen() {
  const { has } = usePermissions();
  const canSeeProducts = has("products.view");

  return (
    <Screen>
      <AppHeader title="Sell" subtitle="Point of sale" showAvatar />
      <ScreenScroll bottomPadding={28} contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <PhasePlaceholder
          icon={ReceiptText}
          phase="Phase 4"
          title="The register is next"
          description="Basket building, taxes, split payments and receipts land in the POS phase. The catalogue is already live, so you can check products and prices today."
          bullets={[
            "Search the catalogue and add variants",
            "Server-priced totals with tax and discounts",
            "Split payments with idempotent checkout",
            "Receipt with change and reprint",
          ]}
          actionLabel={canSeeProducts ? "Browse products" : "Back to home"}
          onAction={() =>
            router.navigate(canSeeProducts ? "/products" : "/")
          }
        />
        <View />
      </ScreenScroll>
    </Screen>
  );
}
