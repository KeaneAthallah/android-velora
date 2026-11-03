import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import {
  Building2,
  CreditCard,
  LogOut,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme, useSchemeMode, type SchemeMode } from "@/theme";
import { API_BASE_URL, API_CONFIGURED } from "@/config/env";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { formatDate } from "@/lib/format";
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

const MODES: { value: SchemeMode; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function SettingsScreen() {
  const { colors, radii } = useTheme();
  const { schemeMode, setSchemeMode } = useSchemeMode();
  const { session, signOut } = useAuth();
  const { business, outlet, outlets } = useTenant();

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
      <AppHeader showBack title="Settings" subtitle="Account and workspace" />

      <ScreenScroll bottomPadding={32} contentStyle={styles.content}>
        {user ? (
          <Card style={styles.profile}>
            <Avatar name={user.name} uri={user.avatarUrl} size={52} />
            <View style={styles.profileText}>
              <Text variant="title" numberOfLines={1}>
                {user.name}
              </Text>
              <Text variant="bodySmall" numberOfLines={1}>
                {user.email}
              </Text>
              <View style={styles.badges}>
                <Badge label={business?.roleName ?? "Member"} tone="primary" />
                {user.isPlatformAdmin ? (
                  <Badge label="Platform admin" tone="info" />
                ) : null}
              </View>
            </View>
          </Card>
        ) : null}

        <View>
          <SectionHeader title="Appearance" />
          <Card style={styles.appearance}>
            <Text variant="bodySmall">
              Choose how Velora looks on this device. System follows Android’s
              light and dark setting.
            </Text>

            <View
              style={[
                styles.segments,
                { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
              ]}
            >
              {MODES.map((mode) => {
                const active = schemeMode === mode.value;
                const Icon = mode.icon;
                return (
                  <Pressable
                    key={mode.value}
                    accessibilityRole="button"
                    accessibilityLabel={mode.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSchemeMode(mode.value)}
                    style={[
                      styles.segment,
                      active
                        ? {
                            backgroundColor: colors.surface,
                            borderRadius: radii.sm,
                            borderColor: colors.border,
                          }
                        : null,
                    ]}
                  >
                    <Icon
                      size={16}
                      color={active ? colors.primary : colors.inkMuted}
                    />
                    <Text
                      variant="bodySmall"
                      color={active ? colors.ink : colors.inkMuted}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Workspace" />
          <Card style={styles.groupCard}>
            <ListRow
              icon={Building2}
              title={business?.name ?? "No business"}
              subtitle={`${business?.roleName ?? "Member"} · ${business?.currency ?? "—"}`}
              disabled
            />
            <Divider />
            <ListRow
              icon={Building2}
              title={outlet?.name ?? "No outlet selected"}
              subtitle={
                outlets.length > 1
                  ? `${outlets.length} outlets available`
                  : "Current outlet"
              }
              disabled
            />
            <Divider />
            <View style={styles.switchRow}>
              <Text variant="bodySmall" style={styles.switchText}>
                Switch the active business or outlet.
              </Text>
              <TenantSwitcher />
            </View>
          </Card>
        </View>

        {subscription ? (
          <View>
            <SectionHeader title="Subscription" />
            <Card style={styles.groupCard}>
              <ListRow
                icon={CreditCard}
                title={subscription.planName ?? "Velora"}
                subtitle={
                  subscription.isTrial
                    ? `Trial · ${subscription.trialDaysRemaining} days left`
                    : subscription.isActive
                      ? "Active subscription"
                      : subscription.status
                }
                right={
                  <Badge
                    label={subscription.isActive ? "Active" : "Inactive"}
                    tone={subscription.isActive ? "success" : "danger"}
                  />
                }
                disabled
              />
              {subscription.isTrial && subscription.trialEndsAt ? (
                <>
                  <Divider />
                  <View style={styles.metaRow}>
                    <Text variant="caption">Trial ends</Text>
                    <Text variant="caption">
                      {formatDate(subscription.trialEndsAt)}
                    </Text>
                  </View>
                </>
              ) : null}
              <Divider />
              <View style={styles.metaRow}>
                <Text variant="caption">
                  Plan and billing changes live in the Velora web app.
                </Text>
              </View>
            </Card>
          </View>
        ) : null}

        <View>
          <SectionHeader title="Account" />
          <Card style={styles.groupCard}>
            <ListRow
              icon={ShieldCheck}
              title="Security"
              subtitle="Password changes stay in the web app for now"
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

        <View>
          <SectionHeader title="About" />
          <Card style={styles.about}>
            <View style={styles.metaRow}>
              <Text variant="caption">App version</Text>
              <Text variant="caption">{version}</Text>
            </View>
            <Divider />
            <View style={styles.metaRow}>
              <Text variant="caption">API</Text>
              <Text variant="caption" numberOfLines={1} style={styles.apiValue}>
                {API_CONFIGURED ? API_BASE_URL : "Not configured"}
              </Text>
            </View>
          </Card>
        </View>
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
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  appearance: {
    gap: 12,
  },
  segments: {
    flexDirection: "row",
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "transparent",
  },
  groupCard: {
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  apiValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  about: {
    paddingVertical: 2,
    paddingHorizontal: 12,
  },
});
