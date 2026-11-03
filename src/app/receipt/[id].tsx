import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ReceiptText } from "lucide-react-native";
import { errorMessage } from "@/api/client";
import { fetchSaleReceipt, voidSale } from "@/api/endpoints/sales";
import type { SaleReceipt } from "@/api/types";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { useToast } from "@/components/providers/toast";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

function MetaRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant="bodySmall">{label}</Text>
      <Text variant="bodySmall" color={colors.ink} numberOfLines={2} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  emphasis = false,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: string;
}) {
  const { colors, fonts } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant={emphasis ? "title" : "bodySmall"}>{label}</Text>
      <Text
        style={{
          fontFamily: emphasis ? fonts.bold : fonts.medium,
          fontSize: emphasis ? 20 : 13.5,
          color: tone ?? colors.ink,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "voided":
    case "failed":
      return "danger" as const;
    case "refunded":
    case "partially_refunded":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export default function ReceiptScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const saleId = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");

  const { colors } = useTheme();
  const { business } = useTenant();
  const { has } = usePermissions();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);

  const currency = business?.currency ?? "USD";

  const receiptQuery = useQuery<SaleReceipt>({
    queryKey: queryKeys.receipt(business?.id ?? null, saleId),
    queryFn: () => fetchSaleReceipt(saleId),
    enabled: Boolean(saleId) && has("sales.view"),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => voidSale(id, reason),
    onSuccess: async (sale) => {
      setVoidOpen(false);
      setReason("");
      setVoidError(null);
      showToast(`Sale ${sale.receiptNumber} voided`, "success");
      await Promise.all([
        receiptQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    },
    onError: (error) => {
      setVoidError(errorMessage(error, "The sale could not be voided."));
    },
  });

  const sale = receiptQuery.data;

  const canVoid = has("sales.void") && sale?.status === "completed";

  return (
    <Screen>
      <AppHeader
        showBack
        title={sale?.receiptNumber ?? "Receipt"}
        subtitle={sale ? formatDateTime(sale.createdAt) : "Loading…"}
      />

      <ScreenScroll bottomPadding={32} contentStyle={styles.content}>
        {receiptQuery.isLoading ? (
          <Card style={styles.card}>
            <Skeleton width="55%" height={18} />
            <Skeleton width="35%" height={12} />
            <Skeleton width="100%" height={44} radius={10} />
            <Skeleton width="100%" height={44} radius={10} />
          </Card>
        ) : receiptQuery.isError || !sale ? (
          <ErrorState
            message={errorMessage(receiptQuery.error, "This receipt could not be loaded.")}
            onRetry={() => void receiptQuery.refetch()}
          />
        ) : (
          <>
            {sale.status === "voided" ? (
              <Card style={[styles.card, { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg }]}>
                <Text variant="title" color={colors.danger}>
                  Voided
                </Text>
                <Text variant="bodySmall">
                  {sale.voidReason ?? "This sale was voided."}
                  {sale.voidedAt ? ` · ${formatDateTime(sale.voidedAt)}` : ""}
                </Text>
              </Card>
            ) : null}

            <Card style={styles.card}>
              <View style={styles.brandRow}>
                <View style={[styles.brandTile, { backgroundColor: colors.primarySoft }]}>
                  <ReceiptText size={18} color={colors.primary} />
                </View>
                <View style={styles.brandText}>
                  <Text variant="title" numberOfLines={1}>
                    {sale.outletName || business?.name || "Velora"}
                  </Text>
                  {sale.outletAddress ? (
                    <Text variant="caption" numberOfLines={2}>
                      {sale.outletAddress}
                    </Text>
                  ) : null}
                  {sale.outletPhone ? (
                    <Text variant="caption">{sale.outletPhone}</Text>
                  ) : null}
                </View>
                <Badge label={sale.status} tone={statusTone(sale.status)} />
              </View>

              <Divider />

              <MetaRow label="Receipt" value={sale.receiptNumber} />
              <MetaRow label="Order" value={sale.orderNumber} />
              <MetaRow label="Type" value={sale.orderType.replace("_", " ")} />
              <MetaRow label="Cashier" value={sale.cashierName || "—"} />
              {sale.customerName ? (
                <MetaRow label="Customer" value={sale.customerName} />
              ) : null}
              <MetaRow label="Date" value={formatDateTime(sale.createdAt)} />
            </Card>

            <Card style={styles.card}>
              <Text variant="title">Items</Text>

              <View style={styles.items}>
                {sale.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemText}>
                      <Text variant="bodySmall" color={colors.ink} numberOfLines={2}>
                        {item.productName}
                      </Text>
                      <Text variant="caption">
                        {formatQuantity(item.quantity)} × {formatMoney(item.unitPrice, currency)}
                        {Number(item.discountAmount) > 0
                          ? ` · −${formatMoney(item.discountAmount, currency)}`
                          : ""}
                      </Text>
                      {item.notes ? <Text variant="caption">{item.notes}</Text> : null}
                    </View>
                    <Text variant="bodySmall" color={colors.ink} style={styles.itemTotal}>
                      {formatMoney(item.lineTotal, currency)}
                    </Text>
                  </View>
                ))}
              </View>

              <Divider />

              <TotalRow label="Subtotal" value={formatMoney(sale.subtotal, currency)} />
              {Number(sale.discountAmount) > 0 ? (
                <TotalRow
                  label="Discounts"
                  value={`− ${formatMoney(sale.discountAmount, currency)}`}
                />
              ) : null}
              {Number(sale.promotionDiscount) > 0 ? (
                <TotalRow
                  label={sale.promotionCode ? `Promotion · ${sale.promotionCode}` : "Promotion"}
                  value={`− ${formatMoney(sale.promotionDiscount, currency)}`}
                />
              ) : null}
              {Number(sale.taxAmount) > 0 ? (
                <TotalRow label="Tax" value={formatMoney(sale.taxAmount, currency)} />
              ) : null}

              <Divider />

              <TotalRow label="Total" value={formatMoney(sale.total, currency)} emphasis />
              <TotalRow label="Paid" value={formatMoney(sale.paidAmount, currency)} />
              <TotalRow
                label="Change"
                value={formatMoney(sale.changeAmount, currency)}
                tone={Number(sale.changeAmount) > 0 ? colors.success : undefined}
              />
            </Card>

            {sale.payments.length > 0 ? (
              <Card style={styles.card}>
                <Text variant="title">Payments</Text>
                {sale.payments.map((payment) => (
                  <View key={payment.id} style={styles.metaRow}>
                    <View style={styles.paymentLabel}>
                      <Text variant="bodySmall" color={colors.ink}>
                        {payment.method}
                      </Text>
                      <Badge
                        label={payment.status}
                        tone={payment.status === "completed" ? "success" : "neutral"}
                      />
                    </View>
                    <Text variant="bodySmall" color={colors.ink}>
                      {formatMoney(payment.amount, currency)}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : (
              <Card style={styles.card}>
                <EmptyState
                  icon={ReceiptText}
                  title="No payment recorded"
                  description="This sale exists without a completed payment. Take payment on the Sell screen or check the web app."
                  compact
                />
              </Card>
            )}

            {sale.notes ? (
              <Card style={styles.card}>
                <Text variant="label">Note</Text>
                <Text variant="bodySmall">{sale.notes}</Text>
              </Card>
            ) : null}

            <View style={styles.actions}>
              <Button
                label="New sale"
                onPress={() => router.replace("/sales")}
                fullWidth
                size="lg"
              />
              {canVoid ? (
                <Button
                  label="Void sale"
                  variant="secondary"
                  icon={<Ban size={15} color={colors.danger} />}
                  onPress={() => {
                    setVoidError(null);
                    setVoidOpen(true);
                  }}
                  fullWidth
                />
              ) : null}
            </View>
          </>
        )}
      </ScreenScroll>

      <Sheet
        visible={voidOpen}
        onClose={() => {
          if (voidMutation.isPending) return;
          setVoidOpen(false);
        }}
        title="Void this sale"
        description="Stock goes back to the shelf and the payments are reversed."
      >
        <View style={styles.voidForm}>
          <TextField
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Wrong item, customer changed their mind…"
            multiline
            autoFocus
            error={voidError}
          />

          <Button
            label="Void sale"
            variant="danger"
            loading={voidMutation.isPending}
            disabled={reason.trim().length < 3}
            onPress={() => {
              if (!sale) return;
              voidMutation.mutate({ id: sale.id, reason: reason.trim() });
            }}
            fullWidth
          />

          <Text variant="caption">
            Voiding is recorded against your account and cannot be undone.
          </Text>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  card: {
    gap: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    flex: 1,
    gap: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  items: {
    gap: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  itemText: {
    flex: 1,
    gap: 1,
  },
  itemTotal: {
    minWidth: 80,
    textAlign: "right",
  },
  paymentLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  voidForm: {
    gap: 12,
    paddingBottom: 8,
  },
});
