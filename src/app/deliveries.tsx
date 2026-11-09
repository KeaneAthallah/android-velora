import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Truck } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenScroll } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/components/providers/toast";
import { errorMessage } from "@/api/client";
import {
  fetchDeliveryBoard,
  updateDeliveryStatus,
  type DeliveryStatus,
} from "@/api/endpoints/deliveries";

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pending: "assigned",
  scheduled: "assigned",
  assigned: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};

function tone(status: DeliveryStatus): BadgeTone {
  if (status === "delivered") return "success";
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "in_transit" || status === "picked_up") return "info";
  return "warning";
}

export default function DeliveriesScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();
  const { business } = useTenant();
  const currency = business?.currency ?? "IDR";
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const canManage = has("deliveries.manage");

  const board = useQuery({
    queryKey: ["deliveries", "board"],
    queryFn: () => fetchDeliveryBoard(),
    refetchInterval: 30_000,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeliveryStatus }) =>
      updateDeliveryStatus(id, status),
    onSuccess: (_data, variables) => {
      showToast(`Delivery marked ${variables.status.replace(/_/g, " ")}`, "success");
      queryClient.invalidateQueries({ queryKey: ["deliveries", "board"] });
    },
    onError: (error) => showToast(errorMessage(error), "danger"),
  });

  const activeColumns = useMemo(
    () => (board.data?.columns ?? []).filter((column) => column.deliveries.length > 0),
    [board.data],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <AppHeader
        title="Deliveries"
        subtitle={
          board.data
            ? `${board.data.totals.count} jobs · ${board.data.totals.unassigned} unassigned`
            : "Dispatch board"
        }
        showBack
      />

      <ScreenScroll
        refreshing={board.isRefetching}
        onRefresh={() => board.refetch()}
      >
        {board.isPending ? (
          <View style={{ gap: 10 }}>
            <Skeleton height={90} />
            <Skeleton height={90} />
          </View>
        ) : board.isError ? (
          <ErrorState
            title="Could not load deliveries"
            message="Check the connection and try again."
            onRetry={() => board.refetch()}
          />
        ) : activeColumns.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No deliveries today"
            description="Delivery orders from the storefront or a delivery sale appear here."
          />
        ) : (
          <View style={{ gap: 18 }}>
            <Card>
              <View style={styles.totals}>
                <Total label="Jobs" value={String(board.data?.totals.count ?? 0)} />
                <Total label="Delivered" value={String(board.data?.totals.delivered ?? 0)} />
                <Total label="Fees" value={formatMoney(board.data?.totals.fees ?? 0, currency)} />
              </View>
            </Card>

            {activeColumns.map((column) => (
              <View key={column.status} style={{ gap: 10 }}>
                <Text variant="title" style={styles.sectionTitle}>
                  {column.label} · {column.deliveries.length}
                </Text>
                {column.deliveries.map((delivery) => {
                  const next = NEXT_STATUS[delivery.status];
                  return (
                    <Card key={delivery.id}>
                      <View style={styles.row}>
                        <Text variant="title" style={{ flex: 1 }}>
                          {delivery.number}
                        </Text>
                        <Badge label={delivery.status.replace(/_/g, " ")} tone={tone(delivery.status)} />
                      </View>
                      <Text variant="bodySmall" color={colors.inkMuted}>
                        {delivery.recipientName}
                        {delivery.address ? ` · ${delivery.address}` : ""}
                      </Text>
                      <Text variant="bodySmall" color={colors.inkMuted}>
                        {delivery.driverName ?? "No driver"} · {formatMoney(delivery.fee, currency)}
                      </Text>
                      {canManage && next ? (
                        <Button
                          label={`Mark ${next.replace(/_/g, " ")}`}
                          size="sm"
                          variant="secondary"
                          loading={advance.isPending}
                          onPress={() => advance.mutate({ id: delivery.id, status: next })}
                        />
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScreenScroll>
    </View>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" color={colors.inkMuted}>
        {label}
      </Text>
      <Text variant="title">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  totals: { flexDirection: "row", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { marginBottom: 2 },
});
