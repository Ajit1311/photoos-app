import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  sendEmailOtp,
  verifyEmailOtp,
} from "../../services/auth/email-otp.service";
import { provisionFirebaseUser } from "../../services/client/client-studio-flow.service";
import { useAuth } from "../../services/auth/auth-context";

interface EmailOtpScreenProps {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
}

export function EmailOtpScreen({
  email,
  onVerified,
  onBack,
}: EmailOtpScreenProps) {
  const { markEmailOtpVerified } = useAuth();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function sendInitialOtp() {
      try {
        setSending(true);
        setError(null);

        const response = await sendEmailOtp(email);

        if (!mounted) {
          return;
        }

        setRetryAfter(response.retry_after_seconds ?? 60);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to send OTP",
          );
        }
      } finally {
        if (mounted) {
          setSending(false);
        }
      }
    }

    void sendInitialOtp();

    return () => {
      mounted = false;
    };
  }, [email]);

  useEffect(() => {
    if (retryAfter <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRetryAfter((value) =>
        value > 0 ? value - 1 : 0,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfter]);

  async function handleVerify() {
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await verifyEmailOtp(
        email,
        otp,
      );

      if (!response.success || !response.verified) {
        throw new Error("OTP verification failed");
      }

      // OTP verification updates a Firebase custom claim.
      // Force-refresh the ID token so provisioning receives
      // the latest photoos_email_otp_verified_at claim.

      // Keep AuthContext synchronized with the verified
      // Firebase OTP claim before continuing.
      await markEmailOtpVerified();

      // Provision the Firebase identity into the canonical
      // PhotoOS identity bridge before continuing.
      await provisionFirebaseUser();

      onVerified();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify OTP",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (retryAfter > 0 || sending) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await sendEmailOtp(email);

      setRetryAfter(
        response.retry_after_seconds ?? 60,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend OTP",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✉</Text>
        </View>

        <Text style={styles.title}>
          Verify your email
        </Text>

        <Text style={styles.subtitle}>
          We sent a 6-digit verification code to
        </Text>

        <Text style={styles.email}>
          {email}
        </Text>

        <TextInput
          value={otp}
          onChangeText={(value) =>
            setOtp(
              value
                .replace(/\D/g, "")
                .slice(0, 6),
            )
          }
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          textAlign="center"
          editable={!loading}
          autoFocus
        />

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (loading || sending) &&
              styles.disabledButton,
          ]}
          disabled={loading || sending}
          onPress={() => void handleVerify()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              Verify Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          disabled={
            retryAfter > 0 ||
            sending ||
            loading
          }
          onPress={() => void handleResend()}
          style={styles.resendButton}
        >
          <Text
            style={[
              styles.resendText,
              retryAfter > 0 &&
                styles.resendDisabled,
            ]}
          >
            {retryAfter > 0
              ? `Resend code in ${retryAfter}s`
              : "Resend code"}
          </Text>
        </TouchableOpacity>

        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            disabled={loading}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              Back
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    padding: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
  },

  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  iconText: {
    fontSize: 28,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0A3F61",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  email: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  input: {
    width: "100%",
    height: 58,
    marginTop: 26,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8DEE8",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
    color: "#111827",
  },

  error: {
    marginTop: 12,
    color: "#C62828",
    fontSize: 14,
    textAlign: "center",
  },

  primaryButton: {
    width: "100%",
    height: 54,
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: "#0A3F61",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  resendButton: {
    marginTop: 18,
    padding: 8,
  },

  resendText: {
    color: "#0A3F61",
    fontSize: 15,
    fontWeight: "700",
  },

  resendDisabled: {
    color: "#9CA3AF",
  },

  backButton: {
    marginTop: 8,
    padding: 8,
  },

  backText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
});
