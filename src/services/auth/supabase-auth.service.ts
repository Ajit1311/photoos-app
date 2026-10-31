import type { User } from "@supabase/supabase-js";

import { supabase } from "../../config/supabase";

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user || !data.session) {
    throw new Error("Supabase login did not create an authenticated session.");
  }

  return data.user;
}

export async function createSupabaseAccount(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const cleanName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!cleanName) {
    throw new Error("Name is required.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: cleanName,
        name: cleanName,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Supabase account creation did not return a user.");
  }

  if (!data.session) {
    throw new Error(
      "Account created, but no session was issued. Check Supabase email confirmation settings.",
    );
  }

  return data.user;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
}

export async function getSupabaseCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") {
      return null;
    }

    throw error;
  }

  return data.user;
}

export async function refreshSupabaseSession(): Promise<User> {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw error;
  }

  if (!data.user || !data.session) {
    throw new Error("Unable to refresh the Supabase session.");
  }

  return data.user;
}

export function subscribeToSupabaseAuth(
  callback: (user: User | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function updateSupabaseDisplayName(
  name: string,
): Promise<User> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error("Name is required.");
  }

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: cleanName,
      name: cleanName,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Unable to update Supabase user metadata.");
  }

  return data.user;
}

export async function sendSupabasePasswordReset(
  email: string,
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
  );

  if (error) {
    throw error;
  }
}

export async function signOutSupabase(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
