import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Truck } from "lucide-react-native";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import {
  usePurchaseOrders,
  useApprovePoMutation,
  useReceivePoMutation,
} from "@/features/purchasing/use-purchasing";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

export default function PurchasingScreen() {
  const { colors } = useTheme();
  const { has } = useAuth();

  const posQuery = usePurchaseOrders();
  const approveMutation = useApprovePoMutation();
  const receiveMutation = useReceivePoMutation();

  const pos = posQuery.data ?? [];

  if (!has("purchasing.view")) {
    return (
      <Screen>
        <AppHeader title="Purchasing" subtitle="Purchase orders" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState forbidden title="Purchasing not enabled for your role" message="A manager can grant purchasing view." />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Purchasing" subtitle={`${pos.length} purchase orders`} showAvatar />

      {posQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={96} radius={12} />
          ))}
        </View>
      ) : posQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState message={posQuery.error instanceof Error ? posQuery.error.message : "Could not load."} onRetry={() => void posQuery.refetch()} />
        </View>
      ) : pos.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState icon={Truck} title="No purchase orders" description="Create purchase orders in the Velora web app." />
        </View>
      ) : (
        <FlatList
          data={pos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={posQuery.isRefetching && !posQuery.isLoading}
              onRefresh={() => void posQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => {
            const canManage = has("purchasing.manage");
            const canApprove = canManage && (item.status === "draft" || item.status === "submitted");
            const canReceive = canManage && (item.status === "approved" || item.status === "partially_received");
            const remaining = item.items.filter(
              (line) => Number(line.quantity) > Number(line.receivedQuantity),
            );
            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text variant="title" numberOfLines={1}>{item.poNumber}</Text>
                    <Text variant="caption">
                      {item.supplierName} · {formatDateTime(item.createdAt)}
                    </Text>
                  </View>
                  <Badge
                    label={item.status}
                    tone={item.status === "completed" ? "success" : item.status === "approved" ? "warning" : "neutral"}
                  />
                </View>
                <Text variant="caption">{item.items.length} lines</Text>
                {canApprove ? (
                  <Button
                    label={approveMutation.isPending ? "Approving…" : "Approve"}
                    onPress={() => void approveMutation.mutateAsync(item.id)}
                    loading={approveMutation.isPending}
                    disabled={approveMutation.isPending}
                    fullWidth
                    size="sm"
                  />
                ) : null}
                {canReceive && remaining.length > 0 ? (
                  <Button
                    label={receiveMutation.isPending ? "Receiving…" : "Receive all"}
                    variant="secondary"
                    onPress={() =>
                      void receiveMutation.mutateAsync({
                        id: item.id,
                        items: remaining.map((line) => ({
                          purchaseOrderItemId: line.id,
                          quantity: String(
                            Number(line.quantity) - Number(line.receivedQuantity),
                          ),
                        })),
                      })
                    }
                    loading={receiveMutation.isPending}
                    disabled={receiveMutation.isPending}
                    fullWidth
                    size="sm"
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
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { padding: 16, gap: 10 },
});