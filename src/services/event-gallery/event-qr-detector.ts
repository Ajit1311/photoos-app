import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { getStorageItem, setStorageItem } from "../../storage/platform-storage";

export interface ActiveEventContext {
  eventId: string;
  eventName: string;
  studioName?: string;
  studioId?: string;
  sourceUrl?: string;
  detectedAt?: number;
}

const STORAGE_KEY_ACTIVE_EVENT = "@photoos_active_event_context";

let cachedEventContext: ActiveEventContext | null = null;

export async function detectEventFromUrlOrDeepLink(): Promise<ActiveEventContext | null> {
  if (cachedEventContext) {
    return cachedEventContext;
  }

  let fullUrl: string | null = null;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    fullUrl = window.location.href;
  } else {
    try {
      fullUrl = await Linking.getInitialURL();
    } catch {
      // Ignore link fetch errors
    }
  }

  if (fullUrl) {
    const parsed = parseEventFromUrl(fullUrl);
    if (parsed) {
      cachedEventContext = parsed;
      try {
        await setStorageItem(STORAGE_KEY_ACTIVE_EVENT, JSON.stringify(parsed));
      } catch {
        // Ignore storage error
      }
      return parsed;
    }
  }

  // Fallback to persisted active event in storage
  try {
    const stored = await getStorageItem(STORAGE_KEY_ACTIVE_EVENT);
    if (stored) {
      const parsedStored: ActiveEventContext = JSON.parse(stored);
      cachedEventContext = parsedStored;
      return parsedStored;
    }
  } catch {
    // Ignore parse error
  }

  return null;
}

export function parseEventFromUrl(urlString: string): ActiveEventContext | null {
  try {
    const url = new URL(urlString, "https://photoos.app");
    const params = url.searchParams;

    const eventId =
      params.get("event") ||
      params.get("eventId") ||
      params.get("gallery") ||
      params.get("galleryId");

    if (!eventId) {
      // Check path segments: /gallery/[eventId] or /g/[token]
      const pathParts = url.pathname.split("/").filter(Boolean);
      const galleryIndex = pathParts.findIndex(
        (p) => p === "gallery" || p === "g" || p === "live"
      );
      if (galleryIndex !== -1 && pathParts[galleryIndex + 1]) {
        return {
          eventId: decodeURIComponent(pathParts[galleryIndex + 1]),
          eventName: "Event Gallery",
          detectedAt: Date.now(),
          sourceUrl: urlString,
        };
      }
      return null;
    }

    const eventName =
      params.get("name") ||
      params.get("eventName") ||
      params.get("title") ||
      "Live Event Gallery";

    const studioName =
      params.get("studio") ||
      params.get("studioName") ||
      "Photo Studio";

    const studioId = params.get("studioId") || undefined;

    return {
      eventId: decodeURIComponent(eventId),
      eventName: decodeURIComponent(eventName),
      studioName: decodeURIComponent(studioName),
      studioId: studioId ? decodeURIComponent(studioId) : undefined,
      sourceUrl: urlString,
      detectedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function setActiveEventContext(
  context: ActiveEventContext | null
): Promise<void> {
  cachedEventContext = context;
  if (context) {
    await setStorageItem(STORAGE_KEY_ACTIVE_EVENT, JSON.stringify(context));
  } else {
    await setStorageItem(STORAGE_KEY_ACTIVE_EVENT, "");
  }
}

export function getActiveEventContextSync(): ActiveEventContext | null {
  return cachedEventContext;
}
