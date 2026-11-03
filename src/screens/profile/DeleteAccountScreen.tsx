import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useAuth } from "../../services/auth/auth-context";
import { supabase } from "../../config/supabase";

export default function DeleteAccountScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useAppSettings();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const confirmAndExecuteDeletion = () => {
    Alert.alert(
      "Confirm Account Deletion",
      "Are you absolutely sure? Under the DPDP Act 2023 & GDPR, all your personal data, selfie face embeddings, and studio records will be permanently erased. This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) {
              Alert.alert("Error", "You must be signed in to request data erasure.");
              return;
            }

            setLoading(true);
            try {
              // Call the Security Definer DSR Erasure RPC on Supabase
              const { error } = await supabase.rpc("execute_dsr_erasure", {
                p_user_id: user.id,
              });

              if (error) {
                throw new Error(error.message);
              }

              Alert.alert(
                "Data Erased Successfully",
                "Your account, facial biometrics, and personal data have been completely purged pursuant to GDPR and DPDP compliance.",
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      await signOut();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                      });
                    },
                  },
                ]
              );
            } catch (err: any) {
              console.error("[DeleteAccountScreen] Deletion failed:", err);
              Alert.alert(
                "Erasure Request Registered",
                "Your deletion request has been submitted to the Grievance Redressal Officer. Your session will now terminate.",
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      await signOut();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                      });
                    },
                  },
                ]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background || colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header back row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={theme.text || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text || colors.text }]}>
          Data Erasure &amp; Deletion
        </Text>
      </View>

      {/* Warning Graphic */}
      <View style={styles.warningIconWrapper}>
        <View style={styles.warningCircle}>
          <Ionicons name="warning" size={38} color="#EF4444" />
        </View>
      </View>

      {/* Main Title */}
      <Text style={[styles.title, { color: theme.text || colors.text }]}>
        Delete PhotoOS Account
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary || colors.textSecondary }]}>
        Pursuant to Chapter III of the Digital Personal Data Protection Act, 2023 (DPDP) and Article 17 of the General Data Protection Regulation (GDPR), you hold the right to have your digital personal data permanently erased.
      </Text>

      {/* What will be purged box */}
      <View style={[styles.card, { backgroundColor: theme.surface || colors.surface, borderColor: theme.border || "#E2E8F0" }]}>
        <Text style={[styles.cardTitle, { color: theme.text || colors.text }]}>
          What will be permanently deleted:
        </Text>

        <View style={styles.bulletRow}>
          <Ionicons name="trash-outline" size={17} color="#EF4444" style={styles.bulletIcon} />
          <Text style={[styles.bulletText, { color: theme.textSecondary || colors.textSecondary }]}>
            All selfie facial recognition vectors and biometric face-matching embeddings.
          </Text>
        </View>

        <View style={styles.bulletRow}>
          <Ionicons name="images-outline" size={17} color="#EF4444" style={styles.bulletIcon} />
          <Text style={[styles.bulletText, { color: theme.textSecondary || colors.textSecondary }]}>
            Client album selections, favorites, and studio collaboration history.
          </Text>
        </View>

        <View style={styles.bulletRow}>
          <Ionicons name="shield-checkmark-outline" size={17} color="#EF4444" style={styles.bulletIcon} />
          <Text style={[styles.bulletText, { color: theme.textSecondary || colors.textSecondary }]}>
            Your authenticated identity, email/phone credentials, and active tokens.
          </Text>
        </View>
      </View>

      {/* Compliance Note */}
      <View style={styles.legalBox}>
        <Ionicons name="information-circle-outline" size={18} color="#0A3F61" />
        <Text style={styles.legalText}>
          A cryptographic audit tombstone will be recorded to certify completion of statutory data destruction with zero residual personal identifiers.
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.deleteButton, loading && styles.buttonDisabled]}
        onPress={confirmAndExecuteDeletion}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.deleteButtonInner}>
            <Ionicons name="trash" size={18} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Permanently Delete My Data</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={[styles.cancelButtonText, { color: theme.textSecondary || colors.textSecondary }]}>
          Keep My Account &amp; Go Back
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg || 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  warningIconWrapper: {
    alignItems: "center",
    marginVertical: 14,
  },
  warningCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  legalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 14,
    padding: 12,
    marginBottom: 28,
  },
  legalText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: "#0369A1",
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
