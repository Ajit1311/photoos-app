/**
 * Live Event & Photo Synchronization Service
 * Fetches real event photos from PhotoOS production APIs:
 * - Studio Galleries: https://app.photoos.in/api/gallery/${eventId}
 * - Corporate Events: https://app.photoos.in/api/corporate/photos?eventId=${eventId}
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
  error?: string;
}

const BACKEND_BASE_URL = "https://app.photoos.in";

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
  let eventInfo: LiveEventInfo = {
    id: normalizedId,
    name: isCorporate ? "Corporate Celebration" : "Live Event Gallery",
    studioName: isCorporate ? "Corporate Office" : "Photo Studio",
    type: isCorporate ? "corporate" : "studio",
  };

  // 1. Primary Attempt: /api/gallery/[eventId] (Supports both Studio and Corporate manifests)
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
        if (data?.event?.name) eventInfo.name = data.event.name;
        if (data?.studio?.name) eventInfo.studioName = data.studio.name;
        if (data?.studio?.id) eventInfo.studioId = data.studio.id;
        if (data?.event?.shoot_date) eventInfo.shootDate = data.event.shoot_date;
        if (data?.event?.venue) eventInfo.venue = data.event.venue;

        if (Array.isArray(data.photos) && data.photos.length > 0) {
          fetchedPhotos = data.photos.map((p: any, idx: number) => ({
            id: p.id || `photo_${idx}`,
            eventId: normalizedId,
            url: p.originalUrl || p.thumbnailUrl,
            thumbnailUrl: p.thumbnailUrl || p.originalUrl,
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
    console.warn("[LiveEventService] /api/gallery fetch notice:", galleryErr);
  }

  // 2. Fallback Attempt for Corporate Events: /api/corporate/photos
  if (fetchedPhotos.length === 0) {
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
        if (corpData?.success && Array.isArray(corpData.photos)) {
          fetchedPhotos = corpData.photos.map((cp: any, idx: number) => ({
            id: cp.id || `corp_${idx}`,
            eventId: normalizedId,
            url: cp.url || cp.thumbnail_url,
            thumbnailUrl: cp.thumbnail_url || cp.url,
            name: cp.name || `Photo ${idx + 1}`,
            uploadedAt: cp.uploaded_at,
            sizeBytes: cp.size_bytes,
            category: "Corporate",
          }));
        }
      }
    } catch (corpErr) {
      console.warn("[LiveEventService] /api/corporate/photos fallback notice:", corpErr);
    }
  }

  return {
    success: true,
    event: eventInfo,
    photos: fetchedPhotos,
  };
}
