import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme";
import { useAuth, usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
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

type UpcomingModule = {
  key: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  permission: string;
  phase: string;
};

const UPCOMING: UpcomingModule[] = [
  {
    key: "orders",
    label: "Orders",
    subtitle: "Open tabs, status and kitchen flow",
    icon: ClipboardList,
    permission: "orders.view",
    phase: "Phase 5",
  },
  {
    key: "kitchen",
    label: "Kitchen",
    subtitle: "Stations, tickets and preparation",
    icon: ShoppingBag,
    permission: "kitchen.view",
    phase: "Phase 5",
  },
  {
    key: "inventory",
    label: "Inventory",
    subtitle: "Balances, movements and transfers",
    icon: Package,
    permission: "inventory.view",
    phase: "Phase 5",
  },
  {
    key: "customers",
    label: "Customers",
    subtitle: "Directory, search and profiles",
    icon: Users,
    permission: "customers.view",
    phase: "Phase 5",
  },
  {
    key: "purchasing",
    label: "Purchasing",
    subtitle: "Suppliers, purchase orders and receiving",
    icon: Truck,
    permission: "purchasing.view",
    phase: "Phase 5",
  },
  {
    key: "shifts",
    label: "Shifts",
    subtitle: "Registers, opening and cash movements",
    icon: Wallet,
    permission: "shifts.view",
    phase: "Phase 5",
  },
  {
    key: "reports",
    label: "Reports",
    subtitle: "Sales, product and stock reports",
    icon: BarChart3,
    permission: "reports.view",
    phase: "Phase 6",
  },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useAuth();
  const { has } = usePermissions();
  const { business, outlet, outlets } = useTenant();

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const user = session?.user;
  const subscription = session?.subscription;

  const upcoming = UPCOMING.filter((module) => has(module.permission));

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

        <View>
          <SectionHeader title="Modules" />
          <Card style={styles.groupCard}>
            {has("products.view") ? (
              <>
                <ListRow
                  icon={Package}
                  title="Products"
                  subtitle="Catalogue, search and details"
                  onPress={() => router.navigate("/products")}
                />
                <Divider />
              </>
            ) : null}

            <ListRow
              icon={Settings}
              title="Settings"
              subtitle="Account, appearance and workspace"
              onPress={() => router.push("/settings")}
            />
          </Card>
        </View>

        {upcoming.length > 0 ? (
          <View>
            <SectionHeader title="Coming next" />
            <Card style={styles.groupCard}>
              {upcoming.map((module, index) => (
                <View key={module.key}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    icon={module.icon}
                    title={module.label}
                    subtitle={module.subtitle}
                    right={<Badge label={module.phase} tone="neutral" />}
                    disabled
                  />
                </View>
              ))}
            </Card>
            <Text variant="caption" style={styles.comingNote}>
              These modules are not implemented yet — they are listed so the
              roadmap is visible, and they do not open a screen.
            </Text>
          </View>
        ) : null}

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
  comingNote: {
    marginTop: 6,
    marginHorizontal: 2,
  },
});
