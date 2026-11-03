import React from "react";
import {
  Linking,
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

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useAppSettings();

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background || colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={theme.text || colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text || colors.text }]}>Settings</Text>
      </View>

      {/* Preferences Section */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary || colors.textSecondary }]}>
        PREFERENCES &amp; EXPERIENCE
      </Text>

      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.surface || colors.surface, borderColor: theme.border || "#E2E8F0" }]}
        onPress={() => navigation.navigate("Notifications")}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="notifications-outline" size={18} color="#4F46E5" />
          </View>
          <Text style={[styles.text, { color: theme.text || colors.text }]}>Notifications</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary || colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.surface || colors.surface, borderColor: theme.border || "#E2E8F0" }]}
        onPress={() => navigation.navigate("Language")}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, { backgroundColor: "#ECFDF5" }]}>
            <Ionicons name="language-outline" size={18} color="#059669" />
          </View>
          <Text style={[styles.text, { color: theme.text || colors.text }]}>Language / भाषा</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary || colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.surface || colors.surface, borderColor: theme.border || "#E2E8F0" }]}
        onPress={() => navigation.navigate("Appearance")}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="color-palette-outline" size={18} color="#D97706" />
          </View>
          <Text style={[styles.text, { color: theme.text || colors.text }]}>Appearance &amp; Theme</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary || colors.textSecondary} />
      </TouchableOpacity>

      {/* Legal & Compliance Section */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary || colors.textSecondary }]}>
        LEGAL &amp; PRIVACY COMPLIANCE (DPDP &amp; GDPR)
      </Text>

      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.surface || colors.surface, borderColor: theme.border || "#E2E8F0" }]}
        onPress={() => handleOpenUrl("https://photoos.in/privacy-policy")}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#16A34A" />
          </View>
          <Text style={[styles.text, { color: theme.text || colors.text }]}>Privacy Policy</Text>
        </View>
        <Ionicons name="open-outline" size={16} color={theme.textSecondary || colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.surface || colors.surface, borderColor: theme.border || "#E2E8F0" }]}
        onPress={() => handleOpenUrl("https://photoos.in/terms-and-conditions")}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, { backgroundColor: "#F8FAFC" }]}>
            <Ionicons name="document-text-outline" size={18} color="#475569" />
          </View>
          <Text style={[styles.text, { color: theme.text || colors.text }]}>Terms &amp; Conditions</Text>
        </View>
        <Ionicons name="open-outline" size={16} color={theme.textSecondary || colors.textSecondary} />
      </TouchableOpacity>

      {/* Account Deletion / DSR Erasure Section */}
      <Text style={[styles.sectionHeader, { color: "#EF4444" }]}>
        ACCOUNT DELETION &amp; DATA ERASURE
      </Text>

      <TouchableOpacity
        style={[styles.row, styles.deleteRow, { backgroundColor: theme.surface || colors.surface }]}
        onPress={() => navigation.navigate("DeleteAccount")}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </View>
          <div>
            <Text style={[styles.text, { color: "#DC2626", fontWeight: "700" }]}>
              Delete My Account
            </Text>
            <Text style={styles.deleteSubtext}>
              Erase profile, biometric face embeddings &amp; records
            </Text>
          </div>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#DC2626" />
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
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    minHeight: 58,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteRow: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  deleteSubtext: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
  },
});
