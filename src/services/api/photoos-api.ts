import { getSupabaseAccessToken } from "../auth/supabase-auth.service";

const PHOTOOS_API_URL =
  process.env.EXPO_PUBLIC_PHOTOOS_API_URL ??
  "http://192.168.1.3:54321/functions/v1";

const REQUEST_TIMEOUT_MS = 20000;

export async function photoosRequest<T>(
  functionName: string,
  options: RequestInit = {},
): Promise<T> {
  let token: string | null = null;
  try {
    token = await getSupabaseAccessToken();
  } catch {
    token = null;
  }

  const headers = new Headers(options.headers);
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    if (anonKey && !headers.has("apikey")) {
      headers.set("apikey", anonKey);
    }
  } else if (anonKey) {
    headers.set("Authorization", `Bearer ${anonKey}`);
    headers.set("apikey", anonKey);
  }

  if (!headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${PHOTOOS_API_URL}/${functionName}`,
      {
        ...options,
        headers,
        signal: controller.signal,
      },
    );

    const rawText = await response.text();
    let payload: unknown = null;

    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = rawText;
    }

    if (!response.ok) {
      const errorPayload = payload as {
        error?: string | { message?: string };
        message?: string;
      } | null;

      const apiError =
        typeof errorPayload?.error === "string"
          ? errorPayload.error
          : errorPayload?.error &&
              typeof errorPayload.error === "object"
            ? errorPayload.error.message
            : errorPayload?.message;

      throw new Error(
        apiError ||
          `PhotoOS API request failed (${response.status})`,
      );
    }

    return payload as T;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `PhotoOS request timed out after ${
          REQUEST_TIMEOUT_MS / 1000
        } seconds.`,
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("PhotoOS API request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
