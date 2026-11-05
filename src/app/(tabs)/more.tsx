import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  LogOut,
  Package,
  Plug,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { Href } from "expo-router";
import { useTheme } from "@/theme";
import { useAuth, usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkspace } from "@/api/endpoints/workspace";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Divider } from "@/components/ui/divider";
import { ListRow } from "@/components/ui/list-row";
import { SectionHeader } from "@/components/ui/section-header";
import { Text } from "@/components/ui/text";
import { TenantSwitcher } from "@/components/tenant/tenant-switcher";

type ModuleLink = {
  key: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** Omitted modules are always visible (Settings). */
  permission?: string;
  href: Href;
};

/** Mirrors the web sidebar's sections so the two apps read the same. */
const MODULE_GROUPS: { title: string; modules: ModuleLink[] }[] = [
  {
    title: "Operate",
    modules: [
      {
        key: "transactions",
        label: "Transactions",
        subtitle: "Receipts, totals and voids",
        icon: ReceiptText,
        permission: "sales.view",
        href: "/transactions",
      },
      {
        key: "tables",
        label: "Floor plan",
        subtitle: "Tables, areas and open tabs",
        icon: LayoutGrid,
        permission: "tables.view",
        href: "/tables",
      },
      {
        key: "kitchen",
        label: "Kitchen",
        subtitle: "Tickets and preparation",
        icon: ShoppingBag,
        permission: "kitchen.view",
        href: "/kitchen",
      },
      {
        key: "channels",
        label: "Channels",
        subtitle: "Marketplace and online orders",
        icon: Plug,
        permission: "channels.view",
        href: "/channels",
      },
      {
        key: "shifts",
        label: "Shifts",
        subtitle: "Registers and cash",
        icon: Wallet,
        permission: "shifts.view",
        href: "/shifts",
      },
    ],
  },
  {
    title: "Catalog & stock",
    modules: [
      {
        key: "products",
        label: "Products",
        subtitle: "Catalogue, search and details",
        icon: Package,
        permission: "products.view",
        href: "/products",
      },
      {
        key: "menu",
        label: "Menu",
        subtitle: "Availability and the 86 board",
        icon: UtensilsCrossed,
        permission: "menu.view",
        href: "/menu",
      },
      {
        key: "stock-transfers",
        label: "Stock transfers",
        subtitle: "Draft then complete between outlets",
        icon: ArrowLeftRight,
        permission: "inventory.view",
        href: "/stock-transfers",
      },
      {
        key: "inventory",
        label: "Inventory",
        subtitle: "Balances and adjustments",
        icon: Boxes,
        permission: "inventory.view",
        href: "/inventory",
      },
      {
        key: "stocktakes",
        label: "Stocktakes",
        subtitle: "Count stock and post variances",
        icon: ClipboardList,
        permission: "inventory.view",
        href: "/stocktakes",
      },
      {
        key: "recipes",
        label: "Recipes",
        subtitle: "Ingredient costing and yield",
        icon: ChefHat,
        permission: "recipes.view",
        href: "/recipes",
      },
      {
        key: "purchasing",
        label: "Purchasing",
        subtitle: "Purchase orders",
        icon: ShoppingCart,
        permission: "purchasing.view",
        href: "/purchasing",
      },
      {
        key: "suppliers",
        label: "Suppliers",
        subtitle: "Supply contacts and terms",
        icon: Truck,
        permission: "suppliers.view",
        href: "/suppliers",
      },
    ],
  },
  {
    title: "Relationships",
    modules: [
      {
        key: "customers",
        label: "Customers",
        subtitle: "Directory and profiles",
        icon: Users,
        permission: "customers.view",
        href: "/customers",
      },
      {
        key: "promotions",
        label: "Promotions",
        subtitle: "Discount codes and offers",
        icon: Tag,
        permission: "promotions.view",
        href: "/promotions",
      },
    ],
  },
  {
    title: "Analyze",
    modules: [
      {
        key: "reports",
        label: "Reports",
        subtitle: "Sales and stock",
        icon: BarChart3,
        permission: "reports.view",
        href: "/reports",
      },
    ],
  },
  {
    title: "Manage",
    modules: [
      {
        key: "team",
        label: "Team",
        subtitle: "Members, roles and access",
        icon: Users,
        permission: "employees.view",
        href: "/team",
      },
      {
        key: "settings",
        label: "Settings",
        subtitle: "Account, appearance and workspace",
        icon: Settings,
        href: "/settings",
      },
      {
        key: "subscription",
        label: "Subscription",
        subtitle: "Plan, usage limits and features",
        icon: CreditCard,
        href: "/subscription",
      },
    ],
  },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useAuth();
  const { has } = usePermissions();
  const { business, outlet, outlets } = useTenant();
  const { data: workspace } = useQuery({
    queryKey: ["workspace", business?.id],
    queryFn: fetchWorkspace,
    enabled: !!business?.id,
    staleTime: 5 * 60_000,
  });

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const user = session?.user;
  const subscription = session?.subscription;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
    } finally {
      setSigningOut(false);
    }
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <Screen>
      <AppHeader title="More" subtitle="Workspace, modules and account" showAvatar />

      <ScreenScroll bottomPadding={28} contentStyle={styles.content}>
        {user ? (
          <Card style={styles.profile}>
            <Avatar name={user.name} uri={user.avatarUrl} size={54} />
            <View style={styles.profileText}>
              <Text variant="title" numberOfLines={1}>
                {user.name}
              </Text>
              <Text variant="bodySmall" numberOfLines={1}>
                {user.email}
              </Text>
              <View style={styles.profileBadges}>
                <Badge
                  label={business?.roleName ?? "Member"}
                  tone="primary"
                />
                {user.isPlatformAdmin ? (
                  <Badge label="Platform admin" tone="info" />
                ) : null}
              </View>
            </View>
          </Card>
        ) : null}

        <View>
          <SectionHeader title="Workspace" />
          <Card style={styles.groupCard}>
            <View style={styles.workspaceRow}>
              <View style={styles.workspaceText}>
                <Text variant="caption">Business</Text>
                <Text variant="body" numberOfLines={1}>
                  {business?.name ?? "No business"}
                </Text>
              </View>
              <Building2 size={18} color={colors.inkMuted} />
            </View>

            <Divider />

            <View style={styles.workspaceRow}>
              <View style={styles.workspaceText}>
                <Text variant="caption">
                  {outlets.length > 1 ? `Outlet · ${outlets.length} available` : "Outlet"}
                </Text>
                <Text variant="body" numberOfLines={1}>
                  {outlet?.name ?? "No outlet selected"}
                </Text>
              </View>
              <Store size={18} color={colors.inkMuted} />
            </View>

            <Divider />

            <View style={styles.switchRow}>
              <Text variant="bodySmall" style={styles.switchText}>
                Switch the business or outlet you are working in.
              </Text>
              <TenantSwitcher />
            </View>
          </Card>
        </View>

        {subscription ? (
          <View>
            <SectionHeader title="Plan" />
            <Card style={styles.planCard}>
              <View style={styles.planTop}>
                <View style={styles.planText}>
                  <Text variant="title">
                    {subscription.planName ?? "Velora"}
                  </Text>
                  <Text variant="caption">
                    {subscription.isTrial
                      ? `${subscription.trialDaysRemaining} trial days left`
                      : subscription.isActive
                        ? "Subscription active"
                        : "Subscription inactive"}
                  </Text>
                </View>
                <Badge
                  label={subscription.isActive ? "Active" : subscription.status}
                  tone={subscription.isActive ? "success" : "danger"}
                />
              </View>

              <View style={[styles.planNote, { backgroundColor: colors.surfaceMuted }]}>
                <CreditCard size={15} color={colors.inkMuted} />
                <Text variant="caption" style={styles.planNoteText}>
                  Billing and plan changes stay in the Velora web app.
                </Text>
              </View>
            </Card>
          </View>
        ) : null}

        {MODULE_GROUPS.map((group) => {
          const modules = group.modules.filter((module) => {
            if (module.permission && !has(module.permission)) return false;
            const modKey = module.key.replace(/-/g, "_");
            if (workspace?.modules && workspace.modules[modKey] === false) return false;
            return true;
          });
          if (modules.length === 0) return null;

          return (
            <View key={group.title}>
              <SectionHeader title={group.title} />
              <Card style={styles.groupCard}>
                {modules.map((module, index) => (
                  <View key={module.key}>
                    {index > 0 ? <Divider /> : null}
                    <ListRow
                      icon={module.icon}
                      title={module.label}
                      subtitle={module.subtitle}
                      onPress={() => router.push(module.href)}
                    />
                  </View>
                ))}
              </Card>
            </View>
          );
        })}

        <View>
          <SectionHeader title="Account" />
          <Card style={styles.groupCard}>
            <ListRow
              icon={ShieldCheck}
              title="Role and permissions"
              subtitle={`${business?.roleName ?? "Member"} · ${
                has("platform.admin") ? "Platform admin" : "Workspace member"
              }`}
              disabled
            />
            <Divider />
            <ListRow
              icon={LogOut}
              title="Sign out"
              subtitle="End this session on the device"
              onPress={() => setConfirmSignOut(true)}
            />
          </Card>
        </View>

        <Text variant="caption" align="center">
          Velora POS · v{version}
        </Text>
      </ScreenScroll>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Sign out of Velora?"
        message="You will need your email and password to sign in again on this device."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        tone="danger"
        loading={signingOut}
        onConfirm={() => void handleSignOut()}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  groupCard: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  workspaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  workspaceText: {
    flex: 1,
    gap: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  switchText: {
    flex: 1,
  },
  planCard: {
    gap: 12,
  },
  planTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planText: {
    flex: 1,
    gap: 2,
  },
  planNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  planNoteText: {
    flex: 1,
  },
});
