import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, LayoutGrid, Users } from "lucide-react-native";
import { errorMessage } from "@/api/client";
import type { DiningTable } from "@/api/types";
import { useTheme } from "@/theme";
import { formatMoney } from "@/lib/format";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useToast } from "@/components/providers/toast";
import {
  useFloorPlan,
  useTableStatusMutation,
} from "@/features/tables/use-tables";
import { useResponsive } from "@/lib/use-responsive";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

const STATUS_TONE = {
  available: "success",
  occupied: "primary",
  reserved: "warning",
  inactive: "neutral",
} as const;

const MANUAL_STATUSES = ["available", "reserved", "inactive"] as const;

function labelStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function TableCard({
  table,
  currency,
  onPress,
}: {
  table: DiningTable;
  currency: string;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();
  const tone = STATUS_TONE[table.status as keyof typeof STATUS_TONE] ?? "neutral";
  const order = table.activeOrder;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${table.name}, ${table.status}`}
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.75 : 1 }]}
    >
      <Card
        style={[
          styles.card,
          table.occupied ? { borderColor: colors.primary } : null,
        ]}
      >
        <View style={styles.cardTop}>
          <Text variant="title" numberOfLines={1}>
            {table.name}
          </Text>
          <Badge label={labelStatus(table.status)} tone={tone} />
        </View>

        <View style={styles.seatsRow}>
          <Users size={13} color={colors.inkMuted} />
          <Text variant="caption">
            {table.seats} {table.seats === 1 ? "seat" : "seats"}
          </Text>
        </View>

        {order ? (
          <View style={[styles.orderBox, { backgroundColor: colors.surfaceMuted, borderRadius: radii.md }]}>
            <Text variant="caption" numberOfLines={1}>
              {order.orderNumber}
            </Text>
            <Text variant="body">
              {formatMoney(order.total, currency)}
            </Text>
            <View style={styles.openRow}>
              <Text variant="caption">
                {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
              </Text>
              <ArrowUpRight size={13} color={colors.primary} />
            </View>
          </View>
        ) : (
          <Text variant="caption" numberOfLines={2}>
            {table.notes || "Free to seat"}
          </Text>
        )}
      </Card>
    </Pressable>
  );
}

export default function TablesScreen() {
  const { colors, radii } = useTheme();
  const { business } = useTenant();
  const { has } = usePermissions();
  const { showToast } = useToast();
  const { gridColumns, gutter } = useResponsive();

  const [areaId, setAreaId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DiningTable | null>(null);

  const floorPlan = useFloorPlan();
  const statusMutation = useTableStatusMutation();

  const canManage = has("tables.manage");
  const currency = business?.currency ?? "USD";

  const areas = useMemo(() => floorPlan.data?.areas ?? [], [floorPlan.data]);
  const tables = useMemo(() => floorPlan.data?.tables ?? [], [floorPlan.data]);

  const visible = useMemo(
    () => (areaId ? tables.filter((table) => table.areaId === areaId) : tables),
    [tables, areaId],
  );

  const occupied = tables.filter((table) => table.occupied).length;
  const free = tables.length - occupied;

  const handleTablePress = (table: DiningTable) => {
    if (table.activeOrder) {
      router.push(`/order/${table.activeOrder.id}`);
      return;
    }
    if (canManage) setSelected(table);
  };

  const applyStatus = async (status: string) => {
    if (!selected) return;
    try {
      await statusMutation.mutateAsync({ tableId: selected.id, status });
      showToast(`${selected.name} is now ${status}.`, "success");
      setSelected(null);
    } catch (error) {
      showToast(errorMessage(error), "danger");
    }
  };

  // Two cells per row: pad the tail so the last card keeps the column width.
  const cells = useMemo(() => {
    const rows: (DiningTable | null)[] = [...visible];
    const remainder = rows.length % gridColumns;
    if (remainder !== 0) {
      for (let index = 0; index < gridColumns - remainder; index += 1) {
        rows.push(null);
      }
    }
    return rows;
  }, [visible, gridColumns]);

  return (
    <Screen>
      <AppHeader
        title="Floor plan"
        subtitle={`${free} free · ${occupied} seated`}
        showBack
      />

      {areas.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="All areas"
            accessibilityState={{ selected: areaId == null }}
            onPress={() => setAreaId(null)}
            style={[
              styles.chip,
              {
                backgroundColor: areaId == null ? colors.primary : colors.surface,
                borderColor: areaId == null ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              variant="bodySmall"
              color={areaId == null ? colors.primaryForeground : colors.inkSecondary}
            >
              All areas
            </Text>
          </Pressable>

          {areas.map((area) => {
            const active = areaId === area.id;
            return (
              <Pressable
                key={area.id}
                accessibilityRole="button"
                accessibilityLabel={area.name}
                accessibilityState={{ selected: active }}
                onPress={() => setAreaId(area.id)}
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
                  {area.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {floorPlan.isLoading ? (
        <View style={[styles.grid, { gap: gutter }]}>
          {[0, 1, 2, 3].map((key) => (
            <Card key={key} style={styles.card}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="35%" height={10} />
              <Skeleton width="80%" height={40} radius={8} />
            </Card>
          ))}
        </View>
      ) : floorPlan.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              floorPlan.error instanceof Error
                ? floorPlan.error.message
                : "Could not load the floor plan."
            }
            onRetry={() => void floorPlan.refetch()}
          />
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={LayoutGrid}
            title={tables.length === 0 ? "No tables yet" : "No tables in this area"}
            description={
              tables.length === 0
                ? "Add areas and tables in the Velora web app, then refresh here."
                : "Pick another area, or add tables to this one on the web."
            }
            actionLabel={areaId ? "Show all areas" : undefined}
            onAction={areaId ? () => setAreaId(null) : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={cells}
          key={`tables-${gridColumns}`}
          numColumns={gridColumns}
          keyExtractor={(item, index) => item?.id ?? `spacer-${index}`}
          renderItem={({ item }) =>
            item ? (
              <TableCard
                table={item}
                currency={currency}
                onPress={() => handleTablePress(item)}
              />
            ) : (
              <View style={styles.cell} />
            )
          }
          columnWrapperStyle={{ gap: gutter }}
          contentContainerStyle={[styles.grid, { gap: gutter }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={floorPlan.isRefetching}
              onRefresh={() => void floorPlan.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListFooterComponent={<View style={styles.footerSpace} />}
        />
      )}

      <Sheet
        visible={selected != null}
        onClose={() => setSelected(null)}
        title={selected ? `Set ${selected.name}` : "Table"}
        description="Reserved and inactive tables cannot take a new order."
      >
        <View style={styles.sheetBody}>
          {MANUAL_STATUSES.map((status) => (
            <Button
              key={status}
              label={labelStatus(status)}
              variant={status === "available" ? "primary" : "secondary"}
              fullWidth
              loading={
                statusMutation.isPending &&
                statusMutation.variables?.status === status
              }
              onPress={() => void applyStatus(status)}
            />
          ))}
          <View style={[styles.sheetNote, { backgroundColor: colors.surfaceMuted, borderRadius: radii.md }]}>
            <Text variant="caption">
              A table with an open order keeps its status until that order is
              checked out or cancelled.
            </Text>
          </View>
          <Button label="Cancel" variant="ghost" fullWidth onPress={() => setSelected(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  cell: {
    flex: 1,
  },
  card: {
    flex: 1,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  seatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  orderBox: {
    gap: 2,
    padding: 9,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  sheetBody: {
    gap: 10,
    paddingTop: 4,
  },
  sheetNote: {
    padding: 10,
  },
  footerSpace: {
    height: 12,
  },
});
