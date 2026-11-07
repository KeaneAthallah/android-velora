import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQuery } from "@tanstack/react-query";
import { Barcode, Check, PackageSearch, ScanLine } from "lucide-react-native";
import { useTheme } from "@/theme";
import { usePermissions } from "@/providers/auth-provider";
import { useTenant } from "@/providers/tenant-provider";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Screen, ScreenScroll } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { errorMessage } from "@/api/client";
import { fetchProductByBarcode } from "@/api/endpoints/products";
import { useCartStore } from "@/features/pos/cart-store";
import { formatMoney } from "@/lib/format";

const BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "code93",
  "itf14",
  "qr",
] as const;

/** Ignore repeat reads of the same code while the lookup is in flight. */
const RESCAN_COOLDOWN_MS = 1200;

export default function ScanScreen() {
  const { colors, radii } = useTheme();
  const { has } = usePermissions();
  const { business, businessId, outlet } = useTenant();
  const currency = business?.currency ?? "USD";

  const addProduct = useCartStore((state) => state.addProduct);
  const ensureScope = useCartStore((state) => state.ensureScope);

  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [added, setAdded] = useState<string | null>(null);
  const lastScan = useRef(0);

  const canView = has("products.view");

  const lookup = useQuery({
    queryKey: ["barcode", businessId, code],
    queryFn: () => fetchProductByBarcode(code ?? ""),
    enabled: Boolean(businessId) && Boolean(code),
    staleTime: 60_000,
    retry: false,
  });

  const product = lookup.data ?? null;

  const handleScan = useCallback((value: string) => {
    const now = Date.now();
    if (now - lastScan.current < RESCAN_COOLDOWN_MS) return;
    lastScan.current = now;

    setAdded(null);
    setCode(value);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      /* haptics are best-effort */
    });
  }, []);

  const reset = () => {
    setCode(null);
    setAdded(null);
    setManual("");
  };

  const addToSale = (variantId: string | null) => {
    if (!product) return;
    ensureScope(businessId && outlet ? `${businessId}:${outlet.id}` : null);
    addProduct(product, variantId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      /* haptics are best-effort */
    });
    setAdded(product.name);
    setCode(null);
    setManual("");
  };

  if (!canView) {
    return (
      <Screen>
        <AppHeader title="Scan" subtitle="Barcode lookup" showBack />
        <View style={styles.stateWrap}>
          <ErrorState
            forbidden
            title="Scanning needs product access"
            message="A manager can grant products view in the Velora web app."
          />
        </View>
      </Screen>
    );
  }

  const activeVariants = (product?.variants ?? []).filter((variant) => variant.isActive);

  return (
    <Screen>
      <AppHeader title="Scan" subtitle="Point the camera at a barcode" showBack />

      <ScreenScroll contentStyle={styles.content}>
        {permission?.granted ? (
          <View
            style={[
              styles.cameraFrame,
              { borderColor: colors.border, borderRadius: radii.lg },
            ]}
          >
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={
                code ? undefined : ({ data }) => handleScan(data)
              }
            />
            <View style={styles.reticleRow} pointerEvents="none">
              <View style={[styles.reticle, { borderColor: colors.primary }]} />
            </View>
            <View style={styles.hintRow} pointerEvents="none">
              <ScanLine size={14} color="#ffffff" />
              <Text variant="caption" style={styles.hintText}>
                Searching for a catalogue match…
              </Text>
            </View>
          </View>
        ) : (
          <Card style={{ gap: 10 }}>
            <View style={styles.cardHead}>
              <Barcode size={18} color={colors.primary} />
              <Text variant="title">Camera access</Text>
            </View>
            <Text variant="bodySmall">
              Velora uses the camera only to read product barcodes. You can also
              type a code below.
            </Text>
            <Button
              label={permission?.canAskAgain === false ? "Open device settings" : "Allow camera"}
              variant="secondary"
              onPress={() => void requestPermission()}
            />
          </Card>
        )}

        <Card style={{ gap: 10 }}>
          <Text variant="title">Enter a code</Text>
          <TextField
            value={manual}
            onChangeText={setManual}
            placeholder="Scan or type a barcode / SKU"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => manual.trim() && handleScan(manual.trim())}
          />
          <Button
            label="Look up"
            variant="secondary"
            disabled={manual.trim().length === 0}
            onPress={() => handleScan(manual.trim())}
          />
        </Card>

        {added ? (
          <Card style={[styles.addedCard, { backgroundColor: colors.successBg }]}>
            <Check size={16} color={colors.success} />
            <Text variant="bodySmall" color={colors.success} style={{ flex: 1 }}>
              {added} added to the sale. Scan the next item.
            </Text>
          </Card>
        ) : null}

        {code ? (
          <Card style={{ gap: 10 }}>
            <Text variant="caption" color={colors.inkMuted}>
              Code {code}
            </Text>

            {lookup.isPending ? (
              <Skeleton height={64} />
            ) : lookup.isError ? (
              <ErrorState
                title="Lookup failed"
                message={errorMessage(lookup.error, "Check the connection and try again.")}
                onRetry={() => void lookup.refetch()}
              />
            ) : !product ? (
              <>
                <View style={styles.cardHead}>
                  <PackageSearch size={18} color={colors.warning} />
                  <Text variant="title">No product matches</Text>
                </View>
                <Text variant="bodySmall">
                  Nothing in this catalogue uses that barcode or SKU.
                </Text>
                <Button label="Scan again" variant="secondary" onPress={reset} />
              </>
            ) : (
              <>
                <Text variant="title" numberOfLines={2}>
                  {product.name}
                </Text>
                <Text variant="bodySmall" color={colors.inkMuted}>
                  {product.sku} · {formatMoney(product.sellingPrice, currency)}
                </Text>

                {activeVariants.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <Text variant="caption">Choose a variant</Text>
                    {activeVariants.map((variant) => (
                      <Button
                        key={variant.id}
                        label={`${variant.name} — ${formatMoney(
                          variant.sellingPrice ?? product.sellingPrice,
                          currency,
                        )}`}
                        variant="secondary"
                        size="sm"
                        onPress={() => addToSale(variant.id)}
                      />
                    ))}
                  </View>
                ) : (
                  <Button label="Add to sale" onPress={() => addToSale(null)} />
                )}

                <View style={styles.actions}>
                  <Button
                    label="Details"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      router.push({
                        pathname: "/products/[id]",
                        params: { id: product.id },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Scan again"
                    variant="secondary"
                    size="sm"
                    onPress={reset}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </Card>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stateWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  content: { gap: 14 },
  cameraFrame: {
    height: 240,
    overflow: "hidden",
    borderWidth: 1,
    justifyContent: "center",
  },
  reticleRow: { alignItems: "center", justifyContent: "center", flex: 1 },
  reticle: {
    width: 220,
    height: 110,
    borderWidth: 2,
    borderRadius: 14,
    opacity: 0.85,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  hintText: { color: "#ffffff" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  addedCard: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { flexDirection: "row", gap: 8 },
});
