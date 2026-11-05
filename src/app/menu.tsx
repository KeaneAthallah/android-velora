import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ban, CircleCheck, UtensilsCrossed } from "lucide-react-native";
import { errorMessage } from "@/api/client";
import type { MenuProduct } from "@/api/types";
import { useTheme } from "@/theme";
import { formatMoney } from "@/lib/format";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useToast } from "@/components/providers/toast";
import {
  useMarkUnavailableMutation,
  useMenu,
  useRestoreItemMutation,
} from "@/features/menu/use-menu";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

const REASONS = ["Sold out", "Out of stock", "Kitchen closed", "Stopped today"];

type AvailabilityFilter = "all" | "available" | "unavailable";

const FILTERS: { key: AvailabilityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "unavailable", label: "86'd" },
];

function MenuRow({
  product,
  currency,
  canManage,
  onBlock,
  onRestore,
  restoring,
}: {
  product: MenuProduct;
  currency: string;
  canManage: boolean;
  onBlock: (product: MenuProduct) => void;
  onRestore: (product: MenuProduct) => void;
  restoring: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Card style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.rowText}>
          <Text variant="body" numberOfLines={1}>
            {product.name}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {[product.category?.name, product.sku].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Text variant="body" color={colors.inkSecondary}>
          {formatMoney(product.sellingPrice, currency)}
        </Text>
      </View>

      {product.available ? (
        <View style={styles.rowBottom}>
          <Badge label="Available" tone="success" />
          {canManage ? (
            <Button
              label="86"
              size="sm"
              variant="secondary"
              icon={<Ban size={14} color={colors.danger} />}
              onPress={() => onBlock(product)}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.rowBottom}>
          <View style={styles.reasonWrap}>
            <Badge label="86'd" tone="danger" />
            <Text variant="caption" numberOfLines={2} style={styles.reasonText}>
              {product.unavailableReason ?? "Marked unavailable"}
            </Text>
          </View>
          {canManage ? (
            <Button
              label="Restore"
              size="sm"
              variant="ghost"
              loading={restoring}
              icon={<CircleCheck size={14} color={colors.primary} />}
              onPress={() => onRestore(product)}
            />
          ) : null}
        </View>
      )}
    </Card>
  );
}

export default function MenuScreen() {
  const { colors } = useTheme();
  const { business, outlet } = useTenant();
  const { has } = usePermissions();
  const { showToast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState<AvailabilityFilter>("all");
  const [blocking, setBlocking] = useState<MenuProduct | null>(null);
  const [reason, setReason] = useState("");

  const search = useDebouncedValue(searchInput.trim(), 250);
  const menuQuery = useMenu();
  const blockMutation = useMarkUnavailableMutation();
  const restoreMutation = useRestoreItemMutation();

  const canManage = has("menu.availability");
  const currency = business?.currency ?? "USD";

  const products = useMemo(() => menuQuery.data ?? [], [menuQuery.data]);

  const visible = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter((product) => {
      if (filter === "available" && !product.available) return false;
      if (filter === "unavailable" && product.available) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.category?.name ?? "").toLowerCase().includes(term)
      );
    });
  }, [products, filter, search]);

  const availableCount = products.filter((product) => product.available).length;
  const blockedCount = products.length - availableCount;
  const filtered = search.length > 0 || filter !== "all";

  const closeSheet = () => {
    setBlocking(null);
    setReason("");
  };

  const handleBlock = async () => {
    if (!blocking || !outlet) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      showToast("Add a reason so the register can explain it.", "warning");
      return;
    }

    try {
      await blockMutation.mutateAsync({
        productId: blocking.id,
        outletId: outlet.id,
        reason: trimmed,
      });
      showToast(`${blocking.name} is now 86'd.`, "success");
      closeSheet();
    } catch (error) {
      showToast(errorMessage(error), "danger");
    }
  };

  const handleRestore = async (product: MenuProduct) => {
    if (!outlet) return;
    try {
      await restoreMutation.mutateAsync({
        productId: product.id,
        outletId: outlet.id,
      });
      showToast(`${product.name} is back on the menu.`, "success");
    } catch (error) {
      showToast(errorMessage(error), "danger");
    }
  };

  const subtitle = outlet
    ? `${availableCount} available${blockedCount > 0 ? ` · ${blockedCount} 86'd` : ""} · ${outlet.name}`
    : `${availableCount} available`;

  return (
    <Screen>
      <AppHeader title="Menu" subtitle={subtitle} showBack />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search item, SKU or category"
          accessibilityLabel="Search menu"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  variant="bodySmall"
                  color={active ? colors.primaryForeground : colors.inkSecondary}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {!outlet ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={UtensilsCrossed}
            title="Pick an outlet"
            description="The menu is per outlet, so choose one in the header switcher."
          />
        </View>
      ) : menuQuery.isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((key) => (
            <Card key={key} style={styles.row}>
              <Skeleton width="60%" height={13} />
              <Skeleton width="35%" height={10} />
              <Skeleton width="25%" height={22} radius={999} />
            </Card>
          ))}
        </View>
      ) : menuQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              menuQuery.error instanceof Error
                ? menuQuery.error.message
                : "Could not load the menu."
            }
            onRetry={() => void menuQuery.refetch()}
          />
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={UtensilsCrossed}
            title={filtered ? "Nothing matches" : "No menu items"}
            description={
              filtered
                ? "Try another search or availability filter."
                : "Active products for this outlet appear here."
            }
            actionLabel={
              filtered
                ? "Clear filters"
                : undefined
            }
            onAction={
              filtered
                ? () => {
                    setSearchInput("");
                    setFilter("all");
                  }
                : undefined
            }
          />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(product) => product.id}
          renderItem={({ item }) => (
            <MenuRow
              product={item}
              currency={currency}
              canManage={canManage}
              onBlock={(product) => {
                setBlocking(product);
                setReason("");
              }}
              onRestore={(product) => void handleRestore(product)}
              restoring={
                restoreMutation.isPending &&
                restoreMutation.variables?.productId === item.id
              }
            />
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={menuQuery.isRefetching}
              onRefresh={() => void menuQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListFooterComponent={
            menuQuery.isFetching ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text variant="caption">Refreshing menu…</Text>
              </View>
            ) : (
              <View style={styles.footerSpace} />
            )
          }
        />
      )}

      <Sheet
        visible={blocking != null}
        onClose={closeSheet}
        title={blocking ? `86 ${blocking.name}` : "86 item"}
        description="Staff will see this reason at the register. Restore the item when it is sellable again."
      >
        <View style={styles.sheetBody}>
          <View style={styles.reasonChips}>
            {REASONS.map((preset) => {
              const active = reason === preset;
              return (
                <Pressable
                  key={preset}
                  accessibilityRole="button"
                  accessibilityLabel={preset}
                  accessibilityState={{ selected: active }}
                  onPress={() => setReason(preset)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceMuted,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    color={
                      active ? colors.primaryForeground : colors.inkSecondary
                    }
                  >
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="What should the register say?"
            maxLength={255}
          />

          <Button
            label="Mark unavailable"
            variant="danger"
            fullWidth
            loading={blockMutation.isPending}
            onPress={() => void handleBlock()}
          />
          <Button label="Cancel" variant="ghost" fullWidth onPress={closeSheet} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  row: {
    gap: 10,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reasonWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reasonText: {
    flex: 1,
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  sheetBody: {
    gap: 12,
    paddingTop: 4,
  },
  reasonChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  footerSpace: {
    height: 12,
  },
});
