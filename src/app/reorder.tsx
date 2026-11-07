import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Check, ChevronDown, ChevronUp, PackageSearch } from "lucide-react-native";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useReorderForecast } from "@/features/reorder/use-reorder-forecast";
import {
  formatCount,
  formatDate,
  formatMoney,
  formatQuantity,
  formatUnitPrice,
} from "@/lib/format";
import { AppHeader } from "@/components/layout/app-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Text } from "@/components/ui/text";
import type { ReorderIngredient, ReorderIngredientForecast } from "@/api/types";

function methodLabel(forecast: ReorderIngredientForecast) {
  switch (forecast.method) {
    case "recipe-demand":
      return { label: "Recipe demand", tone: "success" as BadgeTone };
    case "photo-demand":
      return { label: "Photo demand", tone: "info" as BadgeTone };
    default:
      return { label: "Blind spot", tone: "neutral" as BadgeTone };
  }
}

function hasReorder(ingredient: ReorderIngredient) {
  return Number(ingredient.forecast.reorderQuantity) > 0;
}

function reorderBadgeFor(quantityValue: string, unit: string, outOfStock: boolean) {
  if (Number(quantityValue) <= 0) {
    return { label: "Covered", tone: "success" as BadgeTone };
  }

  return {
    label: `Buy ${formatQuantity(quantityValue)} ${unit}`,
    tone: (outOfStock ? "danger" : "warning") as BadgeTone,
  };
}

function reorderBadge(ingredient: ReorderIngredient) {
  if (!hasReorder(ingredient)) {
    return ingredient.forecast.method === "none"
      ? { label: "No forecast", tone: "neutral" as BadgeTone }
      : { label: "Covered", tone: "success" as BadgeTone };
  }

  return reorderBadgeFor(
    ingredient.forecast.reorderQuantity,
    ingredient.unit,
    Number(ingredient.forecast.currentStock) <= 0,
  );
}

