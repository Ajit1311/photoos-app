import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  acceptLegalAgreements,
  getLegalAgreements,
  type LegalAgreement,
} from "../../services/legal/legal-compliance.service";

interface LegalAcceptanceScreenProps {
  studioId: string;
  onAccepted: () => void;
}

export function LegalAcceptanceScreen({
  studioId,
  onAccepted,
}: LegalAcceptanceScreenProps) {
  const [agreements, setAgreements] = useState<
    LegalAgreement[]
  >([]);

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    async function loadAgreements() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await getLegalAgreements("en");

        if (!mounted) {
          return;
        }

        setAgreements(response.agreements ?? []);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load legal agreements",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadAgreements();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleAccept() {
    if (!accepted) {
      setError(
        "Please confirm that you agree to the required agreements.",
      );
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const response =
        await acceptLegalAgreements(studioId);

      if (!response.success || !response.accepted) {
        throw new Error(
          "Unable to record legal acceptance",
        );
      }

      onAccepted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to accept agreements",
      );
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#0A3F61"
        />

        <Text style={styles.loadingText}>
          Loading legal agreements...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={styles.title}>
          Before you continue
        </Text>

        <Text style={styles.subtitle}>
          Please review and accept the PhotoOS
          agreements to continue using this studio.
        </Text>

        <View style={styles.agreementCard}>
          {agreements.map((agreement) => (
            <View
              key={agreement.id}
              style={styles.agreementRow}
            >
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>
                  ✓
                </Text>
              </View>

              <View style={styles.agreementContent}>
                <Text style={styles.agreementTitle}>
                  {agreement.title ??
                    agreement.agreement_type}
                </Text>

                <Text style={styles.version}>
                  Version {agreement.version}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() =>
            setAccepted((value) => !value)
          }
          disabled={accepting}
        >
          <View
            style={[
              styles.checkbox,
              accepted && styles.checkboxActive,
            ]}
          >
            {accepted ? (
              <Text style={styles.checkboxMark}>
                ✓
              </Text>
            ) : null}
          </View>

          <Text style={styles.checkboxText}>
            I have read and agree to the Terms of
            Service, Privacy Policy and Platform
            Agreement.
          </Text>
        </TouchableOpacity>

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!accepted || accepting) &&
              styles.acceptButtonDisabled,
          ]}
          disabled={!accepted || accepting}
          onPress={() => void handleAccept()}
        >
          {accepting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptText}>
              Accept & Continue
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          Your acceptance is recorded against your
          PhotoOS membership.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 14,
    color: "#6B7280",
    fontSize: 15,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  icon: {
    fontSize: 28,
    color: "#0A3F61",
    fontWeight: "800",
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#0A3F61",
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: "#687582",
  },

  agreementCard: {
    marginTop: 28,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
  },

  agreementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF4FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  checkText: {
    color: "#0A3F61",
    fontWeight: "800",
  },

  agreementContent: {
    flex: 1,
  },

  agreementTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#17212B",
  },

  version: {
    marginTop: 3,
    fontSize: 12,
    color: "#8996A0",
  },

  checkboxRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#B9C2CC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },

  checkboxActive: {
    backgroundColor: "#0A3F61",
    borderColor: "#0A3F61",
  },

  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  checkboxText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
  },

  error: {
    marginTop: 14,
    color: "#C62828",
    fontSize: 14,
    lineHeight: 20,
  },

  acceptButton: {
    height: 56,
    marginTop: 24,
    borderRadius: 17,
    backgroundColor: "#0A3F61",
    alignItems: "center",
    justifyContent: "center",
  },

  acceptButtonDisabled: {
    opacity: 0.45,
  },

  acceptText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  footer: {
    marginTop: 18,
    textAlign: "center",
    color: "#9AA4AE",
    fontSize: 12,
    lineHeight: 18,
  },
});
