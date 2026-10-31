const PHOTOOS_SMART_LINK_HOST =
  process.env.EXPO_PUBLIC_PHOTOOS_SMART_LINK_HOST ??
  "https://photoos.app";

export function createStudioSmartLink(token: string): string {
  return `${PHOTOOS_SMART_LINK_HOST}/s/${encodeURIComponent(token)}`;
}

export function createGallerySmartLink(token: string): string {
  return `${PHOTOOS_SMART_LINK_HOST}/g/${encodeURIComponent(token)}`;
}

export function extractGalleryToken(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments.length !== 2 || segments[0] !== "g" || !segments[1]) {
      return null;
    }

    return decodeURIComponent(segments[1]);
  } catch {
    return null;
  }
}

export function extractStudioConnectToken(
  url: string,
): string | null {
  try {
    const parsed = new URL(url);

    const match = parsed.pathname.match(
      /^\/s\/([^/]+)\/?$/,
    );

    if (!match?.[1]) {
      return null;
    }

    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
