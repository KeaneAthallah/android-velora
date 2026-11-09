const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";

/** localhost, the emulator alias, and the RFC 1918 LAN ranges. */
function isPrivateHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "10.0.2.2" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function isHttpAllowed(baseUrl: string): boolean {
  // Expo exposes __DEV__ in the metro bundle.
  const dev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV === "development";
  if (dev) return true;
  if (/^https:\/\//.test(baseUrl)) return true;
  // A local build talks to the API over the LAN, so plain http is accepted for
  // private addresses only; a public host still has to be https.
  const host = /^http:\/\/([^/:]+)/.exec(baseUrl)?.[1] ?? "";
  return isPrivateHost(host);
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
