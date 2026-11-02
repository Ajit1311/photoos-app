import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

  signInWithGoogle: () => Promise<void>;

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
    const unsubscribe = subscribeToSupabaseAuth(async (supabaseUser) => {
      setUser(supabaseUser);

      try {
        if (supabaseUser) {
          const token = await getSupabaseAccessToken();
          const otpVerified = Boolean(
            supabaseUser.app_metadata?.photoos_email_otp_verified_at,
          );

          setEmailOtpVerified(Boolean(token) && otpVerified);
          setPendingOtpEmail(
            token && otpVerified ? null : (supabaseUser.email ?? null),
          );

          try {
            const identity = await getPhotoOSIdentity();
            setPhotoosIdentity(identity);
          } catch (error) {
            console.error("[PhotoOS] Identity bootstrap error:", error);
            setPhotoosIdentity(null);
          }
        } else {
          setPhotoosIdentity(null);
          setEmailOtpVerified(false);
          setPendingOtpEmail(null);
        }
      } catch (error) {
        console.error("[PhotoOS] Supabase auth state error:", error);
        setEmailOtpVerified(false);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
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
        } finally {
          setUser(null);
          setPhotoosIdentity(null);
          setEmailOtpVerified(false);
          setPendingOtpEmail(null);
          setPendingStudioToken(null);
          setPendingGalleryToken(null);
        }
      },

      signInWithGoogle: async () => {
        await signInWithGoogleOAuth();
      },

      sendOtp: async (email: string) => {
        return sendOtpService(email);
      },

      verifyOtp: async (email: string, otp: string, token?: string) => {
        const verifiedUser = await verifyOtpService(email, otp, token);
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
