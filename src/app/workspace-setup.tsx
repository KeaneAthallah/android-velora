import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme";
import { useAuth } from "@/providers/auth-provider";
import {
  useCreateWorkspaceMutation,
  useIndustries,
} from "@/features/workspace/use-workspace-setup";
import { AppHeader } from "@/components/layout/app-header";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";

/**
 * First-run setup for an account with no workspace: creates the business (the
 * caller becomes its owner) and its first outlet. When the account already has
 * a business — the "no outlet yet" case — only the outlet section is shown.
 */
export default function WorkspaceSetupScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const existingBusiness = session?.activeBusiness ?? null;
  const needsBusiness = !existingBusiness;

  const industriesQuery = useIndustries();
  const createWorkspace = useCreateWorkspaceMutation();

  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [currency, setCurrency] = useState(existingBusiness?.currency ?? "IDR");
  const [outletName, setOutletName] = useState("");
  const [outletCode, setOutletCode] = useState("PUSAT");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const industries = useMemo(() => industriesQuery.data ?? [], [industriesQuery.data]);
  const selectedIndustry = useMemo(
    () => industries.find((item) => item.slug === industry) ?? null,
    [industries, industry],
  );

  const submit = async () => {
    if (needsBusiness && businessName.trim().length < 2) {
      setError("Give your business a name (at least 2 characters).");
      return;
    }
    if (outletName.trim().length < 2) {
      setError("Give your first outlet a name.");
      return;
    }
    if (outletCode.trim().length < 1) {
      setError("Add a short outlet code, for example PUSAT.");
      return;
    }

    setError(null);
    try {
      await createWorkspace.mutateAsync({
        business: needsBusiness
          ? {
              name: businessName.trim(),
              industry: industry ?? undefined,
              currency: currency.trim().toUpperCase() || undefined,
            }
          : null,
        outlet: {
          name: outletName.trim(),
          code: outletCode.trim().toUpperCase(),
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish setup.");
    }
  };

  return (
    <Screen>
      <AppHeader
        title={needsBusiness ? "Set up your workspace" : "Add an outlet"}
        subtitle={
          needsBusiness
            ? "Business first, then the store you sell from"
            : existingBusiness?.name ?? undefined
        }
        showBack
      />

      <ScreenScroll>
        {needsBusiness ? (
          <Card style={styles.card}>
            <Text variant="title">Business</Text>
            <TextField
              label="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Kopi Senja"
              autoCapitalize="words"
            />
            <TextField
              label="Currency"
              value={currency}
              onChangeText={setCurrency}
              placeholder="IDR"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
            />

            <View style={styles.industryBlock}>
              <Text variant="label">Industry</Text>
              {industriesQuery.isLoading ? (
                <Text variant="caption">Loading industries…</Text>
              ) : industriesQuery.isError ? (
                <Text variant="caption" color={colors.danger}>
                  {industriesQuery.error instanceof Error
                    ? industriesQuery.error.message
                    : "Could not load the industry list."}
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                >
                  {industries.map((item) => {
                    const active = item.slug === industry;
                    return (
                      <Pressable
                        key={item.slug}
                        accessibilityRole="button"
                        accessibilityLabel={item.name}
                        accessibilityState={{ selected: active }}
                        onPress={() => setIndustry(active ? null : item.slug)}
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
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              {selectedIndustry ? (
                <Text variant="caption">
                  Menu, tables and kitchen defaults are tailored for{" "}
                  {selectedIndustry.name}.
                </Text>
              ) : null}
            </View>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text variant="title">First outlet</Text>
          <TextField
            label="Outlet name"
            value={outletName}
            onChangeText={setOutletName}
            placeholder="Kopi Senja - Dago"
            autoCapitalize="words"
          />
          <TextField
            label="Outlet code"
            value={outletCode}
            onChangeText={setOutletCode}
            placeholder="PUSAT"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TextField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Jl. Ir. H. Juanda No. 12, Bandung"
            multiline
          />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="0812 3456 7890"
            keyboardType="phone-pad"
          />
        </Card>

        {error ? (
          <Text variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button
          label={createWorkspace.isPending ? "Setting up…" : "Create workspace"}
          onPress={() => void submit()}
          loading={createWorkspace.isPending}
          disabled={createWorkspace.isPending}
          fullWidth
        />
        <Text variant="caption" align="center">
          You become the owner, so every permission is available straight away.
        </Text>
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginBottom: 16 },
  industryBlock: { gap: 8 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
});
