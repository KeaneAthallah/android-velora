import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "velora_access_token";

let token: string | null = null;

export function getToken(): string | null {
  return token;
}

async function loadToken(): Promise<string | null> {
  if (token) return token;

  if (Platform.OS === "web") {
    try {
      return (await AsyncStorage.getItem(TOKEN_KEY)) ?? null;
    } catch {
      return null;
    }
  }

  try {
    return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function persistToken(next: string | null): Promise<void> {
  token = next;

  if (next == null) {
    if (Platform.OS === "web") {
      try {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } catch {}
    } else {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch {}
    }
    return;
  }

  if (Platform.OS === "web") {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, next);
    } catch {}
    return;
  }

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, next, {
      keychainService: "com.velora.app",
    });
  } catch {
    /* best effort; in-memory token is enough for the current session */
  }
}

export async function loadStoredToken(): Promise<string | null> {
  return loadToken();
}
