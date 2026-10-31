import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import type { RootStackParamList } from "../../navigation/navigation-types";

export default function SelfiePreviewScreen() {
  const navigation = useNavigation<any>();
  const route =
    useRoute<any>() as ReturnType<typeof useRoute<any>>;

  const insets = useSafeAreaInsets();

  const selfieUri =
    (route.params as RootStackParamList["SelfiePreview"] | undefined)
      ?.selfieUri;

  function usePhoto() {
    if (!selfieUri) {
      navigation.goBack();
      return;
    }

    navigation.navigate("FaceMatchResults", {
      selfieUri,
    });
  }

  return (
    <View style={styles.container}>
      {selfieUri ? (
        <Image
          source={{ uri: selfieUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noImage}>
          <Ionicons
            name="image-outline"
            size={34}
            color={colors.textMuted}
          />
          <Text style={styles.noImageText}>
            Selfie unavailable
          </Text>
        </View>
      )}

      <View style={styles.overlay} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>Check your selfie</Text>
          <Text style={styles.subtitle}>
            Make sure your face is clearly visible
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <View
        style={[
          styles.bottom,
          {
            paddingBottom: Math.max(insets.bottom + 18, 30),
          },
        ]}
      >
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="refresh-outline" size={19} color={colors.text} />
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={usePhoto}
        >
          <Text style={styles.primaryText}>Use Photo</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1117",
  },

  noImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  noImageText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 8,
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.24)",
  },

  header: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 0,

    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },

  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.76)",
    marginTop: 2,
    textAlign: "center",
  },

  headerSpacer: {
    width: 44,
  },

  bottom: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 0,

    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  secondaryText: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  primaryButton: {
    flex: 1.25,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  primaryText: {
    ...typography.bodyMedium,
    color: "#FFFFFF",
  },
});
