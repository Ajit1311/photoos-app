import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { neumorphicRaised } from "../../theme/shadows";

export default function FaceMatchResultsScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Your Matched Photos</Text>
          <Text style={styles.subtitle}>48 photos found</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
          <View>
            <Text style={styles.summaryTitle}>AI Face Match Complete</Text>
            <Text style={styles.summaryText}>48 matching photos found</Text>
          </View>
        </View>

        {["Wedding Gallery", "Pre Wedding"].map((album) => (
          <View key={album} style={styles.album}>
            <View style={styles.albumHeader}>
              <Text style={styles.albumTitle}>{album}</Text>
              <Text style={styles.count}>24 photos</Text>
            </View>

            <View style={styles.grid}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <TouchableOpacity key={item} style={styles.photo}>
                  <Ionicons name="image-outline" size={27} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  content: { padding: spacing.xl, paddingBottom: 110 },
  summary: {
    padding: 17,
    borderRadius: 20,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...neumorphicRaised,
  },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  summaryText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  album: { marginTop: 27 },
  albumHeader: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  albumTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  count: { fontSize: 12, color: colors.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photo: {
    width: "30.8%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
