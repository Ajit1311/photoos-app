import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../services/auth/auth-context";
import { colors } from "../../theme/colors";

type Props = {
  onSuccess?: () => void;
};

export default function LoginScreen({ onSuccess }: Props) {
  const { signInWithGoogle, sendOtp, verifyOtp } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);
  const [countdown, setCountdown] = useState(0);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: any = null;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle Google Login
  async function handleGoogleLogin() {
    try {
      setError(null);
      setInfoMessage(null);
      setGoogleLoading(true);
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      console.error("[Login] Google OAuth failed:", err);
      setError(err?.message || "Google Sign-in could not be completed. Please try OTP.");
    } finally {
      setGoogleLoading(false);
    }
  }

  // Handle Send OTP
  async function handleSendOtp() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address to receive your OTP.");
      return;
    }

    try {
      setError(null);
      setOtpLoading(true);
      setInfoMessage(null);

      const res = await sendOtp(cleanEmail);
      if (res.token) setSessionToken(res.token);
      setOtpSent(true);
      setCountdown(60);
      setInfoMessage(res.message || `A 6-digit verification code has been sent to ${cleanEmail}.`);
    } catch (err: any) {
      console.error("[Login] Send OTP failed:", err);
      setError(err?.message || "Unable to send verification code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  // Handle Verify OTP
  async function handleVerifyOtp() {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setError(null);
      setOtpLoading(true);
      await verifyOtp(email.trim().toLowerCase(), cleanOtp, sessionToken);
      onSuccess?.();
    } catch (err: any) {
      console.error("[Login] Verify OTP failed:", err);
      setError(err?.message || "Verification code is incorrect or has expired.");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* TOP BRAND HERO BANNER */}
        <View style={styles.brandHero}>
          <View style={styles.brandBadge}>
            <Ionicons name="sparkles" size={13} color="#EF8619" />
            <Text style={styles.brandBadgeText}>AI-POWERED CLIENT GALLERY</Text>
          </View>

          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              <Image
                source={require("../../../assets/PhotoOS-brand-master.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.brandTitle}>PhotoOS</Text>
              <Text style={styles.brandTagline}>Studio & Client Experience</Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Sign in to access your event albums, instant AI face search, photo proofing, and studio chats.
          </Text>
        </View>

        {/* AUTH CONTAINER CARD */}
        <View style={styles.authCard}>
          <Text style={styles.cardHeaderTitle}>Quick Secure Sign In</Text>
          <Text style={styles.cardHeaderSubtitle}>
            Password-free sign-in protected by 256-bit encryption.
          </Text>

          {/* 1. GOOGLE LOGIN BUTTON */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={googleLoading || otpLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#0A3F61" />
            ) : (
              <>
                <View style={styles.googleIconBox}>
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* DIVIDER */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH OTP</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 2. OTP FLOW */}
          {!otpSent ? (
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setError(null);
                  }}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.inputField}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.primaryButton, otpLoading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={otpLoading || googleLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formGroup}>
              <View style={styles.otpHeaderRow}>
                <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                <TouchableOpacity onPress={() => setOtpSent(false)}>
                  <Text style={styles.changeEmailText}>Change Email</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.otpTargetText}>Sent to: {email}</Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val.replace(/[^0-9]/g, ""));
                    setError(null);
                  }}
                  placeholder="• • • • • •"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.inputField, styles.otpField]}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.primaryButton, otpLoading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={otpLoading || googleLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>
                    Resend code in {countdown}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp} disabled={otpLoading}>
                    <Text style={styles.resendLinkText}>Resend Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* STATUS NOTICES */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {infoMessage && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color="#0A3F61" />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          )}

          {/* STRICT PRIVACY & LEGAL BADGE */}
          <View style={styles.complianceFooter}>
            <View style={styles.complianceRow}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.complianceText}>
                256-bit AES Encryption • DPDP Act 2023 Compliant
              </Text>
            </View>
            <Text style={styles.complianceSub}>
              By continuing, you agree to PhotoOS Terms of Service and Privacy Policy. Next step requires explicit consent.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
    alignItems: "center",
  },
  brandHero: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#0A3F61",
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#0A3F61",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  brandBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 134, 25, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(239, 134, 25, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  brandBadgeText: {
    color: "#FF9D3B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  brandLogo: {
    width: 36,
    height: 36,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.75)",
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.85)",
  },
  authCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 20,
  },
  googleButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  formGroup: {
    width: "100%",
  },
  otpHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  changeEmailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A3F61",
  },
  otpTargetText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  otpField: {
    letterSpacing: 8,
    fontWeight: "800",
    fontSize: 18,
    color: "#0A3F61",
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0A3F61",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#0A3F61",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  resendRow: {
    alignItems: "center",
    marginTop: 14,
  },
  countdownText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
  resendLinkText: {
    fontSize: 13,
    color: "#0A3F61",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 12,
    borderRadius: 14,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EAF4FB",
    borderWidth: 1,
    borderColor: "rgba(10, 63, 97, 0.2)",
    padding: 12,
    borderRadius: 14,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    color: "#0A3F61",
    fontSize: 13,
    fontWeight: "500",
  },
  complianceFooter: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  complianceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  complianceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  complianceSub: {
    fontSize: 11,
    lineHeight: 16,
    color: "#94A3B8",
  },
});
