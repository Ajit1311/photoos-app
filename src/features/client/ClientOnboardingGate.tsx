import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LegalAcceptanceScreen } from "../legal/LegalAcceptanceScreen";
import { needsLegalAcceptance } from "../../services/legal/legal-gate.service";
import {
  saveClientStudioId,
} from "../../services/client/client-studio-session.service";
import {
  getMyClientContext,
  type ClientContext,
} from "../../services/client-app/client-context.service";

type ClientOnboardingGateProps = {
  children: React.ReactNode;
};

type GateState =
  | "loading"
  | "legal"
  | "ready"
  | "error";

export function ClientOnboardingGate({
  children,
}: ClientOnboardingGateProps) {
  const [state, setState] =
    useState<GateState>("loading");

  const [studioId, setStudioId] =
    useState<string | null>(null);

  const [clientContext, setClientContext] =
    useState<ClientContext | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  async function checkClientOnboarding() {
    try {
      setState("loading");
      setError(null);

      /*
       * Firebase-authenticated PhotoOS client context.
       *
       * The Edge Function verifies the Firebase ID token
       * and resolves the canonical PhotoOS profile_id.
       */
      const response =
        await getMyClientContext();

      if (
        !response.success ||
        !response.context?.studio_id
      ) {
        throw new Error(
          "Client studio context could not be resolved.",
        );
      }

      const context =
        response.context;

      setClientContext(context);

      const activeStudioId =
        context.studio_id;

      await saveClientStudioId(
        activeStudioId,
      );

      setStudioId(activeStudioId);

      const requiresAcceptance =
        await needsLegalAcceptance(
          activeStudioId,
        );

      if (requiresAcceptance) {
        setState("legal");
        return;
      }

      setState("ready");
    } catch (gateError) {
      console.error(
        "CLIENT ONBOARDING GATE ERROR",
        gateError,
      );

      setClientContext(null);
      setStudioId(null);

      setError(
        gateError instanceof Error
          ? gateError.message
          : "Unable to load client onboarding",
      );

      setState("error");
    }
  }

  useEffect(() => {
    void checkClientOnboarding();
  }, []);

  if (state === "loading") {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#0A3F61"
        />

        <Text style={styles.title}>
          Setting up PhotoOS...
        </Text>

        <Text style={styles.subtitle}>
          Loading your studio...
        </Text>
      </SafeAreaView>
    );
  }

  if (state === "legal") {
    if (!studioId) {
      return null;
    }

    return (
      <LegalAcceptanceScreen
        studioId={studioId}
        onAccepted={() => {
          setState("ready");
        }}
      />
    );
  }

  if (state === "error") {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Unable to continue
          </Text>

          <Text style={styles.errorText}>
            {error ??
              "Something went wrong."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7F9",
    padding: 24,
  },

  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "#0A3F61",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
  },

  errorCard: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A3F61",
    marginBottom: 8,
  },

  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
  },
});
