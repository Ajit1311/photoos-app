import { photoosRequest } from "../api/photoos-api";

export interface EventQrTokenInfo {
  token_id: string;
  gallery_id: string;
  expires_at: string | null;
  view_count: number;
  max_views: number | null;
  is_active: boolean;
}

export interface EventGalleryContext {
  token: string;
  tokenInfo: EventQrTokenInfo;
}

interface RpcResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

export async function validateEventQrToken(
  token: string,
): Promise<EventQrTokenInfo> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("Event QR token is required.");
  }

  const response = await photoosRequest<RpcResponse<EventQrTokenInfo>>(
    "event-gallery-access",
    {
      method: "POST",
      body: JSON.stringify({
        action: "validate",
        token: normalizedToken,
      }),
    },
  );

  if (!response?.data) {
    throw new Error(
      response?.error ?? "Unable to validate event gallery QR.",
    );
  }

  return response.data;
}

export async function resolveEventGalleryContext(
  token: string,
): Promise<EventGalleryContext> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("Event QR token is required.");
  }

  const tokenInfo = await validateEventQrToken(normalizedToken);

  if (!tokenInfo.is_active) {
    throw new Error("This event gallery QR code is no longer active.");
  }

  if (
    tokenInfo.expires_at &&
    new Date(tokenInfo.expires_at).getTime() <= Date.now()
  ) {
    throw new Error("This event gallery QR code has expired.");
  }

  return {
    token: normalizedToken,
    tokenInfo,
  };
}
