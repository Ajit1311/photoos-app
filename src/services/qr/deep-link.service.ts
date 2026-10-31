import * as Linking from "expo-linking";

import {
  extractStudioConnectToken,
  extractGalleryToken,
} from "./qr-token.service";

export function parsePhotoOSDeepLink(
  url: string | null,
): string | null {
  if (!url) {
    return null;
  }

  return extractStudioConnectToken(url);
}

export function parsePhotoOSGalleryDeepLink(
  url: string | null,
): string | null {
  if (!url) return null;
  return extractGalleryToken(url);
}

export async function getInitialPhotoOSDeepLink(): Promise<string | null> {
  const url = await Linking.getInitialURL();

  return parsePhotoOSDeepLink(url);
}

export function subscribeToPhotoOSDeepLinks(
  callback: (token: string) => void,
): () => void {
  const subscription = Linking.addEventListener(
    "url",
    ({ url }) => {
      const token = parsePhotoOSDeepLink(url);

      if (token) {
        callback(token);
      }
    },
  );

  return () => subscription.remove();
}
