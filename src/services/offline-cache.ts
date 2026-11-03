import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "velora.offline.cache.v1";

type CacheShape = {
  products?: { businessId: string; outletId: string | null; data: unknown; savedAt: number };
  categories?: { businessId: string; data: unknown; savedAt: number };
};

async function readCache(): Promise<CacheShape> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : {};
  } catch {
    return {};
  }
}

async function writeCache(cache: CacheShape): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export async function cacheProducts(businessId: string, outletId: string | null, data: unknown): Promise<void> {
  const cache = await readCache();
  cache.products = { businessId, outletId, data, savedAt: Date.now() };
  await writeCache(cache);
}

export async function readCachedProducts(businessId: string): Promise<unknown | null> {
  const cache = await readCache();
  if (cache.products && cache.products.businessId === businessId) {
    return cache.products.data;
  }
  return null;
}

export async function cacheCategories(businessId: string, data: unknown): Promise<void> {
  const cache = await readCache();
  cache.categories = { businessId, data, savedAt: Date.now() };
  await writeCache(cache);
}

export async function readCachedCategories(businessId: string): Promise<unknown | null> {
  const cache = await readCache();
  if (cache.categories && cache.categories.businessId === businessId) {
    return cache.categories.data;
  }
  return null;
}