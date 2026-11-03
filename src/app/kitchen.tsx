import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ChefHat } from "lucide-react-native";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useKitchenTickets, useUpdateKitchenTicketMutation } from "@/features/kitchen/use-kitchen";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export default function KitchenScreen() {
  const { colors } = useTheme();
  const { has } = useAuth();
  const ticketsQuery = useKitchenTickets();
  const updateMutation = useUpdateKitchenTicketMutation();
  const tickets = ticketsQuery.data ?? [];

  if (!has("kitchen.view")) {
    return (
      <Screen>
        <AppHeader title="Kitchen" subtitle="Tickets" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState forbidden title="Kitchen is not enabled for your role" message="A manager can grant kitchen view." />
        </View>
      </Screen>
    );
  }

  const nextStatus = (status: string): "preparing" | "ready" | "served" | null => {
    if (status === "queued") return "preparing";
    if (status === "preparing") return "ready";
    if (status === "ready") return "served";
    return null;
  };

  const labelFor = (status: string) => {
    if (status === "queued") return "Start";
    if (status === "preparing") return "Mark ready";
    if (status === "ready") return "Mark served";
    return null;
  };

  return (
    <Screen>
      <AppHeader title="Kitchen" subtitle={`${tickets.length} active tickets`} showAvatar />

      {ticketsQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={12} />
          ))}
        </View>
      ) : ticketsQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState message={ticketsQuery.error instanceof Error ? ticketsQuery.error.message : "Could not load tickets."} onRetry={() => void ticketsQuery.refetch()} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState icon={ChefHat} title="No active tickets" description="Fired orders appear here." />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={ticketsQuery.isRefetching && !ticketsQuery.isLoading}
              onRefresh={() => void ticketsQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const ns = nextStatus(item.status);
            const lbl = labelFor(item.status);
            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text variant="title">{item.ticketNumber}</Text>
                    <Text variant="caption">
                      {item.stationName} · {item.orderNumber}
                      {item.table ? ` · ${item.table}` : ""}
                    </Text>
                  </View>
                  <Badge
                    label={item.status}
                    tone={item.status === "ready" ? "success" : item.status === "preparing" ? "warning" : "neutral"}
                  />
                </View>
                {Array.isArray(item.items) ? (
                  <View style={styles.items}>
                    {(item.items as { product_name?: string; quantity?: number }[]).map((line, idx) => (
                      <Text key={idx} variant="bodySmall">
                        {line.quantity ?? 1}× {line.product_name ?? "Item"}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Text variant="caption">{formatDateTime(item.createdAt)}</Text>
                {has("kitchen.manage") && ns && lbl ? (
                  <Button
                    label={updateMutation.isPending ? "Updating…" : lbl}
                    onPress={() => void updateMutation.mutateAsync({ id: item.id, status: ns })}
                    loading={updateMutation.isPending}
                    disabled={updateMutation.isPending}
                    fullWidth
                  />
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowText: { flex: 1, gap: 2 },
  items: { gap: 2 },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { padding: 16, gap: 10 },
});