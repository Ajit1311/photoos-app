import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";

import { useAuth } from "../../services/auth/auth-context";
import { colors } from "../../theme/colors";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [registerMode, setRegisterMode] =
    useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit() {
    const cleanEmail =
      email.trim().toLowerCase();

    if (registerMode && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!cleanEmail || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (registerMode && password.length < 6) {
      setError(
        "Password must be at least 6 characters.",
      );
      return;
    }

    try {
      setError(null);
      setLoading(true);

      if (registerMode) {
        await signUp(
          name.trim(),
          cleanEmail,
          password,
        );
      } else {
        await signIn(
          cleanEmail,
          password,
        );
      }
    } catch (err) {
      console.error(
        "[Auth] Submit failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : registerMode
            ? "Unable to create account."
            : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setError(null);
    setRegisterMode((value) => !value);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.content}>
        <Image
          source={require("../../../assets/PhotoOS-brand-master.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          {registerMode
            ? "Create your PhotoOS account"
            : "Welcome to PhotoOS"}
        </Text>

        <Text style={styles.subtitle}>
          {registerMode
            ? "Create your account to continue"
            : "Sign in to continue"}
        </Text>

        <View style={styles.form}>
          {registerMode ? (
            <>
              <Text style={styles.label}>
                Name
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={
                  colors.textMuted
                }
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={
              colors.textMuted
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={
              colors.textMuted
            }
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          {registerMode ? (
            <Text style={styles.helper}>
              A 6-digit OTP will be sent to
              this email.
            </Text>
          ) : null}

          {error ? (
            <Text style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            style={[
              styles.primaryButton,
              loading &&
                styles.primaryButtonDisabled,
            ]}
            onPress={() =>
              void handleSubmit()
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color={colors.surface}
              />
            ) : (
              <Text style={styles.primaryText}>
                {registerMode
                  ? "Create Account"
                  : "Login"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={switchMode}
            disabled={loading}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {registerMode
                ? "Already have an account? Login"
                : "New to PhotoOS? Create Account"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logoImage: {
      width: 72,
      height: 72,
      resizeMode: "contain",
    },
    logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 22,
  },

  logoText: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.surface,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
  },

  form: {
    marginTop: 34,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    marginBottom: 17,
  },

  helper: {
    marginTop: -6,
    marginBottom: 14,
    fontSize: 12,
    color: colors.textSecondary,
  },

  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 14,
  },

  primaryButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  primaryButtonDisabled: {
    opacity: 0.65,
  },

  primaryText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },

  switchButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 8,
  },

  switchText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
