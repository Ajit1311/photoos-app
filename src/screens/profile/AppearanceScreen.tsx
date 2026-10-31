import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAppSettings } from "../../context/AppSettingsContext";

export default function AppearanceScreen() {
  const navigation = useNavigation();
  const { darkMode, setDarkMode, theme } = useAppSettings();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: theme.background },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.title,
              { color: theme.text },
            ]}
          >
            Appearance
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>
          THEME
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: darkMode ? "#5856D6" : "#FF9500" },
            ]}
          >
            <Ionicons
              name={darkMode ? "moon" : "sunny"}
              size={20}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.textWrap}>
            <Text
              style={[
                styles.name,
                { color: theme.text },
              ]}
            >
              Dark Mode
            </Text>

            <Text
              style={[
                styles.description,
                { color: theme.textSecondary },
              ]}
            >
              {darkMode
                ? "Dark appearance is enabled across the app."
                : "Standard light appearance is enabled."}
            </Text>
          </View>

          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{
              false: "#E5E5EA",
              true: "#34C759",
            }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text
          style={[
            styles.status,
            { color: theme.textMuted },
          ]}
        >
          {darkMode ? "Dark appearance active" : "Light appearance active"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  headerSpacer: {
    width: 38,
  },

  sectionCaption: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 6,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  textWrap: {
    flex: 1,
    marginRight: 10,
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  description: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
  },

  status: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
  },
});
