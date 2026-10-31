import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { colors } from "../../theme/colors";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useAuth } from "../../services/auth/auth-context";
import {
  getClientProfile,
  updateClientProfile,
} from "../../services/client-app/client-app.service";
import { updateSupabaseDisplayName } from "../../services/auth/supabase-auth.service";

type ProfileData = {
  id?: string;
  profile_id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function extractProfile(payload: unknown): ProfileData {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const profile =
    asRecord(root?.profile) ??
    asRecord(data?.profile) ??
    asRecord(data?.client) ??
    asRecord(root?.client);

  const source = profile ?? data ?? root;

  return {
    id: typeof source?.id === "string" ? source.id : undefined,
    profile_id:
      typeof source?.profile_id === "string" ? source.profile_id : undefined,
    full_name:
      typeof source?.full_name === "string" ? source.full_name : null,
    first_name:
      typeof source?.first_name === "string" ? source.first_name : null,
    last_name:
      typeof source?.last_name === "string" ? source.last_name : null,
    email: typeof source?.email === "string" ? source.email : null,
    phone: typeof source?.phone === "string" ? source.phone : null,
    avatar_url:
      typeof source?.avatar_url === "string" ? source.avatar_url : null,
  };
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useAppSettings();
  const { user, photoosIdentity, signOut: authSignOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const identityName = photoosIdentity?.profile?.full_name?.trim() || "";
  const firebaseName = String(
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ""
  ).trim();

  const displayName = useMemo(() => {
    if (name.trim()) return name.trim();
    if (profile?.full_name?.trim()) return profile.full_name.trim();
    if (identityName) return identityName;
    if (firebaseName && !firebaseName.includes("@")) return firebaseName;
    return "PhotoOS Member";
  }, [name, profile, identityName, firebaseName]);

  const email = useMemo(() => {
    return (
      profile?.email?.trim() ||
      user?.email?.trim() ||
      ((photoosIdentity?.profile as any)?.email as string | undefined)?.trim() ||
      ""
    );
  }, [profile, user, photoosIdentity]);

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    if (!parts.length) return "PO";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [displayName]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getClientProfile();
      const nextProfile = extractProfile(response);
      setProfile(nextProfile);

      setName(
        nextProfile.full_name?.trim() ||
          identityName ||
          (firebaseName && !firebaseName.includes("@") ? firebaseName : "")
      );

      setPhone(nextProfile.phone?.trim() || "");
    } catch (loadError) {
      setName(
        identityName ||
          (firebaseName && !firebaseName.includes("@") ? firebaseName : "")
      );
      setPhone("");
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load profile."
      );
    } finally {
      setLoading(false);
    }
  }, [identityName, firebaseName]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = useCallback(async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (cleanName.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }
    if (cleanName.includes("@")) {
      setError("Please enter your name, not your email address.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      await updateClientProfile({
        full_name: cleanName,
        phone: cleanPhone || null,
      });

      await updateSupabaseDisplayName(cleanName);

      setProfile((current) => ({
        ...(current ?? {}),
        full_name: cleanName,
        phone: cleanPhone || null,
      }));

      setName(cleanName);
      setPhone(cleanPhone);
      setSaved(true);
      setEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  }, [name, phone]);

  const handleCancel = useCallback(() => {
    setName(
      profile?.full_name?.trim() ||
        identityName ||
        (firebaseName && !firebaseName.includes("@") ? firebaseName : "")
    );
    setPhone(profile?.phone?.trim() || "");
    setError(null);
    setSaved(false);
    setEditing(false);
  }, [profile, identityName, firebaseName]);

  const handleLogout = useCallback(() => {
    Alert.alert("Log out", "Are you sure you want to log out of PhotoOS?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await authSignOut();
          } catch (logoutError) {
            Alert.alert("Unable to log out", "Please try again.");
          }
        },
      },
    ]);
  }, [authSignOut]);

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {/* APPLE LARGE TITLE HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.primary }]}>
              ACCOUNT
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            hitSlop={8}
            style={[
              styles.headerButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons
              name="settings-outline"
              size={19}
              color={theme.text}
            />
          </Pressable>
        </View>

        {/* APPLE ID STYLE HERO CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: `${theme.primary}18` },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {initials}
            </Text>
          </View>

          <View style={styles.heroInfo}>
            <Text
              style={[styles.name, { color: theme.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            <Text
              style={[styles.email, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {email || "PhotoOS Account"}
            </Text>

            <View style={styles.verifiedRow}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={theme.primary}
              />
              <Text style={[styles.verifiedText, { color: theme.primary }]}>
                Verified Client
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            hitSlop={8}
            style={[
              styles.editCircle,
              { backgroundColor: `${theme.primary}15` },
            ]}
            onPress={() => {
              setEditing(true);
              setSaved(false);
              setError(null);
            }}
          >
            <Ionicons name="pencil" size={17} color={theme.primary} />
          </Pressable>
        </View>

        {/* EDIT PROFILE DRAWER */}
        {editing ? (
          <View
            style={[
              styles.editCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Personal Information
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Keep your PhotoOS profile name and phone updated.
            </Text>

            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Full Name
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.surfaceSoft,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={theme.textMuted}
              />
              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setError(null);
                  setSaved(false);
                }}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
                style={[styles.input, { color: theme.text }]}
                maxLength={100}
              />
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Email
            </Text>
            <View
              style={[
                styles.inputWrap,
                styles.disabledInput,
                {
                  backgroundColor: theme.surfaceSoft,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.textMuted}
              />
              <Text
                style={[styles.readOnlyInput, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {email || "Email unavailable"}
              </Text>
              <Ionicons
                name="lock-closed"
                size={14}
                color={theme.textMuted}
              />
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Phone Number
            </Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.surfaceSoft,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={18}
                color={theme.textMuted}
              />
              <TextInput
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/[^\d+\-\s()]/g, "").slice(0, 20));
                  setError(null);
                  setSaved(false);
                }}
                placeholder="Add phone number"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                editable={!saving}
                style={[styles.input, { color: theme.text }]}
                maxLength={20}
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color="#FF3B30"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {saved ? (
              <View style={styles.successBox}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color="#34C759"
                />
                <Text style={styles.successText}>Profile updated successfully.</Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                disabled={saving}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.surfaceSoft,
                    borderColor: theme.border,
                  },
                ]}
                onPress={handleCancel}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: theme.text },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={saving}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.primary },
                  saving && styles.disabledButton,
                ]}
                onPress={() => void handleSave()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Save changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* APPLE SETTINGS INSET GROUP: PREFERENCES */}
        <View style={styles.section}>
          <Text style={[styles.groupHeader, { color: theme.textSecondary }]}>
            PREFERENCES
          </Text>

          <View
            style={[
              styles.insetGroupCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => navigation.navigate("Language")}
            >
              <View
                style={[
                  styles.menuIconSquircle,
                  { backgroundColor: "#007AFF" },
                ]}
              >
                <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
              </View>

              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>
                  Language
                </Text>
                <Text
                  style={[
                    styles.menuSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  App language & locale
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={theme.textMuted}
              />
            </Pressable>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.border },
              ]}
            />

            <Pressable
              style={styles.menuItem}
              onPress={() => navigation.navigate("Appearance")}
            >
              <View
                style={[
                  styles.menuIconSquircle,
                  { backgroundColor: "#5856D6" },
                ]}
              >
                <Ionicons name="contrast-outline" size={18} color="#FFFFFF" />
              </View>

              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>
                  Appearance
                </Text>
                <Text
                  style={[
                    styles.menuSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Light & Dark mode
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={theme.textMuted}
              />
            </Pressable>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.border },
              ]}
            />

            <Pressable
              style={styles.menuItem}
              onPress={() => navigation.navigate("Settings")}
            >
              <View
                style={[
                  styles.menuIconSquircle,
                  { backgroundColor: "#8E8E93" },
                ]}
              >
                <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
              </View>

              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>
                  Settings
                </Text>
                <Text
                  style={[
                    styles.menuSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Preferences & sync
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={theme.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* APPLE SETTINGS INSET GROUP: SECURITY & IDENTITY */}
        <View style={styles.section}>
          <Text style={[styles.groupHeader, { color: theme.textSecondary }]}>
            SECURITY & IDENTITY
          </Text>

          <View
            style={[
              styles.insetGroupCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.menuItem}>
              <View
                style={[
                  styles.menuIconSquircle,
                  { backgroundColor: "#34C759" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>
                  Protected Identity
                </Text>
                <Text
                  style={[
                    styles.menuSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  End-to-end encrypted sessions
                </Text>
              </View>

              <Ionicons
                name="checkmark"
                size={18}
                color="#34C759"
              />
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <Pressable
          accessibilityRole="button"
          style={[
            styles.logoutButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={19} color="#FF3B30" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={[styles.version, { color: theme.textMuted }]}>
          PhotoOS Pro · v1.0.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 2,
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.6,
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 22,
    fontWeight: "700",
  },

  heroInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },

  name: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  email: {
    fontSize: 12.5,
    marginTop: 2,
  },

  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 4,
  },

  verifiedText: {
    fontSize: 11.5,
    fontWeight: "600",
  },

  editCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  editCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },

  section: {
    marginBottom: 20,
  },

  groupHeader: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 8,
  },

  insetGroupCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },

  label: {
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 6,
  },

  inputWrap: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  disabledInput: {
    opacity: 0.7,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },

  readOnlyInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },

  primaryButton: {
    flex: 1.5,
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  disabledButton: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },

  errorText: {
    fontSize: 12,
    color: "#FF3B30",
  },

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },

  successText: {
    fontSize: 12,
    color: "#34C759",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  menuIconSquircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  menuText: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  menuSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },

  logoutButton: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF3B30",
  },

  version: {
    textAlign: "center",
    fontSize: 11.5,
    fontWeight: "500",
  },
});
