import { photoosRequest } from "../api/photoos-api";

export type ClientContext = {
  profile_id: string;
  studio_id: string;
  client_id: string;
  status: string;
  client: Record<string, unknown>;
};

export type ClientContextResponse = {
  success: boolean;
  profileId: string;
  context: ClientContext;
};

export async function getMyClientContext(): Promise<ClientContextResponse> {
  return photoosRequest<ClientContextResponse>(
    "client-context",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}
