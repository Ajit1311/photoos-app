import { photoosRequest } from "./photoos-api";

export interface ClientStudioConnectResponse {
  success: boolean;
  connected: boolean;
  studio?: {
    id: string | null;
  };
  membership?: {
    id: string | null;
    profileId: string | null;
    roleId: string | null;
    role: "client";
  };
  message?: string;
}

export interface ClientStudioConnectTokenResponse {
  success: boolean;
  token: string;
  studioId: string;
  expiresAt: string;
}

export async function redeemClientStudioConnectToken(
  token: string,
): Promise<ClientStudioConnectResponse> {
  return photoosRequest<ClientStudioConnectResponse>(
    "client-studio-connect",
    {
      method: "POST",
      body: JSON.stringify({
        action: "redeem",
        token: token.trim(),
      }),
    },
  );
}

export async function createClientStudioConnectToken(
  studioId: string,
): Promise<ClientStudioConnectTokenResponse> {
  return photoosRequest<ClientStudioConnectTokenResponse>(
    "client-studio-connect",
    {
      method: "POST",
      body: JSON.stringify({
        action: "create",
        studioId,
      }),
    },
  );
}
