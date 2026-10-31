import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import {
  AppLanguage,
  useAppSettings,
} from "../../context/AppSettingsContext";

const languages: { code: AppLanguage; label: string; sub: string }[] = [
  { code: "English", label: "English", sub: "English (United States / India)" },
  { code: "मराठी", label: "मराठी", sub: "Marathi" },
  { code: "हिन्दी", label: "हिन्दी", sub: "Hindi" },
];

export default function LanguageScreen() {
  const navigation = useNavigation();
  const { language, setLanguage, theme } = useAppSettings();

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
            Language
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.sectionCaption, { color: theme.textSecondary }]}>
          PREFERRED LANGUAGE
        </Text>

        <View
          style={[
            styles.insetCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          {languages.map((item, index) => {
            const selected = language === item.code;

            return (
              <React.Fragment key={item.code}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.option}
                  onPress={() => setLanguage(item.code)}
                >
                  <View style={styles.languageLeft}>
                    <Text
                      style={[
                        styles.language,
                        { color: theme.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.languageSub,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {item.sub}
                    </Text>
                  </View>

                  {selected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.primary}
                    />
                  )}
                </TouchableOpacity>

                {index < languages.length - 1 && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <Text
          style={[
            styles.selectedText,
            { color: theme.textMuted },
          ]}
        >
          Selected: {language}
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

  insetCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  option: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  languageLeft: {
    justifyContent: "center",
  },

  language: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  languageSub: {
    fontSize: 11.5,
    marginTop: 2,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },

  selectedText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
  },
});
