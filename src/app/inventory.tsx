import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Package, Plus } from "lucide-react-native";
import { formatQuantity } from "@/lib/format";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useInventoryBalances, useAdjustStockMutation } from "@/features/inventory/use-inventory";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { has } = useAuth();

  const balancesQuery = useInventoryBalances();
  const adjustMutation = useAdjustStockMutation();

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balances = balancesQuery.data ?? [];

  const adjusting = balances.find((b) => b.id === adjustingId) ?? null;

  if (!has("inventory.view")) {
    return (
      <Screen>
        <AppHeader title="Inventory" subtitle="Stock balances" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Inventory is not enabled for your role"
            message="A manager can grant you the inventory view permission."
          />
        </View>
      </Screen>
    );
  }

  const openAdjust = (id: string) => {
    setAdjustingId(id);
    setQuantity("");
    setReason("");
    setError(null);
  };

  const closeAdjust = () => {
    if (adjustMutation.isPending) return;
    setAdjustingId(null);
  };

  const submitAdjust = async () => {
    if (!adjusting) return;
    const value = Number(quantity);
    if (!Number.isFinite(value) || value === 0) {
      setError("Enter a non-zero quantity (use negative to remove).");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Reason is required.");
      return;
    }
    setError(null);
    try {
      await adjustMutation.mutateAsync({
        productId: adjusting.productId,
        variantId: adjusting.variantId,
        quantity: value,
        reason: reason.trim(),
      });
      setAdjustingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed.");
    }
  };

  return (
    <Screen>
      <AppHeader title="Inventory" subtitle={`${balances.length} balances`} showAvatar />

      {balancesQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={72} radius={12} />
          ))}
        </View>
      ) : balancesQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={balancesQuery.error instanceof Error ? balancesQuery.error.message : "Could not load balances."}
            onRetry={() => void balancesQuery.refetch()}
          />
        </View>
      ) : balances.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={Package}
            title="No stock balances yet"
            description="Balances appear once products are received or adjusted."
          />
        </View>
      ) : (
        <FlatList
          data={balances}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={balancesQuery.isRefetching && !balancesQuery.isLoading}
              onRefresh={() => void balancesQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="body" numberOfLines={2}>
                    {item.productName}
                    {item.variantName ? ` · ${item.variantName}` : ""}
                  </Text>
                  <Text variant="caption">
                    {item.productSku}
                    {item.variantSku ? ` · ${item.variantSku}` : ""}
                  </Text>
                </View>
                <View style={styles.qtyBlock}>
                  <Text style={styles.qty}>{formatQuantity(Number(item.quantity))}</Text>
                  {Number(item.reservedQuantity) > 0 ? (
                    <Badge label={`res ${formatQuantity(Number(item.reservedQuantity))}`} tone="neutral" />
                  ) : null}
                </View>
              </View>
              {has("inventory.adjust") ? (
                <Button
                  label="Adjust"
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={14} color={colors.ink} />}
                  onPress={() => openAdjust(item.id)}
                  fullWidth
                />
              ) : null}
            </Card>
          )}
        />
      )}

      <Sheet
        visible={adjusting != null}
        onClose={closeAdjust}
        title="Adjust stock"
        description={adjusting ? `${adjusting.productName}${adjusting.variantName ? ` · ${adjusting.variantName}` : ""}` : undefined}
      >
        <View style={styles.adjustForm}>
          <TextField
            label="Quantity change"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="e.g. 5 or -2"
            helper="Positive adds stock, negative removes. The server records the movement."
          />
          <TextField
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Count correction, damaged goods…"
            multiline
          />
          {error ? <Text variant="caption" color={colors.danger}>{error}</Text> : null}
          <Button
            label={adjustMutation.isPending ? "Saving…" : "Save adjustment"}
            onPress={() => void submitAdjust()}
            loading={adjustMutation.isPending}
            disabled={adjustMutation.isPending}
            fullWidth
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { flex: 1, gap: 2 },
  qtyBlock: { alignItems: "flex-end", gap: 4 },
  qty: { fontSize: 18, fontWeight: "700" },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { padding: 16, gap: 10 },
  adjustForm: { gap: 12, paddingBottom: 8 },
});