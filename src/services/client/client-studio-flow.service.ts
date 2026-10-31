import { photoosRequest } from "../api/photoos-api";
import {
  redeemClientStudioConnectToken,
} from "../api/client-studio-connect.service";
import {
  saveClientStudioId,
} from "./client-studio-session.service";

const PHOTOOS_API_URL =
  process.env.EXPO_PUBLIC_PHOTOOS_API_URL ??
  "http://192.168.1.3:54321/functions/v1";

interface ProvisionResponse {
  success: boolean;
  profileId?: string;
  firebaseUid?: string;
  email?: string;
  error?: string;
}

export async function provisionFirebaseUser(): Promise<ProvisionResponse> {
  const payload = await photoosRequest<ProvisionResponse>(
    "provision-firebase-user",
    { method: "POST" },
  );

  if (!payload.success) {
    throw new Error(payload.error ?? "Unable to provision PhotoOS user");
  }

  return payload;
}

export async function completeClientStudioConnection(
  token: string,
) {
  if (!token.trim()) {
    throw new Error(
      "Studio connection token is required",
    );
  }

  await provisionFirebaseUser();

  const connection =
    await redeemClientStudioConnectToken(token);

  if (!connection.success || !connection.connected) {
    throw new Error(
      connection.message ??
        "Unable to connect to studio",
    );
  }

  const studioId = connection.studio?.id;

  if (!studioId) {
    throw new Error(
      "Studio connection succeeded but studio ID is missing",
    );
  }

  await saveClientStudioId(studioId);

  return connection;
}
