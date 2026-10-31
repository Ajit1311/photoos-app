import { photoosRequest } from "../api/photoos-api";

export type PhotoOSProfile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  created_at: string;
};

export type PhotoOSWorkspace = {
  organization: Record<string, unknown> | null;
  studio: Record<string, unknown> | null;
  membership: {
    id: string;
    profileId: string;
    studioId: string;
    roleId: string | null;
    status: string;
  };
  role: Record<string, unknown> | null;
  permissions: string[];
  flags: Record<string, boolean>;
};

export type PhotoOSBootstrapResponse = {
  success: true;
  bootstrapRequired: boolean;
  user: {
    id: string;
    email: string | null;
  };
  profile: PhotoOSProfile;
  workspace: PhotoOSWorkspace;
};

export async function getPhotoOSIdentity(): Promise<PhotoOSBootstrapResponse> {
  return photoosRequest<PhotoOSBootstrapResponse>(
    "bootstrap",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}
