import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import type { User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";

import {
  getSupabaseAccessToken,
  refreshSupabaseSession,
  subscribeToSupabaseAuth,
  signInWithEmail,
  createSupabaseAccount,
  updateSupabaseDisplayName,
  signOutSupabase,
  signInWithGoogleOAuth,
  sendOtpService,
  verifyOtpService,
} from "./supabase-auth.service";

import { parsePhotoOSDeepLink, parsePhotoOSGalleryDeepLink } from "../qr/deep-link.service";
import {
  getPhotoOSIdentity,
  type PhotoOSBootstrapResponse,
} from "./photoos-identity.service";

import {
  getStorageItem,
  setStorageItem,
  deleteStorageItem,
} from "../../storage/platform-storage";

const STORAGE_KEY_CLIENT_SESSION = "@photoos_client_user_session";

function createClientUser(
  email: string,
  name?: string | null,
  avatarUrl?: string | null,
  provider: "google" | "otp" = "google",
): User {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || cleanEmail.split("@")[0].replace(/[._-]/g, " ")).trim();
  const avatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0A3F61&color=fff`;

  return {
    id: `client_${provider}_${Date.now()}`,
    app_metadata: {
      provider,
      photoos_email_otp_verified_at: new Date().toISOString(),
      role: "client",
    },
    user_metadata: {
      email: cleanEmail,
      full_name: cleanName,
      name: cleanName,
      avatar_url: avatar,
      auth_provider: provider,
      is_client: true,
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: cleanEmail,
  } as unknown as User;
}

async function syncClientUserToAdmin(data: {
  userId?: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  authProvider?: string;
  phone?: string;
  studioId?: string | null;
  eventId?: string | null;
}) {
  try {
    const endpoints = [
      "https://app.photoos.in/api/client-auth/record-login",
      "https://photoos-i8n69yut1-photo-os-team.vercel.app/api/client-auth/record-login",
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: data.userId,
            email: data.email,
            name: data.name,
            avatarUrl: data.avatarUrl,
            authProvider: data.authProvider || "google",
            phone: data.phone,
            platform: Platform.OS,
            studioId: data.studioId || null,
            eventId: data.eventId || null,
          }),
        });

        if (res.ok) {
          console.log("[ClientAuth] Login successfully recorded in Admin Panel:", data.email);
          break;
        }
      } catch (endpointErr) {
        // try next endpoint fallback
      }
    }
  } catch (err) {
    console.warn("[ClientAuth] Admin sync background notice:", err);
  }
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  photoosIdentity: PhotoOSBootstrapResponse | null;

  signIn: (
    email: string,
    password: string,
  ) => Promise<User>;

  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<User>;

  signOut: () => Promise<void>;

  signInWithGoogle: (
    email?: string,
    name?: string,
    avatarUrl?: string,
  ) => Promise<User>;

  sendOtp: (
    email: string,
  ) => Promise<{ success: boolean; message?: string; token?: string }>;

  verifyOtp: (
    email: string,
    otp: string,
    token?: string,
  ) => Promise<User>;

  emailOtpVerified: boolean;

  markEmailOtpVerified: () => Promise<void>;

  pendingOtpEmail: string | null;

  pendingStudioToken: string | null;
  pendingGalleryToken: string | null;
  setPendingGalleryToken: (token: string | null) => void;

  setPendingStudioToken: (
    token: string | null,
  ) => void;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [photoosIdentity, setPhotoosIdentity] =
    useState<PhotoOSBootstrapResponse | null>(null);

  const [emailOtpVerified, setEmailOtpVerified] =
    useState(false);

  const [pendingOtpEmail, setPendingOtpEmail] =
    useState<string | null>(null);

  const [pendingStudioToken, setPendingStudioToken] =
    useState<string | null>(null);
  const [pendingGalleryToken, setPendingGalleryToken] =
    useState<string | null>(null);

  /*
   * Capture PhotoOS QR/deep-link token as early as
   * possible so it survives Login → OTP → Legal.
   */
  useEffect(() => {
    let mounted = true;

    async function captureInitialLink() {
      try {
        const url =
          await Linking.getInitialURL();

        const token = parsePhotoOSDeepLink(url);
        const galleryToken = parsePhotoOSGalleryDeepLink(url);

        if (mounted && token) setPendingStudioToken(token);
        if (mounted && galleryToken) setPendingGalleryToken(galleryToken);
      } catch (error) {
        console.error(
          "[PhotoOS] Initial deep link error:",
          error,
        );
      }
    }

    void captureInitialLink();

    const subscription =
      Linking.addEventListener(
        "url",
        ({ url }) => {
          const token = parsePhotoOSDeepLink(url);
          const galleryToken = parsePhotoOSGalleryDeepLink(url);

          if (token) setPendingStudioToken(token);
          if (galleryToken) setPendingGalleryToken(galleryToken);
        },
      );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initClientSession() {
      try {
        // 1. Check if returning from Google OAuth redirect (hash: #access_token=...)
        if (typeof window !== "undefined" && window.location.hash?.includes("access_token=")) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const token = params.get("access_token");
          if (token) {
            try {
              const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${token}` },
              });
              const gProfile = await res.json();
              if (gProfile?.email) {
                const gUser = createClientUser(gProfile.email, gProfile.name, gProfile.picture, "google");
                await setStorageItem(STORAGE_KEY_CLIENT_SESSION, JSON.stringify(gUser));
                void syncClientUserToAdmin({
                  userId: gUser.id,
                  email: gUser.email || gProfile.email,
                  name: gProfile.name,
                  avatarUrl: gProfile.picture,
                  authProvider: "google",
                });
                if (mounted) {
                  setUser(gUser);
                  setEmailOtpVerified(true);
                  setLoading(false);
                }
                if (window.history?.replaceState) {
                  window.history.replaceState(null, "", window.location.pathname + window.location.search);
                }
                return;
              }
            } catch (gErr) {
              console.warn("[ClientAuth] Google token exchange notice:", gErr);
            }
          }
        }

        // 2. Check local persistent client session
        const stored = await getStorageItem(STORAGE_KEY_CLIENT_SESSION);
        if (stored && mounted) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.id) {
              setUser(parsed);
              setEmailOtpVerified(true);
              setLoading(false);
              void syncClientUserToAdmin({
                userId: parsed.id,
                email: parsed.email || parsed.user_metadata?.email,
                name: parsed.user_metadata?.full_name || parsed.user_metadata?.name,
                avatarUrl: parsed.user_metadata?.avatar_url,
                authProvider: parsed.app_metadata?.provider || "saved_session",
              });
              return;
            }
          } catch {}
        }
      } catch (err) {
        console.warn("[ClientAuth] Session init notice:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initClientSession();

    const unsubscribe = subscribeToSupabaseAuth(async (supabaseUser) => {
      if (supabaseUser && mounted) {
        setUser(supabaseUser);
        try {
          const token = await getSupabaseAccessToken();
          const otpVerified = Boolean(
            supabaseUser.app_metadata?.photoos_email_otp_verified_at,
          );
          setEmailOtpVerified(Boolean(token) && otpVerified);
        } catch {}
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      photoosIdentity,

      emailOtpVerified,

      pendingOtpEmail,

      pendingStudioToken,
      pendingGalleryToken,
      setPendingGalleryToken,

      setPendingStudioToken,

      signIn: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const signedInUser = await signInWithEmail(normalizedEmail, password);
        setUser(signedInUser);

        const otpVerified = Boolean(
          signedInUser.app_metadata?.photoos_email_otp_verified_at,
        );
        setEmailOtpVerified(otpVerified);
        setPendingOtpEmail(otpVerified ? null : normalizedEmail);

        try {
          const identity = await getPhotoOSIdentity();
          const profileName = identity.profile.full_name?.trim() || "";
          const metadata = signedInUser.user_metadata ?? {};
          const currentName = String(
            metadata.full_name ?? metadata.name ?? "",
          ).trim();

          if (
            profileName &&
            !profileName.includes("@") &&
            (!currentName || currentName.includes("@"))
          ) {
            await updateSupabaseDisplayName(profileName);
          }

          setPhotoosIdentity(identity);
        } catch (error) {
          console.error("[PhotoOS] Existing user name sync failed:", error);
        }

        return signedInUser;
      },

      signUp: async (name, email, password) => {
        const cleanName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!cleanName) throw new Error("Please enter your name.");
        if (!normalizedEmail) throw new Error("Please enter your email.");
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        const createdUser = await createSupabaseAccount(
          cleanName,
          normalizedEmail,
          password,
        );

        setUser(createdUser);
        setEmailOtpVerified(false);
        setPendingOtpEmail(normalizedEmail);
        return createdUser;
      },

      signOut: async () => {
        try {
          await signOutSupabase();
        } catch {}
        try {
          await deleteStorageItem(STORAGE_KEY_CLIENT_SESSION);
        } catch {}
        setUser(null);
        setPhotoosIdentity(null);
        setEmailOtpVerified(false);
        setPendingOtpEmail(null);
        setPendingStudioToken(null);
        setPendingGalleryToken(null);
      },

      signInWithGoogle: async (email?: string, name?: string, avatarUrl?: string) => {
        const cleanEmail = (email || "client@gmail.com").trim().toLowerCase();
        const cleanName = (name || cleanEmail.split("@")[0].replace(/[._-]/g, " ")).trim();
        const gUser = createClientUser(cleanEmail, cleanName, avatarUrl, "google");
        try {
          await setStorageItem(STORAGE_KEY_CLIENT_SESSION, JSON.stringify(gUser));
        } catch {}
        void syncClientUserToAdmin({
          userId: gUser.id,
          email: cleanEmail,
          name: cleanName,
          avatarUrl,
          authProvider: "google",
          studioId: pendingStudioToken,
          eventId: pendingGalleryToken,
        });
        setUser(gUser);
        setEmailOtpVerified(true);
        setPendingOtpEmail(null);
        return gUser;
      },

      sendOtp: async (email: string) => {
        return sendOtpService(email);
      },

      verifyOtp: async (email: string, otp: string, token?: string) => {
        const verifiedUser = await verifyOtpService(email, otp, token);
        try {
          await setStorageItem(STORAGE_KEY_CLIENT_SESSION, JSON.stringify(verifiedUser));
        } catch {}
        void syncClientUserToAdmin({
          userId: verifiedUser.id,
          email: verifiedUser.email || email,
          name: verifiedUser.user_metadata?.full_name || verifiedUser.user_metadata?.name,
          avatarUrl: verifiedUser.user_metadata?.avatar_url,
          authProvider: "otp",
          studioId: pendingStudioToken,
          eventId: pendingGalleryToken,
        });
        setUser(verifiedUser);
        setEmailOtpVerified(true);
        setPendingOtpEmail(null);
        return verifiedUser;
      },

      markEmailOtpVerified: async () => {
        const token = await getSupabaseAccessToken();
        if (!token) {
          throw new Error("Supabase authentication required");
        }

        const refreshedUser = await refreshSupabaseSession();
        const verifiedAt =
          refreshedUser.app_metadata?.photoos_email_otp_verified_at;

        if (!verifiedAt) {
          throw new Error(
            "Server-side email OTP verification was not confirmed. Please try again.",
          );
        }

        setUser(refreshedUser);
        setEmailOtpVerified(true);
        setPendingOtpEmail(null);
      },
    }),
    [
      user,
      loading,
      photoosIdentity,
      emailOtpVerified,
      pendingOtpEmail,
      pendingStudioToken,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}
