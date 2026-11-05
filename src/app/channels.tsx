import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Plug } from "lucide-react-native";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import {
  useChannels,
  useSetChannelActiveMutation,
} from "@/features/channels/use-channels";
import { formatDateTime } from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import type { SalesChannel } from "@/api/types";

function kindLabel(kind: string) {
  return kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, " ");
}

export default function ChannelsScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { outlets } = useTenant();
  const channelsQuery = useChannels();
  const toggleMutation = useSetChannelActiveMutation();

  const [detail, setDetail] = useState<SalesChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outletName = useMemo(() => {
    const lookup = new Map(outlets.map((outlet) => [outlet.id, outlet.name]));
    return (id: string | null) =>
      id ? lookup.get(id) ?? `Outlet #${id}` : "All outlets";
  }, [outlets]);

  if (!has("channels.view")) {
    return (
      <Screen>
        <AppHeader title="Channels" subtitle="Marketplace orders" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Channels not enabled for your role"
            message="A manager can grant channels view."
          />
        </View>
      </Screen>
    );
  }

  const channels = channelsQuery.data ?? [];
  const canManage = has("channels.manage");

  const toggle = async (channel: SalesChannel) => {
    setError(null);
    try {
      const updated = await toggleMutation.mutateAsync({
        channel,
        active: !channel.active,
      });
      setDetail(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the channel.");
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Channels"
        subtitle={`${channels.length} ${channels.length === 1 ? "channel" : "channels"}`}
        showBack
      />

      {channelsQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} height={92} radius={12} />
          ))}
        </View>
      ) : channelsQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              channelsQuery.error instanceof Error
                ? channelsQuery.error.message
                : "Could not load channels."
            }
            onRetry={() => void channelsQuery.refetch()}
          />
        </View>
      ) : channels.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={Plug}
            title="No channels connected"
            description="Marketplace and online ordering channels are created in the web app; their orders land here."
          />
        </View>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(channel) => channel.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={channelsQuery.isRefetching && !channelsQuery.isLoading}
              onRefresh={() => void channelsQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name}`}
              onPress={() => {
                setError(null);
                setDetail(item);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Card style={styles.row}>
                <View style={styles.rowTop}>
                  <Text variant="body" numberOfLines={1} style={styles.rowName}>
                    {item.name}
                  </Text>
                  <Badge
                    label={item.active ? "Live" : "Offline"}
                    tone={item.active ? "success" : "neutral"}
                  />
                </View>
                <Text variant="caption">
                  {kindLabel(item.kind)}
                  {item.code ? ` · ${item.code}` : ""} ·{" "}
                  {outletName(item.outletId)}
                </Text>
                <Text variant="caption" color={colors.inkSecondary}>
                  {Number(item.commissionPercent)}% commission ·{" "}
                  {item.autoAccept ? "auto-accept" : "manual accept"}
                  {item.lastOrderAt
                    ? ` · last order ${formatDateTime(item.lastOrderAt)}`
                    : ""}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? kindLabel(detail.kind) : undefined}
      >
        {detail ? (
          <View style={styles.sheetBody}>
            <Card padded={false} style={styles.sheetCard}>
              <View style={styles.sheetRow}>
                <Text variant="label">Status</Text>
                <Badge
                  label={detail.active ? "Live" : "Offline"}
                  tone={detail.active ? "success" : "neutral"}
                />
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">Code</Text>
                <Text variant="body">{detail.code || "Not set"}</Text>
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">Outlet</Text>
                <Text variant="body">{outletName(detail.outletId)}</Text>
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">Commission</Text>
                <Text variant="body">{Number(detail.commissionPercent)}%</Text>
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">Orders</Text>
                <Text variant="body">
                  {detail.autoAccept ? "Auto-accept" : "Confirm by hand"} ·{" "}
                  {detail.prepBufferMinutes} min prep buffer
                </Text>
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">Payment</Text>
                <Text variant="body">
                  {detail.paymentMethodCode || "Default method"}
                </Text>
              </View>
              <Divider />
              <View style={styles.sheetRow}>
                <Text variant="label">Webhook</Text>
                <Text variant="bodySmall" style={styles.sheetValue} numberOfLines={2}>
                  {detail.webhookUrl ?? "Not provisioned"}
                </Text>
              </View>
              {detail.lastOrderAt ? (
                <>
                  <Divider />
                  <View style={styles.sheetRow}>
                    <Text variant="label">Last order</Text>
                    <Text variant="body">{formatDateTime(detail.lastOrderAt)}</Text>
                  </View>
                </>
              ) : null}
            </Card>

            {error ? (
              <Text variant="caption" color={colors.danger}>
                {error}
              </Text>
            ) : null}

            {canManage ? (
              <Button
                label={
                  toggleMutation.isPending
                    ? "Saving…"
                    : detail.active
                      ? "Take channel offline"
                      : "Bring channel online"
                }
                variant={detail.active ? "secondary" : "primary"}
                onPress={() => void toggle(detail)}
                loading={toggleMutation.isPending}
                disabled={toggleMutation.isPending}
                fullWidth
              />
            ) : (
              <Text variant="caption">
                Taking a channel offline needs channels.manage.
              </Text>
            )}

            <Text variant="caption">
              Menu mappings, the webhook secret and inbound order handling stay in
              the web app.
            </Text>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 10 },
  row: { gap: 4 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowName: { flex: 1 },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  sheetBody: { gap: 12, paddingBottom: 8 },
  sheetCard: { paddingVertical: 2 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sheetValue: { flex: 1, textAlign: "right" },
});
