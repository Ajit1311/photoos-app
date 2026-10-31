import { createClient } from "@supabase/supabase-js";

import {
  deleteStorageItem,
  getStorageItem,
  setStorageItem,
} from "../storage/platform-storage";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage: {
        getItem: getStorageItem,
        setItem: setStorageItem,
        removeItem: deleteStorageItem,
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
