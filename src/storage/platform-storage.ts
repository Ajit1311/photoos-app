import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const memoryStorageFallback = new Map<string, string>();

export async function setStorageItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback if QuotaExceededError or private browsing
      memoryStorageFallback.set(key, value);
      return;
    }
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryStorageFallback.set(key, value);
  }
}

export async function getStorageItem(
  key: string,
): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : memoryStorageFallback.get(key) ?? null;
      }
    } catch {
      return memoryStorageFallback.get(key) ?? null;
    }
  }

  try {
    const val = await SecureStore.getItemAsync(key);
    return val !== null ? val : memoryStorageFallback.get(key) ?? null;
  } catch {
    return memoryStorageFallback.get(key) ?? null;
  }
}

export async function deleteStorageItem(
  key: string,
): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    memoryStorageFallback.delete(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
  memoryStorageFallback.delete(key);
}
