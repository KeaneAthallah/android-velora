import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Users } from "lucide-react-native";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import { useCustomers, useCreateCustomerMutation } from "@/features/customers/use-customers";
import { AppHeader } from "@/components/layout/app-header";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

export default function CustomersScreen() {
  const { colors } = useTheme();
  const { has } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const customersQuery = useCustomers(search);
  const createMutation = useCreateCustomerMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const customers = customersQuery.data ?? [];

  if (!has("customers.view")) {
    return (
      <Screen>
        <AppHeader title="Customers" subtitle="Directory" showAvatar />
        <View style={styles.stateWrap}>
          <ErrorState forbidden title="Customers not enabled for your role" message="A manager can grant customers view." />
        </View>
      </Screen>
    );
  }

  const submitCreate = async () => {
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    setError(null);
    try {
      await createMutation.mutateAsync({ name: name.trim(), phone, email, address });
      setCreateOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create customer.");
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        showAvatar
        right={
          has("customers.manage") ? (
            <Button
              label="New"
              size="sm"
              onPress={() => {
                setError(null);
                setCreateOpen(true);
              }}
            />
          ) : undefined
        }
      />

      <View style={styles.controls}>
        <SearchField value={searchInput} onChangeText={setSearchInput} placeholder="Search name, phone or email" />
      </View>

      {customersQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={12} />
          ))}
        </View>
      ) : customersQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState message={customersQuery.error instanceof Error ? customersQuery.error.message : "Could not load customers."} onRetry={() => void customersQuery.refetch()} />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState icon={Users} title="No customers yet" description="Add a customer to start tracking sales and loyalty." />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={customersQuery.isRefetching && !customersQuery.isLoading}
              onRefresh={() => void customersQuery.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Text variant="title" numberOfLines={1}>{item.name}</Text>
              <Text variant="caption" numberOfLines={1}>
                {[item.phone, item.email].filter(Boolean).join(" · ") || "No contact details"}
              </Text>
              {item.loyaltyNumber ? (
                <Text variant="caption">Loyalty {item.loyaltyNumber} · {item.loyaltyPoints} pts</Text>
              ) : null}
            </Card>
          )}
        />
      )}

      <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="New customer">
        <View style={styles.form}>
          <TextField label="Name" value={name} onChangeText={setName} />
          <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false} />
          <TextField label="Address" value={address} onChangeText={setAddress} multiline />
          {error ? <Text variant="caption" color={colors.danger}>{error}</Text> : null}
          <Button label={createMutation.isPending ? "Saving…" : "Create"} onPress={() => void submitCreate()} loading={createMutation.isPending} disabled={createMutation.isPending} fullWidth />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { gap: 4 },
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  skeletonWrap: { padding: 16, gap: 10 },
  form: { gap: 12, paddingBottom: 8 },
});