import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Plus, Trash2, Wallet } from "lucide-react-native";
import type { PaymentMethod } from "@/api/types";
import type { SalePaymentInput } from "@/api/endpoints/sales";
import { formatMoney } from "@/lib/format";
import { parseAmountInput, sumAmounts, toAmountString } from "@/lib/money";
import { useTheme } from "@/theme";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

type PaymentSectionProps = {
  methods: PaymentMethod[];
  loading: boolean;
  error: unknown;
  total: string;
  currency: string;
  payments: SalePaymentInput[];
  onChange: (payments: SalePaymentInput[]) => void;
  onRetryMethods?: () => void;
};

/**
 * Split-payment builder. It never decides a sale's total: it takes money
 * against the server total and leaves change to the payment service, which
 * rejects any overpayment that isn't backed by cash.
 */
export function PaymentSection({
  methods,
  loading,
  error,
  total,
  currency,
  payments,
  onChange,
  onRetryMethods,
}: PaymentSectionProps) {
  const { colors, fonts, radii } = useTheme();

  const [methodCode, setMethodCode] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [reference, setReference] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  // Derived rather than copied into state in an effect: the default rail is
  // cash when the business has one, otherwise the first rail in sort order.
  const defaultCode =
    (methods.find((method) => method.type === "cash") ?? methods[0])?.code ?? null;
  const activeCode =
    methodCode && methods.some((method) => method.code === methodCode)
      ? methodCode
      : defaultCode;

  const selected = methods.find((method) => method.code === activeCode) ?? null;

  const paid = useMemo(
    () => sumAmounts(payments.map((payment) => payment.amount)),
    [payments],
  );
  const totalValue = Number(total || 0);
  const remaining = Math.round((totalValue - Number(paid)) * 10_000) / 10_000;
  const change = remaining < 0 ? Math.abs(remaining) : 0;
  const isCash = selected?.type === "cash";

  const addPayment = () => {
    if (!selected) return;

    const typed = parseAmountInput(amountInput);
    const amount = typed ?? (remaining > 0 ? remaining : null);
    if (amount == null || amount <= 0) {
      setValidation("Enter an amount greater than zero.");
      return;
    }

    if (!isCash && amount > remaining + 0.00005) {
      setValidation(
        `${selected.name} cannot exceed the remaining total. Only cash can be overpaid.`,
      );
      return;
    }

    setValidation(null);
    onChange([
      ...payments,
      {
        method: selected.code,
        amount: toAmountString(amount),
        reference: selected.requiresReference ? reference.trim() || null : null,
      },
    ]);
    setAmountInput("");
    setReference("");
  };

  const removePayment = (index: number) => {
    setValidation(null);
    onChange(payments.filter((_, position) => position !== index));
  };

  const methodName = (code: string) =>
    methods.find((method) => method.code === code)?.name ?? code;

  if (loading) {
    return (
      <Card style={styles.card}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="100%" height={44} radius={10} />
        <Skeleton width="100%" height={44} radius={10} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <EmptyState
          icon={Wallet}
          title="Payment methods unavailable"
          description={
            error instanceof Error ? error.message : "Could not load payment methods."
          }
          actionLabel={onRetryMethods ? "Try again" : undefined}
          onAction={onRetryMethods}
          compact
        />
      </Card>
    );
  }

  if (methods.length === 0) {
    return (
      <Card style={styles.card}>
        <EmptyState
          icon={Wallet}
          title="No payment methods"
          description="Add a payment method in the Velora web app before taking payment here."
          compact
        />
      </Card>
    );
  }

  const settled = remaining <= 0.00005;

  return (
    <Card style={styles.card}>
      <Text variant="title">Payment</Text>

      {payments.length > 0 ? (
        <View style={styles.applied}>
          {payments.map((payment, index) => (
            <View key={`${payment.method}-${index}`} style={styles.appliedRow}>
              <View style={styles.appliedText}>
                <Text variant="body" numberOfLines={1}>
                  {methodName(payment.method)}
                </Text>
                {payment.reference ? (
                  <Text variant="caption" numberOfLines={1}>
                    Ref {payment.reference}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 14,
                  color: colors.ink,
                }}
              >
                {formatMoney(payment.amount, currency)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${methodName(payment.method)} payment`}
                hitSlop={8}
                onPress={() => removePayment(index)}
                style={styles.removeButton}
              >
                <Trash2 size={15} color={colors.inkMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {settled ? (
        <View style={[styles.balance, { backgroundColor: colors.successBg, borderRadius: radii.md }]}>
          <Text variant="bodySmall" color={colors.success}>
            Paid in full
          </Text>
          {change > 0.00005 ? (
            <Text
              style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.success }}
            >
              Change {formatMoney(toAmountString(change), currency)}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.balance, { backgroundColor: colors.surfaceMuted, borderRadius: radii.md }]}>
          <Text variant="bodySmall">Remaining</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>
            {formatMoney(toAmountString(Math.max(remaining, 0)), currency)}
          </Text>
        </View>
      )}

      {!settled ? (
        <>
          <Divider />

          <View style={styles.methods}>
            {methods.map((method) => {
              const active = method.code === activeCode;
              return (
                <Pressable
                  key={method.id}
                  accessibilityRole="button"
                  accessibilityLabel={method.name}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setMethodCode(method.code);
                    setValidation(null);
                  }}
                  style={[
                    styles.methodChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                      borderRadius: radii.full,
                    },
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    color={active ? colors.primaryForeground : colors.inkSecondary}
                    numberOfLines={1}
                  >
                    {method.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selected?.requiresReference ? (
            <TextField
              label="Reference"
              value={reference}
              onChangeText={setReference}
              placeholder="Approval code or last 4 digits"
              autoCapitalize="characters"
            />
          ) : null}

          <View style={styles.amountRow}>
            <TextField
              label={`Amount (${currency})`}
              value={amountInput}
              onChangeText={(text) => {
                setAmountInput(text);
                setValidation(null);
              }}
              keyboardType="decimal-pad"
              placeholder={formatMoney(toAmountString(Math.max(remaining, 0)), currency)}
              containerStyle={styles.amountField}
            />
            <Button
              label="Exact"
              variant="secondary"
              size="sm"
              onPress={() => setAmountInput(String(Math.max(remaining, 0)))}
            />
          </View>

          {validation ? (
            <Text variant="caption" color={colors.danger}>
              {validation}
            </Text>
          ) : null}

          <Button
            label="Add payment"
            variant="secondary"
            icon={<Plus size={16} color={colors.ink} />}
            onPress={addPayment}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  applied: {
    gap: 8,
  },
  appliedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appliedText: {
    flex: 1,
    gap: 1,
  },
  removeButton: {
    padding: 4,
  },
  balance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  methods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  amountField: {
    flex: 1,
  },
});
