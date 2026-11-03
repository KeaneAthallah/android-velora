import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Building2, Check, ChevronDown, MapPin } from "lucide-react-native";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useToast } from "@/components/providers/toast";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { spacing, radii, useTheme } from "@/theme";
import type { Business, Outlet } from "@/api/types";

type TenantSwitcherProps = {
  /** Renders the trigger pill. Set to false when only the sheet is needed. */
  showTrigger?: boolean;
  visible?: boolean;
  onClose?: () => void;
};

/**
 * Business + outlet switcher. Changing the business reloads `/me` (the
 * subscription and permissions are per business); changing the outlet only
 * updates the `X-Outlet-Id` header and the queries that depend on it.
 */
export function TenantSwitcher({
  showTrigger = true,
  visible: controlledVisible,
  onClose,
}: TenantSwitcherProps) {
  const { colors, radii: themeRadii } = useTheme();
  const { session, switchBusiness } = useAuth();
  const { outlet, outlets, setOutlet } = useTenant();
  const { showToast } = useToast();

  const [internalVisible, setInternalVisible] = useState(false);
  const [switchingBusinessId, setSwitchingBusinessId] = useState<string | null>(null);

  const visible = controlledVisible ?? internalVisible;
  const close = () => {
    setInternalVisible(false);
    onClose?.();
  };
  const open = () => setInternalVisible(true);

  const businesses = session?.businesses ?? [];
  const activeBusinessId = session?.activeBusiness?.id ?? null;
  const canSwitchBusiness = businesses.length > 1;

  const handleBusiness = async (business: Business) => {
    if (business.id === activeBusinessId || switchingBusinessId) return;
    setSwitchingBusinessId(business.id);
    try {
      await switchBusiness(business.id);
      showToast(`Switched to ${business.name}`, "success");
      close();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not switch business.",
        "danger",
      );
    } finally {
      setSwitchingBusinessId(null);
    }
  };

  const handleOutlet = async (next: Outlet) => {
    await setOutlet(next.id);
    showToast(`Working at ${next.name}`, "success");
    close();
  };

  return (
    <>
      {showTrigger ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change business or outlet"
          onPress={open}
          style={({ pressed }) => [
            styles.trigger,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.full,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <View style={[styles.triggerDot, { backgroundColor: colors.primarySoft }]}>
            <Building2 size={14} color={colors.primary} />
          </View>
          <View style={styles.triggerText}>
            <Text variant="label" numberOfLines={1} style={styles.triggerTitle}>
              {session?.activeBusiness?.name ?? "No business"}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {outlet?.name ?? "No outlet"}
            </Text>
          </View>
          <ChevronDown size={15} color={colors.inkMuted} />
        </Pressable>
      ) : null}

      <Sheet
        visible={visible}
        onClose={close}
        title="Workspace"
        description="Choose the business and outlet you are working in."
      >
        {canSwitchBusiness ? (
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionLabel}>
              Business
            </Text>
            {businesses.map((business) => {
              const active = business.id === activeBusinessId;
              return (
                <Pressable
                  key={business.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  disabled={switchingBusinessId != null}
                  onPress={() => void handleBusiness(business)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.surfaceMuted,
                      borderRadius: themeRadii.md,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Building2
                    size={18}
                    color={active ? colors.primary : colors.inkMuted}
                  />
                  <View style={styles.rowText}>
                    <Text variant="body" numberOfLines={1}>
                      {business.name}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {business.roleName} · {business.currency}
                    </Text>
                  </View>
                  {switchingBusinessId === business.id ? (
                    <Text variant="caption">Switching…</Text>
                  ) : active ? (
                    <Check size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="label" style={styles.sectionLabel}>
            Outlet
          </Text>

          {outlets.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.surfaceMuted, borderRadius: themeRadii.md }]}>
              <Text variant="bodySmall" align="center">
                This business has no outlets yet. Add one from the Velora web app
                before selling.
              </Text>
            </View>
          ) : (
            outlets.map((item) => {
              const active = item.id === outlet?.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => void handleOutlet(item)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: active ? colors.primarySoft : colors.surfaceMuted,
                      borderRadius: themeRadii.md,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <MapPin size={18} color={active ? colors.primary : colors.inkMuted} />
                  <View style={styles.rowText}>
                    <Text variant="body" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {item.code ? `Code ${item.code}` : "No code"}
                      {item.status !== "active" ? ` · ${item.status}` : ""}
                    </Text>
                  </View>
                  {active ? <Check size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })
          )}
        </View>

        {session?.subscription ? (
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionLabel}>
              Plan
            </Text>
            <View style={styles.planRow}>
              <Badge
                label={session.subscription.planName ?? session.subscription.status}
                tone={session.subscription.isActive ? "primary" : "danger"}
              />
              <Text variant="caption">
                {session.subscription.isTrial && session.subscription.trialDaysRemaining > 0
                  ? `${session.subscription.trialDaysRemaining} trial days left`
                  : session.subscription.isActive
                    ? "Active"
                    : "Inactive"}
              </Text>
            </View>
          </View>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: 5,
    paddingRight: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    maxWidth: 250,
  },
  triggerDot: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerText: {
    flexShrink: 1,
  },
  triggerTitle: {
    color: "#3D3B4A",
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontSize: 11,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  empty: {
    padding: spacing.md,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
