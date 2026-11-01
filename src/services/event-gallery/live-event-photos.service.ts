/**
 * Live Event & Photo Synchronization Service
 * Strictly enforces event & portal isolation:
 * - Corporate Events: https://app.photoos.in/api/corporate/photos?eventId=${eventId}
 * - Studio Galleries: https://app.photoos.in/api/gallery/${eventId}
 * Ensures photos from one event are NEVER shown in another event.
 */

export interface LiveEventPhoto {
  id: string;
  eventId: string;
  url: string;
  thumbnailUrl: string;
  name: string;
  uploadedAt?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  category?: string;
}

export interface LiveEventInfo {
  id: string;
  name: string;
  studioName: string;
  studioId?: string;
  shootDate?: string;
  venue?: string;
  type: "corporate" | "studio";
}

export interface LiveGalleryResult {
  success: boolean;
  event: LiveEventInfo;
  photos: LiveEventPhoto[];
  allowDownloads?: boolean;
  watermarkUrl?: string | null;
  error?: string;
}

const BACKEND_BASE_URL = "https://app.photoos.in";

function normalizeMediaUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("/")) {
    return `${BACKEND_BASE_URL}${url}`;
  }
  if (url.includes("127.0.0.1:3000") || url.includes("localhost:3000")) {
    return url.replace(/https?:\/\/(127\.0\.0\.1|localhost):3000/, BACKEND_BASE_URL);
  }
  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    const match = url.match(/\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
    if (match && match[1] && match[2]) {
      return `${BACKEND_BASE_URL}/api/storage/file?bucket=${encodeURIComponent(match[1])}&path=${encodeURIComponent(match[2])}`;
    }
    const simpleMatch = url.match(/\/object\/(?:sign|public)\/([^?]+)/);
    if (simpleMatch && simpleMatch[1]) {
      return `${BACKEND_BASE_URL}/api/storage/file?path=${encodeURIComponent(simpleMatch[1])}`;
    }
  }
  return url;
}

export async function fetchLiveEventGallery(
  eventId: string,
  hintType?: "corporate" | "studio"
): Promise<LiveGalleryResult> {
  const normalizedId = eventId.trim();
  if (!normalizedId) {
    return {
      success: false,
      event: {
        id: "",
        name: "Event Gallery",
        studioName: "Photo Studio",
        type: "studio",
      },
      photos: [],
      error: "No event ID provided.",
    };
  }

  const isCorporate =
    hintType === "corporate" ||
    normalizedId.startsWith("ev_corp_") ||
    normalizedId.startsWith("corp_");

  let fetchedPhotos: LiveEventPhoto[] = [];
  let allowDownloads = false;
  let watermarkUrl: string | null = null;
  let eventInfo: LiveEventInfo = {
    id: normalizedId,
    name: isCorporate ? "Corporate Celebration" : "Live Event Gallery",
    studioName: isCorporate ? "Corporate Office" : "Photo Studio",
    type: isCorporate ? "corporate" : "studio",
  };

  // =========================================================================
  // CASE 1: CORPORATE EVENT
  // Strictly loads only this corporate event's photos from corporate manifest
  // =========================================================================
  if (isCorporate) {
    try {
      const corpRes = await fetch(
        `${BACKEND_BASE_URL}/api/corporate/photos?eventId=${encodeURIComponent(normalizedId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (corpRes.ok) {
        const corpData = await corpRes.json();
        if (typeof corpData?.allowDownloads === "boolean") {
          allowDownloads = corpData.allowDownloads;
        } else {
          allowDownloads = true;
        }
        if (corpData?.watermarkUrl) {
          watermarkUrl = normalizeMediaUrl(corpData.watermarkUrl);
        }
        if (corpData?.success && Array.isArray(corpData.photos)) {
          fetchedPhotos = corpData.photos.map((cp: any, idx: number) => {
            const rawUrl = cp.url || cp.thumbnail_url;
            const fullUrl = normalizeMediaUrl(rawUrl);
            return {
              id: cp.id || `corp_${idx}`,
              eventId: normalizedId,
              url: fullUrl,
              thumbnailUrl: normalizeMediaUrl(cp.thumbnail_url || rawUrl),
              name: cp.name || `Photo ${idx + 1}`,
              uploadedAt: cp.uploaded_at,
              sizeBytes: cp.size_bytes,
              category: "Corporate",
            };
          });
        }
      }
    } catch (corpErr) {
      console.warn("[LiveEventService] Corporate fetch notice:", corpErr);
    }

    // STRICT ISOLATION: A Corporate Event must ONLY load Corporate photos.
    // Under no circumstances should studio photos be leaked into corporate events.
    return {
      success: true,
      event: eventInfo,
      photos: fetchedPhotos,
      allowDownloads,
      watermarkUrl,
    };
  }

  // =========================================================================
  // CASE 2: STUDIO EVENT
  // Strictly loads only this studio event's photos from studio database/gallery
  // NEVER mixes with corporate events!
  // =========================================================================
  try {
    const galleryRes = await fetch(
      `${BACKEND_BASE_URL}/api/gallery/${encodeURIComponent(normalizedId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (galleryRes.ok) {
      const data = await galleryRes.json();
      if (data?.success) {
        if (typeof data?.allowDownloads === "boolean") {
          allowDownloads = data.allowDownloads;
        }
        if (data?.watermarkUrl) {
          watermarkUrl = normalizeMediaUrl(data.watermarkUrl);
        }
        if (data?.event?.name) eventInfo.name = data.event.name;
        if (data?.studio?.name) eventInfo.studioName = data.studio.name;
        if (data?.studio?.id) eventInfo.studioId = data.studio.id;
        if (data?.event?.shoot_date) eventInfo.shootDate = data.event.shoot_date;
        if (data?.event?.venue) eventInfo.venue = data.event.venue;

        if (Array.isArray(data.photos)) {
          fetchedPhotos = data.photos.map((p: any, idx: number) => ({
            id: p.id || `photo_${idx}`,
            eventId: normalizedId,
            url: normalizeMediaUrl(p.originalUrl || p.thumbnailUrl),
            thumbnailUrl: normalizeMediaUrl(p.thumbnailUrl || p.originalUrl),
            name: p.fileName || `Photo ${idx + 1}`,
            uploadedAt: p.uploadedAt,
            width: p.width,
            height: p.height,
            sizeBytes: p.fileSize,
            category: p.category || (idx % 3 === 0 ? "Portraits" : idx % 3 === 1 ? "Ceremony" : "Candid"),
          }));
        }
      }
    }
  } catch (galleryErr) {
    console.warn("[LiveEventService] Studio gallery fetch notice:", galleryErr);
  }

  return {
    success: true,
    event: eventInfo,
    photos: fetchedPhotos,
    allowDownloads,
    watermarkUrl,
  };
}