export default function ReorderScreen() {
  const { colors, radii } = useTheme();
  const { has } = usePermissions();
  const { business, outlet } = useTenant();
  const forecastQuery = useReorderForecast();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 250);
  const [onlyReorder, setOnlyReorder] = useState(false);
  const [detail, setDetail] = useState<ReorderIngredient | null>(null);

  const forecast = forecastQuery.data;
  const currency = business?.currency || forecast?.purchaseMoneyBudget.currency || "IDR";

  const rows = useMemo(() => {
    const all = forecast?.ingredients ?? [];
    const filtered = all.filter((ingredient) => {
      if (onlyReorder && !hasReorder(ingredient)) return false;
      if (!search) return true;
      return (
        ingredient.name.toLowerCase().includes(search) ||
        ingredient.sku.toLowerCase().includes(search)
      );
    });

    return [...filtered].sort(
      (a, b) =>
        Number(b.forecast.reorderQuantity) - Number(a.forecast.reorderQuantity) ||
        a.name.localeCompare(b.name),
    );
  }, [forecast?.ingredients, onlyReorder, search]);

  const needsReorder = (forecast?.ingredients ?? []).filter(hasReorder).length;
  const blindSpots = (forecast?.ingredients ?? []).filter(
    (ingredient) => ingredient.forecast.method === "none",
  ).length;
  const total = forecast?.ingredients.length ?? 0;

  if (!has("purchasing.manage")) {
    return (
      <Screen>
        <AppHeader title="Reorder copilot" subtitle="Demand forecast" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Reorder forecast not enabled for your role"
            message="A manager can grant purchasing manage."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Reorder copilot"
        subtitle={
          forecast
            ? `${formatCount(total)} tracked ingredients · ${formatCount(forecast.lookback.days)}-day lookback`
            : "Demand forecast"
        }
        showBack
      />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search ingredient or SKU"
          accessibilityLabel="Search ingredients"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Only show ingredients that need a reorder"
          accessibilityState={{ selected: onlyReorder }}
          onPress={() => setOnlyReorder((value) => !value)}
          style={[
            styles.chip,
            {
              borderRadius: radii.full,
              borderColor: onlyReorder ? colors.primary : colors.border,
              backgroundColor: onlyReorder ? colors.primary : colors.surface,
            },
          ]}
        >
          <Text
            variant="bodySmall"
            color={onlyReorder ? colors.primaryForeground : colors.inkSecondary}
          >
            Only what needs a reorder
          </Text>
        </Pressable>
      </View>

      {forecastQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={92} radius={12} />
          ))}
        </View>
      ) : forecastQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              forecastQuery.error instanceof Error
                ? forecastQuery.error.message
                : "Could not load the reorder forecast."
            }
            onRetry={() => void forecastQuery.refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(ingredient) => ingredient.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={forecastQuery.isRefetching && !forecastQuery.isLoading}
              onRefresh={() => void forecastQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.statGrid}>
                <StatCard
                  label="Needs reorder"
                  value={formatCount(needsReorder)}
                  hint="Before the next delivery"
                  tone={needsReorder > 0 ? "warning" : "success"}
                  icon={PackageSearch}
                />
                <StatCard
                  label="Estimated spend"
                  value={formatMoney(forecast?.purchaseMoneyBudget.amount ?? "0", currency)}
                  hint="At current ingredient cost"
                />
              </View>

              {blindSpots > 0 ? (
                <Text variant="caption" color={colors.warning}>
                  {formatCount(blindSpots)}{" "}
                  {blindSpots === 1 ? "ingredient has" : "ingredients have"} no recipe or sales
                  demand to forecast from — refine the recipe on the web app to close the blind
                  spot.
                </Text>
              ) : null}

              {outlet ? (
                <Text variant="caption">
                  Projected for {outlet.name}
                  {forecast ? ` · from ${formatDate(forecast.lookback.from)}` : ""}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              compact
              icon={PackageSearch}
              title={
                total === 0
                  ? "No tracked ingredients yet"
                  : onlyReorder || search
                    ? "No ingredients match"
                    : "Nothing needs reordering"
              }
              description={
                total === 0
                  ? "Add ingredients and attach them to recipes on the web app so sales can drive a forecast."
                  : onlyReorder || search
                    ? "Clear the filter to see the whole forecast."
                    : "Every tracked ingredient is covered until its next delivery."
              }
              actionLabel={onlyReorder || search ? "Clear filters" : undefined}
              onAction={
                onlyReorder || search
                  ? () => {
                      setOnlyReorder(false);
                      setSearchInput("");
                    }
                  : undefined
              }
            />
          }
          renderItem={({ item }) => {
            const method = methodLabel(item.forecast);
            const badge = reorderBadge(item);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open forecast for ${item.name}`}
                onPress={() => setDetail(item)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Card style={styles.card}>
                  <View style={styles.rowTop}>
                    <Text variant="body" numberOfLines={1} style={styles.name}>
                      {item.name}
                    </Text>
                    <Badge label={badge.label} tone={badge.tone} />
                  </View>

                  <View style={styles.metaRow}>
                    <Text variant="caption" numberOfLines={1} style={styles.meta}>
                      {item.sku || "No SKU"} · {item.unit}
                    </Text>
                    <Badge label={method.label} tone={method.tone} />
                  </View>

                  <View style={styles.rowBottom}>
                    <Text variant="bodySmall" numberOfLines={1}>
                      On hand {formatQuantity(item.forecast.currentStock)} {item.unit}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      {formatQuantity(item.forecast.dailyDemand)} {item.unit}/day
                    </Text>
                  </View>

                  <Text variant="caption" numberOfLines={1}>
                    {item.forecast.leadTimeDays == null
                      ? "No delivery lead time modelled"
                      : `${item.forecast.leadTimeDays}-day lead time · ${formatQuantity(
                          item.forecast.predictedStockAtReorderDate,
                        )} ${item.unit} left at delivery`}
                  </Text>
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={
          detail
            ? `${detail.sku || "No SKU"} · ${detail.unit} · ${methodLabel(detail.forecast).label}`
            : undefined
        }
      >
        {detail ? (
          <ForecastDetail key={detail.id} ingredient={detail} currency={currency} />
        ) : null}
      </Sheet>
    </Screen>
  );
}

function ForecastDetail({
  ingredient,
  currency,
}: {
  ingredient: ReorderIngredient;
  currency: string;
}) {
  const { colors } = useTheme();
  // Four numeric columns leave too little room for a supplier name on a narrow
  // phone, so below this width each row stacks the figures under the name.
  const { width } = useWindowDimensions();
  const stackedCompare = width < 380;
  const forecast = ingredient.forecast;
  const badge = reorderBadge(ingredient);
  const waste = forecast.wasteRisk;

  // Selecting a parcel swaps the sheet's lead-time figures for the preview the
  // server computed with that supplier's lead time.
  const [selectedParcel, setSelectedParcel] = useState<number | null>(null);
  const selected =
    selectedParcel == null ? null : (ingredient.suggestedParcels[selectedParcel] ?? null);
  // The API recomputes the forecast per parcel, so choosing one never needs a
  // round trip and the arithmetic stays on the server.
  const preview = selected?.preview ?? null;
  const reorderValue = preview ? preview.reorderQuantity : forecast.reorderQuantity;
  const leadTimeDemand = preview ? preview.leadTimeDemand : forecast.leadTimeDemand;
  const targetStock = preview ? preview.targetStock : forecast.targetStock;
  const predictedStock = preview
    ? preview.predictedStockAtReorderDate
    : forecast.predictedStockAtReorderDate;
  const leadTimeDays = preview ? preview.leadTimeDays : forecast.leadTimeDays;
  const summaryBadge = preview
    ? reorderBadgeFor(reorderValue, ingredient.unit, Number(forecast.currentStock) <= 0)
    : badge;

  // Compare table: cheapest first by the chosen column; a parcel with no figure
  // (its supplier has no lead time, so no total) sorts last rather than first.
  const [parcelSort, setParcelSort] = useState<"unit" | "total" | "leftover">("unit");
  const [parcelSortDir, setParcelSortDir] = useState<"asc" | "desc">("asc");
  const sortedParcels = ingredient.suggestedParcels
    .map((parcel, index) => ({ parcel, index }))
    .sort((a, b) => {
      const read = (parcel: ReorderIngredient["suggestedParcels"][number]) =>
        parcelSort === "unit"
          ? parcel.unitCost
          : parcelSort === "total"
            ? parcel.preview?.totalCost
            : parcel.preview?.leftoverStock;
      const left = read(a.parcel);
      const right = read(b.parcel);
      const leftValue = left == null ? Number.POSITIVE_INFINITY : Number(left);
      const rightValue = right == null ? Number.POSITIVE_INFINITY : Number(right);
      if (leftValue === rightValue) return 0;
      // Parcels with no figure stay at the bottom whichever way the sort runs.
      if (leftValue === Number.POSITIVE_INFINITY) return 1;
      if (rightValue === Number.POSITIVE_INFINITY) return -1;
      return parcelSortDir === "asc" ? leftValue - rightValue : rightValue - leftValue;
    });

  // Table headers are the wide-layout sort control; the chip row above takes
  // over only where the header row is hidden (stacked layout).
  const compareSortHeader = (value: "unit" | "total" | "leftover", label: string) => {
    const active = parcelSort === value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${label.toLowerCase()}${
          active ? `, ${parcelSortDir === "asc" ? "ascending" : "descending"}` : ""
        }`}
        accessibilityHint={
          active
            ? "Reverses the order"
            : value === "leftover"
              ? "Sorts least first"
              : "Sorts cheapest first"
        }
        accessibilityState={{ selected: active }}
        onPress={() => {
          if (active) {
            setParcelSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
          } else {
            setParcelSort(value);
            setParcelSortDir("asc");
          }
        }}
        style={[
          styles.compareSortHeader,
          value === "unit"
            ? styles.compareUnit
            : value === "total"
              ? styles.compareTotal
              : styles.compareLeftover,
        ]}
      >
        <Text variant="caption" color={active ? colors.primary : colors.inkSecondary}>
          {label}
        </Text>
        {active ? (
          parcelSortDir === "asc" ? (
            <ChevronUp size={12} color={colors.primary} />
          ) : (
            <ChevronDown size={12} color={colors.primary} />
          )
        ) : null}
      </Pressable>
    );
  };

  const leadTimeNote = !selected
    ? null
    : preview
      ? `${preview.leadTimeDays}-day lead time from ${
          selected.supplierName || "this supplier"
        }. The reorder figures above follow this parcel.`
      : forecast.leadTimeDays == null
        ? "No lead time on record for this supplier; the forecast is unchanged."
        : `${forecast.leadTimeDays}-day lead time — this supplier has none on record, so the forecast is unchanged.`;

  return (
    <View style={styles.sheetBody}>
      <View style={styles.summary}>
        <Card style={styles.summaryCard}>
          <Text variant="label">Reorder</Text>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
            {Number(reorderValue) > 0
              ? `${formatQuantity(reorderValue)} ${ingredient.unit}`
              : "None"}
          </Text>
          <Badge label={summaryBadge.label} tone={summaryBadge.tone} />
        </Card>
        <Card style={styles.summaryCard}>
          <Text variant="label">On hand</Text>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
            {formatQuantity(forecast.currentStock)} {ingredient.unit}
          </Text>
          <Text variant="caption">
            reorder at {formatQuantity(ingredient.reorderLevel)} {ingredient.unit}
          </Text>
        </Card>
      </View>

      {preview ? (
        <Text variant="caption" color={colors.inkSecondary}>
          {`Forecast with ${selected?.supplierName || "this supplier"}'s ${preview.leadTimeDays}-day lead time.`}
        </Text>
      ) : null}

      <Card padded={false}>
        <DetailRow
          label="Daily demand"
          value={`${formatQuantity(forecast.dailyDemand)} ${ingredient.unit}`}
          hint={`${formatQuantity(ingredient.consumption.theoretical)} ${
            ingredient.unit
          } used over the lookback`}
        />
        <Divider />
        <DetailRow
          label="Lead-time demand"
          value={`${formatQuantity(leadTimeDemand)} ${ingredient.unit}`}
          hint={
            leadTimeDays == null
              ? "No lead time modelled"
              : `${leadTimeDays}-day lead time${preview ? " (selected parcel)" : ""}`
          }
        />
        <Divider />
        <DetailRow
          label="Target stock"
          value={targetStock == null ? "—" : `${formatQuantity(targetStock)} ${ingredient.unit}`}
          hint={
            targetStock == null
              ? "No demand model for this ingredient"
              : "Lead time plus comfort cover"
          }
        />
        <Divider />
        <DetailRow
          label="Reorder quantity"
          value={
            Number(reorderValue) > 0
              ? `${formatQuantity(reorderValue)} ${ingredient.unit}`
              : "None"
          }
          hint="Target stock minus stock on hand"
        />
        {preview && preview.totalCost != null ? (
          <>
            <Divider />
            <DetailRow
              label="Total cost"
              value={formatMoney(preview.totalCost, currency)}
              hint={
                preview.parcelsRequired == null
                  ? "Priced from the selected parcel"
                  : `${formatCount(preview.parcelsRequired)} × ${formatQuantity(
                      selected?.parcelQuantity ?? "0",
                    )} ${ingredient.unit} at ${formatMoney(selected?.parcelCost ?? "0", currency)}`
              }
            />
          </>
        ) : null}
        <Divider />
        <DetailRow
          label="Stock at next delivery"
          value={`${formatQuantity(predictedStock)} ${ingredient.unit}`}
          hint={
            forecast.daysOfStockRemaining == null
              ? "No steady demand"
              : `${formatQuantity(forecast.daysOfStockRemaining)} days of stock left`
          }
        />
        <Divider />
        <DetailRow
          label="Cost per unit"
          value={formatMoney(ingredient.costPerUnit, currency)}
          hint={`Per ${ingredient.unit} in the ingredient catalogue`}
        />
      </Card>

      <View style={styles.parcelBlock}>
        <View style={styles.parcelHeader}>
          <Text variant="label">Supplier parcels</Text>
          {ingredient.suggestedParcels.length > 1 && stackedCompare ? (
            <View
              style={[
                styles.sortToggle,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              {(
                [
                  { value: "unit", label: "Unit cost" },
                  { value: "total", label: "Total cost" },
                  { value: "leftover", label: "Leftover" },
                ] as const
              ).map(({ value, label }) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort parcels by ${label}${
                    parcelSort === value
                      ? `, ${parcelSortDir === "asc" ? "ascending" : "descending"}`
                      : ""
                  }`}
                  accessibilityHint={
                    parcelSort === value
                      ? "Reverses the order"
                      : value === "leftover"
                        ? "Sorts least first"
                        : "Sorts cheapest first"
                  }
                  accessibilityState={{ selected: parcelSort === value }}
                  onPress={() => {
                    if (parcelSort === value) {
                      setParcelSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
                    } else {
                      setParcelSort(value);
                      setParcelSortDir("asc");
                    }
                  }}
                  style={[
                    styles.sortOption,
                    parcelSort === value ? { backgroundColor: colors.primarySoft } : null,
                  ]}
                >
                  <Text
                    variant="caption"
                    color={parcelSort === value ? colors.primary : colors.inkSecondary}
                  >
                    {label}
                  </Text>
                  {parcelSort === value ? (
                    parcelSortDir === "asc" ? (
                      <ChevronUp size={12} color={colors.primary} />
                    ) : (
                      <ChevronDown size={12} color={colors.primary} />
                    )
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        {ingredient.suggestedParcels.length === 0 ? (
          <Text variant="caption">
            No supplier parcels recorded for this ingredient yet. Add them on the web app to
            compare case sizes and lead times against this reorder.
          </Text>
        ) : (
          <Card padded={false}>
            {stackedCompare ? null : (
              <View style={[styles.compareRow, styles.compareHeader]}>
                <Text variant="caption" style={styles.compareNameCell}>
                  Supplier
                </Text>
                {compareSortHeader("unit", "Unit")}
                {compareSortHeader("total", "Total")}
                {compareSortHeader("leftover", "Leftover")}
              </View>
            )}
            {sortedParcels.map(({ parcel, index }) => {
              const isSelected = selectedParcel === index;
              const total = parcel.preview?.totalCost ?? null;
              const leftover = parcel.preview?.leftoverStock ?? null;
              const unitValue =
                parcel.unitCost == null
                  ? "—"
                  : `${formatUnitPrice(parcel.unitCost, currency)}/${ingredient.unit}`;
              const totalValue = total == null ? "—" : formatMoney(total, currency);
              const leftoverValue =
                leftover == null ? "—" : `${formatQuantity(leftover)} ${ingredient.unit}`;
              return (
                <View key={`${parcel.supplierId}:${parcel.parcelQuantity}:${index}`}>
                  <Divider />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Choose the parcel from ${
                      parcel.supplierName || "the unnamed supplier"
                    }, unit ${unitValue}, total ${totalValue}, leftover ${leftoverValue}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedParcel(isSelected ? null : index)}
                    style={({ pressed }) => [
                      styles.compareRow,
                      stackedCompare ? styles.compareRowStacked : null,
                      isSelected ? { backgroundColor: colors.primarySoft } : null,
                      pressed ? { opacity: 0.7 } : null,
                    ]}
                  >
                    <View style={styles.compareNameStack}>
                      <View style={styles.parcelName}>
                        {isSelected ? <Check size={13} color={colors.primary} /> : null}
                        <Text
                          variant="bodySmall"
                          numberOfLines={stackedCompare ? 2 : 1}
                          style={styles.meta}
                        >
                          {parcel.supplierName || "No supplier named"}
                        </Text>
                      </View>
                      <Text variant="caption" numberOfLines={stackedCompare ? 2 : 1}>
                        {formatQuantity(parcel.parcelQuantity)} {ingredient.unit}
                        {parcel.supplierLeadTimeDays == null
                          ? " · no lead time"
                          : ` · ${parcel.supplierLeadTimeDays}d lead`}
                      </Text>
                    </View>
                    {stackedCompare ? (
                      <View style={styles.compareGrid}>
                        {[
                          { label: "Unit", value: unitValue },
                          { label: "Total", value: totalValue },
                          { label: "Leftover", value: leftoverValue },
                        ].map((cell) => (
                          <View key={cell.label} style={styles.compareGridCell}>
                            <Text variant="caption" color={colors.inkSecondary}>
                              {cell.label}
                            </Text>
                            <Text variant="bodySmall" numberOfLines={1}>
                              {cell.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <>
                        <Text variant="bodySmall" numberOfLines={1} style={styles.compareUnit}>
                          {unitValue}
                        </Text>
                        <Text variant="bodySmall" numberOfLines={1} style={styles.compareTotal}>
                          {totalValue}
                        </Text>
                        <Text variant="bodySmall" numberOfLines={1} style={styles.compareLeftover}>
                          {leftoverValue}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}
        {ingredient.suggestedParcels.length > 0 ? (
          leadTimeNote ? (
            <Text variant="caption" color={colors.inkSecondary}>
              {leadTimeNote}
            </Text>
          ) : (
            <Text variant="caption">
              {`Sorted by ${
                parcelSort === "leftover" ? "leftover stock" : `${parcelSort} cost`
              }, ${
                parcelSort === "leftover"
                  ? parcelSortDir === "asc"
                    ? "least first"
                    : "most first"
                  : parcelSortDir === "asc"
                    ? "cheapest first"
                    : "priciest first"
              }. Tap a parcel to preview it.`}
            </Text>
          )
        ) : null}

        {preview && selected ? (
          <Card padded={false}>
            <DetailRow
              label="Unit cost"
              value={
                selected.unitCost == null
                  ? "—"
                  : `${formatUnitPrice(selected.unitCost, currency)} / ${ingredient.unit}`
              }
              hint={`${formatQuantity(selected.parcelQuantity)} ${ingredient.unit} for ${formatMoney(
                selected.parcelCost,
                currency,
              )}`}
            />
            <Divider />
            <DetailRow
              label="Leftover stock"
              value={
                preview.leftoverStock == null
                  ? "—"
                  : `${formatQuantity(preview.leftoverStock)} ${ingredient.unit}`
              }
              hint="What buying whole parcels leaves after the cover window"
            />
          </Card>
        ) : null}
      </View>

      <View style={styles.notes}>
        <Text variant="bodySmall">{forecast.reorderReason}</Text>
        {ingredient.consumption.soldUnits > 0 ? (
          <Text variant="caption">
            {formatCount(ingredient.consumption.soldUnits)} product units sold in the lookback
            window; the recipes account for{" "}
            {formatQuantity(ingredient.consumption.theoretical)} {ingredient.unit}.
          </Text>
        ) : null}
        {forecast.shelfLifeNote ? (
          <Text variant="caption">{forecast.shelfLifeNote}</Text>
        ) : null}
        {waste && Number(waste.likelyWasteQuantity) > 0 ? (
          <Text variant="caption" color={colors.danger}>
            ~{formatQuantity(waste.likelyWasteQuantity)} {ingredient.unit} may expire.{" "}
            {waste.note}
          </Text>
        ) : null}
        {forecast.blindSpot ? (
          <Text variant="caption" color={colors.warning}>
            {forecast.blindSpot}
          </Text>
        ) : null}
      </View>

      <Text variant="caption">
        Read-only forecast: drafting a purchase order from here is not available yet, because
        purchase order lines are product-based while the forecast is ingredient-based.
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailText}>
        <Text variant="bodySmall">{label}</Text>
        <Text variant="caption">{hint}</Text>
      </View>
      <Text variant="bodySmall">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  headerBlock: { gap: 8, paddingBottom: 4 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { gap: 5 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { flex: 1 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: { flex: 1 },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, gap: 10 },
  sheetBody: { gap: 12, paddingBottom: 8 },
  summary: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, gap: 4 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  detailText: { flex: 1, gap: 1 },
  parcelName: { flexDirection: "row", alignItems: "center", gap: 5 },
  parcelBlock: { gap: 6 },
  parcelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  sortToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  compareRowStacked: { flexDirection: "column", alignItems: "stretch", gap: 5 },
  compareGrid: { flexDirection: "row", gap: 8 },
  compareGridCell: { flex: 1, gap: 1 },
  // The headers are the sort control, so they keep a full-height touch target
  // even though they only hold caption-sized text.
  compareHeader: { paddingVertical: 0, minHeight: 44 },
  compareSortHeader: {
    flexDirection: "row",
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    paddingVertical: 10,
  },
  compareNameCell: { flex: 1 },
  compareNameStack: { flex: 1, gap: 1 },
  compareUnit: { minWidth: 52, textAlign: "right" },
  compareTotal: { minWidth: 66, textAlign: "right" },
  compareLeftover: { minWidth: 64, textAlign: "right" },
  notes: { gap: 4 },
});
