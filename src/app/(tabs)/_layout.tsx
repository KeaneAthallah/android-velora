import { useState } from "react";
import { Tabs } from "expo-router/js-tabs";
import { Building2 } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth, usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { TabBar } from "@/components/layout/tab-bar";
import { EmptyWorkspace } from "@/components/layout/empty-workspace";

/**
 * Bottom-tab tree. The tab set is permission-filtered: a tab whose API
 * permission the member lacks is removed from the navigator (not merely
 * hidden), so deep links cannot land on it either.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { session, signOut } = useAuth();
  const { business, outlets, isLoading, refresh } = useTenant();

  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (!business) {
    return (
      <EmptyWorkspace
        icon={Building2}
        title="No workspace yet"
        description={
          session
            ? `${session.user.name}, your account is not linked to a business.`
            : "Your account is not linked to a business."
        }
        hint="Create a business and its first outlet in the Velora web app, then pull to refresh here."
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
    );
  }

  if (!isLoading && outlets.length === 0) {
    return (
      <EmptyWorkspace
        icon={Building2}
        title="No outlet in this business"
        description={`${business.name} has no outlets yet, so there is no store to operate.`}
        hint="Add an outlet in the Velora web app, then refresh to pick it up."
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />
    );
  }

  const canSell = has(["sales.create", "sales.view"]);
  const canSeeOrders = has("orders.view");
  const canSeeProducts = has("products.view");

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />

      <Tabs.Protected guard={canSell}>
        <Tabs.Screen name="sales" options={{ title: "Sell" }} />
      </Tabs.Protected>

      <Tabs.Protected guard={canSeeOrders}>
        <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      </Tabs.Protected>

      <Tabs.Protected guard={canSeeProducts}>
        <Tabs.Screen name="products" options={{ title: "Products" }} />
      </Tabs.Protected>

      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
