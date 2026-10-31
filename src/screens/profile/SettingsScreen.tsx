import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { neumorphicRaised } from "../../theme/shadows";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {[
        "Notifications",
        "Privacy",
        "Security",
        "Terms & Conditions",
        "Privacy Policy",
      ].map((item) => (
        <View key={item} style={styles.row}>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  title: {
    marginTop: 35,
    marginBottom: 25,
    fontSize: 25,
    fontWeight: "700",
    color: colors.text,
  },
  row: {
    height: 56,
    marginBottom: 12,
    paddingHorizontal: 17,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    ...neumorphicRaised,
  },
  text: { fontSize: 13, fontWeight: "600", color: colors.text },
});
