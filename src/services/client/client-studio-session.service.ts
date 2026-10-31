import {
  deleteStorageItem,
  getStorageItem,
  setStorageItem,
} from "../../storage/platform-storage";

const STUDIO_ID_KEY =
  "photoos.client.active_studio_id";

export async function saveClientStudioId(
  studioId: string,
): Promise<void> {
  if (!studioId.trim()) {
    throw new Error("Studio ID is required");
  }

  await setStorageItem(
    STUDIO_ID_KEY,
    studioId.trim(),
  );
}

export async function getClientStudioId(): Promise<
  string | null
> {
  return getStorageItem(STUDIO_ID_KEY);
}

export async function clearClientStudioId(): Promise<void> {
  await deleteStorageItem(
    STUDIO_ID_KEY,
  );
}
