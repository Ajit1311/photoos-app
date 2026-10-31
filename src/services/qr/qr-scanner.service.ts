import { extractStudioConnectToken } from "./qr-token.service";

export interface StudioQrScanResult {
  valid: boolean;
  token: string | null;
  url: string;
}

export function parseStudioQrValue(
  value: string,
): StudioQrScanResult {
  const normalized = value.trim();

  if (!normalized) {
    return {
      valid: false,
      token: null,
      url: normalized,
    };
  }

  const token = extractStudioConnectToken(normalized);

  return {
    valid: Boolean(token),
    token,
    url: normalized,
  };
}
