import { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, Package, Plus } from "lucide-react-native";
import { formatQuantity } from "@/lib/format";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import {
  useInventoryBalances,
  useAdjustStockMutation,
  useStockableProducts,
} from "@/features/inventory/use-inventory";
import { useIngredientUsage } from "@/features/recipes/use-ingredient-usage";
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
  const router = useRouter();

  const balancesQuery = useInventoryBalances();
  const usageQuery = useIngredientUsage();
  const adjustMutation = useAdjustStockMutation();
  const stockableQuery = useStockableProducts();

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Opening stock for a product that has never had a movement: there is no
  // balance row to tap yet, so this picks the product explicitly.
  const [stockOpen, setStockOpen] = useState(false);
  const [stockProductId, setStockProductId] = useState<string | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockError, setStockError] = useState<string | null>(null);
  const stockable = stockableQuery.data ?? [];

  const balances = balancesQuery.data ?? [];

  // Ingredients under their safety floor, even when reorder alerts are quiet.
  const criticalIngredients = (usageQuery.data ?? []).filter(
    (row) => row.trackInventory && row.critical,
  );
  const criticalNames = criticalIngredients
    .slice(0, 3)
    .map((row) => row.name)
    .join(", ");
  const criticalExtra = criticalIngredients.length - 3;

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

  const openStock = () => {
    setStockOpen(true);
    setStockProductId(null);
    setStockQuantity("");
    setStockReason("Opening stock");
    setStockError(null);
  };

  const submitStock = async () => {
    if (!stockProductId) {
      setStockError("Pick the product you are stocking.");
      return;
    }
    const value = Number(stockQuantity);
    if (!Number.isFinite(value) || value === 0) {
      setStockError("Enter a non-zero quantity (use negative to remove).");
      return;
    }
    if (stockReason.trim().length < 3) {
      setStockError("Reason is required.");
      return;
    }

    setStockError(null);
    try {
      await adjustMutation.mutateAsync({
        productId: stockProductId,
        quantity: value,
        reason: stockReason.trim(),
      });
      setStockOpen(false);
    } catch (e) {
      setStockError(e instanceof Error ? e.message : "Could not add stock.");
    }
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
      <AppHeader
        title="Inventory"
        subtitle={`${balances.length} balances`}
        showAvatar
        right={
          has("inventory.adjust") ? (
            <Button
              label="Add stock"
              size="sm"
              onPress={openStock}
            />
          ) : undefined
        }
      />

      {criticalIngredients.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${criticalIngredients.length} ${
            criticalIngredients.length === 1 ? "ingredient is" : "ingredients are"
          } at or below safety stock: ${criticalNames}. Open ingredients.`}
          onPress={() => router.push("/recipes")}
          style={({ pressed }) => [
            styles.criticalBanner,
            {
              backgroundColor: colors.dangerBg,
              borderColor: colors.danger,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AlertTriangle size={18} color={colors.danger} />
          <View style={styles.criticalText}>
            <Text
              variant="bodySmall"
              color={colors.danger}
              style={styles.criticalTitle}
            >
              {criticalIngredients.length}{" "}
              {criticalIngredients.length === 1
                ? "ingredient is"
                : "ingredients are"}{" "}
              at or below safety stock
            </Text>
            <Text variant="caption" color={colors.danger} numberOfLines={2}>
              {criticalNames}
              {criticalExtra > 0 ? ` +${criticalExtra} more` : ""}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.danger} />
        </Pressable>
      ) : null}

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
            description={
              has("inventory.adjust")
                ? "Add opening stock for a product and its balance appears here."
                : "Balances appear once products are received or adjusted."
            }
            actionLabel={has("inventory.adjust") ? "Add stock" : undefined}
            onAction={has("inventory.adjust") ? openStock : undefined}
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
            keyboardType="numbers-and-punctuation"
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

      <Sheet
        visible={stockOpen}
        onClose={() => {
          if (!adjustMutation.isPending) setStockOpen(false);
        }}
        title="Add stock"
        description="Pick a product and how many units you now hold."
      >
        <View style={styles.adjustForm}>
          <Text variant="label">Product</Text>
          {stockableQuery.isLoading ? (
            <Text variant="caption">Loading products…</Text>
          ) : stockable.length === 0 ? (
            <Text variant="caption">
              No active products yet — add one on the Products tab first.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chips}
            >
              {stockable.map((product) => {
                const active = stockProductId === product.id;
                return (
                  <Pressable
                    key={product.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Stock ${product.name}`}
                    accessibilityState={{ selected: active }}
                    onPress={() =>
                      setStockProductId(active ? null : product.id)
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.surfaceMuted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      color={
                        active ? colors.primaryForeground : colors.inkSecondary
                      }
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <TextField
            label="Quantity"
            value={stockQuantity}
            onChangeText={setStockQuantity}
            keyboardType="numbers-and-punctuation"
            placeholder="50"
          />
          <TextField
            label="Reason"
            value={stockReason}
            onChangeText={setStockReason}
            placeholder="Opening stock"
          />
          {stockError ? (
            <Text variant="caption" color={colors.danger}>
              {stockError}
            </Text>
          ) : null}
          <Button
            label={adjustMutation.isPending ? "Saving…" : "Add stock"}
            onPress={() => void submitStock()}
            loading={adjustMutation.isPending}
            disabled={adjustMutation.isPending || stockable.length === 0}
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
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  criticalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  criticalText: { flex: 1, gap: 2 },
  criticalTitle: { fontWeight: "700" },
});