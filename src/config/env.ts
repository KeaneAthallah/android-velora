const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";

function isHttpAllowed(baseUrl: string): boolean {
  // Expo exposes __DEV__ in the metro bundle.
  const dev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV === "development";
  if (dev) return true;
  return /https:\/\//.test(baseUrl);
}

/**
 * Normalized API root. Must end with `/api/v1`; a trailing slash is trimmed.
 * Empty or malformed values are rejected so the rest of the app can show a
 * clear configuration banner instead of failing cryptically on every request.
 */
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
export const API_CONFIGURED =
  /^https?:\/\/.+\/api\/v1$/.test(API_BASE_URL) && isHttpAllowed(API_BASE_URL);

export const API_DEBUG = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV === "development";
