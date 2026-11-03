import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Wallet } from "lucide-react-native";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import {
  useCashRegisters,
  useShifts,
  useOpenShiftMutation,
  useCloseShiftMutation,
} from "@/features/shifts/use-shifts";
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

export default function ShiftsScreen() {
  const { colors } = useTheme();
  const { has } = useAuth();
  const { business, outlet } = useTenant();
  const currency = business?.currency ?? "USD";

  const registersQuery = useCashRegisters();
  const shiftsQuery = useShifts();
  const openMutation = useOpenShiftMutation();
  const closeMutation = useCloseShiftMutation();

  const registers = registersQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];

  const [openSheet, setOpenSheet] = useState(false);
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [openingCash, setOpeningCash] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);

  const [closingId, setClosingId] = useState<string | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [closeError, setCloseError] = useState<string | null>(null);

  if (!has("shifts.view")) {
    return (
      <Screen>
        <AppHeader title="Shifts" subtitle="Registers" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState forbidden title="Shifts not enabled for your role" message="A manager can grant shifts view." />
        </View>
      </Screen>
    );
  }

  const submitOpen = async () => {
    if (!registerId) {
      setOpenError("Select a register.");
      return;
    }
    const amount = Number(openingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setOpenError("Enter a valid opening cash amount.");
      return;
    }
    setOpenError(null);
    try {
      await openMutation.mutateAsync({
        cashRegisterId: registerId,
        openingCash: openingCash,
        outletId: outlet?.id ?? null,
      });
      setOpenSheet(false);
      setRegisterId(null);
      setOpeningCash("");
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Could not open shift.");
    }
  };

  const submitClose = async () => {
    if (!closingId) return;
    const amount = Number(actualCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setCloseError("Enter a valid counted cash amount.");
      return;
    }
    setCloseError(null);
    try {
      await closeMutation.mutateAsync({ id: closingId, actualCash });
      setClosingId(null);
      setActualCash("");
    } catch (e) {
      setCloseError(e instanceof Error ? e.message : "Could not close shift.");
    }
  };

  const closingShift = shifts.find((s) => s.id === closingId) ?? null;

  return (
    <Screen>
      <AppHeader
        title="Shifts"
        subtitle={`${shifts.length} shifts`}
        showAvatar
        right={
          has("shifts.manage") ? (
            <Button
              label="Open"
              size="sm"
              onPress={() => {
                setOpenError(null);
                setOpenSheet(true);
              }}
            />
          ) : undefined
        }
      />

      {shiftsQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={88} radius={12} />
          ))}
        </View>
      ) : shiftsQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState message={shiftsQuery.error instanceof Error ? shiftsQuery.error.message : "Could not load shifts."} onRetry={() => void shiftsQuery.refetch()} />
        </View>
      ) : shifts.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState icon={Wallet} title="No shifts yet" description="Open a shift to start taking cash." />
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={shiftsQuery.isRefetching && !shiftsQuery.isLoading}
              onRefresh={() => void shiftsQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="title" numberOfLines={1}>{item.registerName}</Text>
                  <Text variant="caption">
                    {item.cashierName} · {formatDateTime(item.openedAt)}
                  </Text>
                </View>
                <Badge
                  label={item.status}
                  tone={item.status === "open" ? "success" : "neutral"}
                />
              </View>
              <Text variant="caption">
                Opening {formatMoney(item.openingCash, currency)}
                {item.status === "closed"
                  ? ` · counted ${formatMoney(item.countedCash ?? "0", currency)}`
                  : ""}
                {item.variance != null && item.status === "closed"
                  ? ` · variance ${formatMoney(item.variance, currency)}`
                  : ""}
              </Text>
              {item.status === "open" && has("shifts.manage") ? (
                <Button
                  label="Close shift"
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setCloseError(null);
                    setActualCash("");
                    setClosingId(item.id);
                  }}
                  fullWidth
                />
              ) : null}
            </Card>
          )}
        />
      )}

      <Sheet visible={openSheet} onClose={() => setOpenSheet(false)} title="Open shift">
        <View style={styles.form}>
          <Text variant="bodySmall">Register</Text>
          <View style={styles.registerList}>
            {registers.map((reg) => {
              const active = reg.id === registerId;
              return (
                <Pressable
                  key={reg.id}
                  onPress={() => setRegisterId(reg.id)}
                  style={[
                    styles.registerChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text variant="bodySmall" color={active ? colors.primaryForeground : colors.inkSecondary}>
                    {reg.name} ({reg.code})
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label={`Opening cash (${currency})`}
            value={openingCash}
            onChangeText={setOpeningCash}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {openError ? <Text variant="caption" color={colors.danger}>{openError}</Text> : null}
          <Button label={openMutation.isPending ? "Opening…" : "Open shift"} onPress={() => void submitOpen()} loading={openMutation.isPending} disabled={openMutation.isPending} fullWidth />
        </View>
      </Sheet>

      <Sheet
        visible={closingId != null}
        onClose={() => {
          if (closeMutation.isPending) return;
          setClosingId(null);
        }}
        title="Close shift"
        description={closingShift ? `${closingShift.registerName} · expected ${formatMoney(closingShift.expectedCash, currency)}` : undefined}
      >
        <View style={styles.form}>
          <TextField
            label={`Counted cash (${currency})`}
            value={actualCash}
            onChangeText={setActualCash}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          {closeError ? <Text variant="caption" color={colors.danger}>{closeError}</Text> : null}
          <Button label={closeMutation.isPending ? "Closing…" : "Close shift"} onPress={() => void submitClose()} loading={closeMutation.isPending} disabled={closeMutation.isPending} fullWidth />
        </View>
      </Sheet>
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
  form: { gap: 12, paddingBottom: 8 },
  registerList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  registerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});