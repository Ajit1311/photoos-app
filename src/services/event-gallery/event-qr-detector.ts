import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { getStorageItem, setStorageItem } from "../../storage/platform-storage";

export interface ActiveEventContext {
  eventId: string;
  eventName: string;
  studioName?: string;
  studioId?: string;
  type: "corporate" | "studio";
  sourceUrl?: string;
  detectedAt?: number;
}

const STORAGE_KEY_ACTIVE_EVENT = "@photoos_active_event_context";

let cachedEventContext: ActiveEventContext | null = null;

export async function detectEventFromUrlOrDeepLink(): Promise<ActiveEventContext | null> {
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

  // 1. Current URL always takes highest precedence (switches active event on new QR scan)
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

  // 2. In-memory cached event
  if (cachedEventContext) {
    return cachedEventContext;
  }

  // 3. Fallback to persisted active event in storage
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
    let params = url.searchParams;

    // If query params are empty, check if hash contains query string (e.g. #/?event=... or #event=...)
    if (!params.get("event") && !params.get("eventId") && url.hash) {
      const hashContent = url.hash.replace(/^#\/?/, "");
      if (hashContent.includes("?")) {
        const hashQuery = hashContent.split("?")[1];
        params = new URLSearchParams(hashQuery);
      } else if (hashContent.includes("=")) {
        params = new URLSearchParams(hashContent);
      }
    }

    const eventId =
      params.get("event") ||
      params.get("eventId") ||
      params.get("gallery") ||
      params.get("galleryId");

    const rawType = params.get("type");
    const detectedType: "corporate" | "studio" =
      rawType === "corporate" || (eventId && (eventId.startsWith("ev_corp_") || eventId.startsWith("corp_")))
        ? "corporate"
        : "studio";

    if (!eventId) {
      // Check path segments: /gallery/[eventId] or /g/[token]
      const pathParts = url.pathname.split("/").filter(Boolean);
      const galleryIndex = pathParts.findIndex(
        (p) => p === "gallery" || p === "g" || p === "live"
      );
      if (galleryIndex !== -1 && pathParts[galleryIndex + 1]) {
        const resolvedId = decodeURIComponent(pathParts[galleryIndex + 1]);
        return {
          eventId: resolvedId,
          eventName: "Live Event Gallery",
          studioName: "Photo Studio",
          type: resolvedId.startsWith("ev_corp_") ? "corporate" : "studio",
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
      (detectedType === "corporate" ? "Corporate Celebration" : "Live Event Gallery");

    const studioName =
      params.get("studio") ||
      params.get("studioName") ||
      params.get("company") ||
      params.get("companyName") ||
      (detectedType === "corporate" ? "Corporate Office" : "Photo Studio");

    const studioId =
      params.get("studioId") ||
      params.get("companyId") ||
      undefined;

    return {
      eventId: decodeURIComponent(eventId),
      eventName: decodeURIComponent(eventName),
      studioName: decodeURIComponent(studioName),
      studioId: studioId ? decodeURIComponent(studioId) : undefined,
      type: detectedType,
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
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const fromUrl = parseEventFromUrl(window.location.href);
    if (fromUrl) {
      cachedEventContext = fromUrl;
      return fromUrl;
    }
  }
  return cachedEventContext;
}
