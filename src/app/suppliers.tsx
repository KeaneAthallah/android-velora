import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Phone, Truck } from "lucide-react-native";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import {
  useCreateSupplierMutation,
  useSuppliers,
} from "@/features/suppliers/use-suppliers";
import { AppHeader } from "@/components/layout/app-header";
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
import type { Supplier } from "@/api/types";

function SupplierRow({
  supplier,
  onPress,
}: {
  supplier: Supplier;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${supplier.name}`}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <Text variant="body" numberOfLines={1} style={styles.rowName}>
            {supplier.name}
          </Text>
          <Truck size={16} color={colors.inkMuted} />
        </View>
        <Text variant="caption" numberOfLines={1}>
          {supplier.contact || "No contact person"}
        </Text>
        <Text variant="caption" numberOfLines={1} color={colors.inkSecondary}>
          {[supplier.phone, supplier.email].filter(Boolean).join(" · ") ||
            "No phone or email on file"}
        </Text>
      </Card>
    </Pressable>
  );
}

export default function SuppliersScreen() {
  const { colors } = useTheme();
  const { has } = usePermissions();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 300);
  const suppliersQuery = useSuppliers();
  const createMutation = useCreateSupplierMutation();

  const [detail, setDetail] = useState<Supplier | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const suppliers = useMemo(() => {
    const rows = suppliersQuery.data ?? [];
    if (!search) return rows;
    return rows.filter((supplier) =>
      [supplier.name, supplier.contact, supplier.email, supplier.phone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search)),
    );
  }, [suppliersQuery.data, search]);

  const canManage = has("suppliers.manage");

  if (!has("suppliers.view")) {
    return (
      <Screen>
        <AppHeader title="Suppliers" subtitle="Supply contacts" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Suppliers not enabled for your role"
            message="A manager can grant suppliers view."
          />
        </View>
      </Screen>
    );
  }

  const resetForm = () => {
    setName("");
    setContact("");
    setPhone("");
    setEmail("");
    setAddress("");
    setError(null);
  };

  const submitCreate = async () => {
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }

    setError(null);
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        contact: contact.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      setCreateOpen(false);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the supplier.");
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Suppliers"
        subtitle={`${suppliers.length} ${suppliers.length === 1 ? "supplier" : "suppliers"}`}
        showBack
        right={
          canManage ? (
            <Button
              label="New"
              size="sm"
              onPress={() => {
                resetForm();
                setCreateOpen(true);
              }}
            />
          ) : undefined
        }
      />

      <View style={styles.controls}>
        <SearchField
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search name, contact or phone"
          accessibilityLabel="Search suppliers"
        />
      </View>

      {suppliersQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} height={78} radius={12} />
          ))}
        </View>
      ) : suppliersQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            message={
              suppliersQuery.error instanceof Error
                ? suppliersQuery.error.message
                : "Could not load suppliers."
            }
            onRetry={() => void suppliersQuery.refetch()}
          />
        </View>
      ) : suppliers.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            icon={Truck}
            title={search ? "No matching suppliers" : "No suppliers yet"}
            description={
              search
                ? "Try a different name, contact or phone number."
                : "Suppliers are who purchase orders are addressed to."
            }
            actionLabel={search ? "Clear search" : undefined}
            onAction={search ? () => setSearchInput("") : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(supplier) => supplier.id}
          renderItem={({ item }) => (
            <SupplierRow supplier={item} onPress={() => setDetail(item)} />
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={suppliersQuery.isRefetching && !suppliersQuery.isLoading}
              onRefresh={() => void suppliersQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      )}

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description="Supply contact"
      >
        {detail ? (
          <View style={styles.detail}>
            <View style={styles.detailRow}>
              <Text variant="label">Contact</Text>
              <Text variant="body">{detail.contact || "Not set"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="label">Phone</Text>
              <Text variant="body">{detail.phone || "Not set"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="label">Email</Text>
              <Text variant="body">{detail.email || "Not set"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="label">Address</Text>
              <Text variant="body">{detail.address || "Not set"}</Text>
            </View>
            {detail.phone ? (
              <View style={styles.hintRow}>
                <Phone size={14} color={colors.inkMuted} />
                <Text variant="caption" style={styles.hintText}>
                  Purchasing on the web app uses this contact for deliveries.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New supplier"
        description="Saved to this business only"
      >
        <View style={styles.form}>
          <TextField label="Name" value={name} onChangeText={setName} />
          <TextField
            label="Contact person"
            value={contact}
            onChangeText={setContact}
          />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField
            label="Address"
            value={address}
            onChangeText={setAddress}
            multiline
          />
          {error ? (
            <Text variant="caption" color={colors.danger}>
              {error}
            </Text>
          ) : null}
          <Button
            label={createMutation.isPending ? "Saving…" : "Create supplier"}
            onPress={() => void submitCreate()}
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            fullWidth
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: { gap: 4 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowName: { flex: 1 },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { paddingHorizontal: 16, gap: 10 },
  detail: { gap: 12, paddingBottom: 8 },
  detailRow: { gap: 2 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintText: { flex: 1 },
  form: { gap: 12, paddingBottom: 8 },
});
