import AsyncStorage from "@react-native-async-storage/async-storage";

const BUSINESS_KEY = "velora.businessId";
const OUTLET_KEY = "velora.outletId";

export async function getStoredBusinessId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(BUSINESS_KEY);
  } catch {
    return null;
  }
}

export async function setStoredBusinessId(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(BUSINESS_KEY, id);
    else await AsyncStorage.removeItem(BUSINESS_KEY);
  } catch {
    // Best effort on startup recovery. The in-memory session still holds a
    // valid business until the next authenticated request.
  }
}

export async function getStoredOutletId(businessId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${OUTLET_KEY}.${businessId}`);
  } catch {
    return null;
  }
}

export async function setStoredOutletId(
  businessId: string,
  id: string | null,
): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(`${OUTLET_KEY}.${businessId}`, id);
    else await AsyncStorage.removeItem(`${OUTLET_KEY}.${businessId}`);
  } catch {
    /* best effort */
  }
}

/** Clear tenant selection. Call on sign out. */
export async function clearTenantPreferences(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tenantKeys = keys.filter(
      (key) => key === BUSINESS_KEY || key.startsWith(`${OUTLET_KEY}.`),
    );
    if (tenantKeys.length > 0) await AsyncStorage.multiRemove(tenantKeys);
  } catch {
    /* best effort */
  }
}
