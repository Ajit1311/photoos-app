import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/navigation-types";
import { typography } from "../../theme/typography";
import { useAppSettings } from "../../context/AppSettingsContext";
import { getActiveEventContextSync } from "../../services/event-gallery/event-qr-detector";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Downscales high-resolution selfies into an ultra-fast ~60KB jpeg data URI.
 * Prevents mobile browser memory exhaustion (out-of-memory reload) and QuotaExceededError.
 */
async function downscaleSelfieWeb(uriOrVideo: string | HTMLVideoElement, mirror = false): Promise<string> {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return typeof uriOrVideo === "string" ? uriOrVideo : "";
  }
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const MAX_DIM = 640;

    const process = (img: HTMLImageElement | HTMLVideoElement) => {
      const w = "videoWidth" in img ? img.videoWidth : img.naturalWidth || img.width;
      const h = "videoHeight" in img ? img.videoHeight : img.naturalHeight || img.height;
      if (!w || !h) {
        resolve(typeof uriOrVideo === "string" ? uriOrVideo : "");
        return;
      }
      const scale = Math.min(MAX_DIM / w, MAX_DIM / h, 1.0);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(typeof uriOrVideo === "string" ? uriOrVideo : "");
        return;
      }
      if (mirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL("image/jpeg", 0.82);
      canvas.width = 0;
      canvas.height = 0;
      resolve(dataUri);
    };

    if (typeof uriOrVideo === "string") {
      const img = typeof window !== "undefined" && (window as any).Image ? new (window as any).Image() : null;
      if (!img) {
        resolve(uriOrVideo);
        return;
      }
      img.onload = () => process(img);
      img.onerror = () => resolve(uriOrVideo);
      img.src = uriOrVideo;
    } else {
      process(uriOrVideo);
    }
  });
}

export default function CameraScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, language } = useAppSettings();

  const [activeEvent] = useState(() => getActiveEventContextSync());
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>("front");
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const takeSelfieText =
    language === "मराठी"
      ? "सेल्फी घ्या"
      : language === "हिन्दी"
        ? "सेल्फी लें"
        : "Take a Selfie";

  const uploadText =
    language === "मराठी"
      ? "फोटो अपलोड करा"
      : language === "हिन्दी"
        ? "फोटो अपलोड करें"
        : "Upload your Photo";

  const subtitle =
    language === "मराठी"
      ? "तुमचा फोटो वापरून तुमचे matching photos शोधा"
      : language === "हिन्दी"
        ? "अपनी फोटो से अपने matching photos खोजें"
        : "Find your matching photos using your face";

  const handleTakeSelfie = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        Alert.alert(
          "Camera Permission",
          "PhotoOS needs camera access to take your selfie."
        );
        return;
      }
    }

    setCameraOpen(true);
  };

  const handleUploadPhoto = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Photo Permission",
        "PhotoOS needs photo library access to select your photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const safeUri = await downscaleSelfieWeb(result.assets[0].uri);
      startFaceMatching(safeUri);
    }
  };

  const handleCapture = async (e?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      let capturedUri: string | null = null;

      // 1. Direct Web Video frame capture (lightning fast, zero lag, avoids Expo Camera crashes on mobile web)
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const video = document.querySelector("video");
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          try {
            capturedUri = await downscaleSelfieWeb(video, cameraType === "front");
          } catch (vidErr) {
            console.warn("[CameraScreen] Video snapshot failed, falling back to cameraRef:", vidErr);
          }
        }
      }

      // 2. Fallback to cameraRef.takePictureAsync
      if (!capturedUri && cameraRef) {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.8,
        });

        if (photo?.uri) {
          capturedUri = await downscaleSelfieWeb(photo.uri);
        }
      }

      if (capturedUri) {
        setCameraOpen(false);
        startFaceMatching(capturedUri);
      } else {
        Alert.alert("Camera", "Unable to capture the photo. Please try again.");
      }
    } catch (err) {
      console.error("[CameraScreen] Capture error:", err);
      Alert.alert("Camera", "Unable to capture the photo. Please try again.");
    }
  };

  const startFaceMatching = (uri: string) => {
    setPreviewUri(uri);

    // Persist immediately in sessionStorage so accidental browser refreshes never lose the selfie
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("@photoos_last_selfie_v2", uri);
        if (activeEvent?.eventId) {
          sessionStorage.setItem(`@photoos_last_selfie_${activeEvent.eventId}`, uri);
        }
      } catch (err) {
        console.warn("[CameraScreen] Storage save warning:", err);
      }
    }

    navigation.navigate("FaceMatchResults", {
      selfieUri: uri,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* SAME HEADER STYLE AS HOME */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Main")}
        >
          <View
            style={[
              styles.logoBox,
              {
                backgroundColor: theme.primary,
              },
            ]}
          >
            <Ionicons name="camera" size={19} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerIcon,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => navigation.navigate("Appearance")}
          >
            <Ionicons
              name="moon-outline"
              size={19}
              color={theme.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => navigation.navigate("Language")}
          >
            <Text style={[styles.languageText, { color: theme.text }]}>
              {language === "मराठी"
                ? "MR"
                : language === "हिन्दी"
                  ? "HI"
                  : "EN"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerIcon,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons
              name="notifications-outline"
              size={19}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleBlock}>
          {activeEvent && (
            <View style={[styles.eventBadge, { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}35` }]}>
              <View style={[styles.eventDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.eventBadgeText, { color: theme.primary }]} numberOfLines={1}>
                {activeEvent.eventName} • {activeEvent.studioName || "Photo Studio"}
              </Text>
            </View>
          )}

          <Text style={[styles.title, { color: theme.text }]}>
            Find Your Photos
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        {/* SELFIE PREVIEW / FACE SEARCH CARD */}
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
            />
          ) : (
            <View
              style={[
                styles.facePlaceholder,
                {
                  backgroundColor: theme.surfaceSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.faceCircle,
                  {
                    backgroundColor: theme.primarySoft,
                  },
                ]}
              >
                <Ionicons
                  name="scan-outline"
                  size={42}
                  color={theme.primary}
                />
              </View>

              <Text style={[styles.placeholderTitle, { color: theme.text }]}>
                AI Face Search
              </Text>

              <Text
                style={[
                  styles.placeholderText,
                  { color: theme.textSecondary },
                ]}
              >
                Take or upload your photo to find photos that match your face.
              </Text>
            </View>
          )}
        </View>

        {/* TAKE SELFIE */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.primaryButton,
            {
              backgroundColor: theme.primary,
            },
          ]}
          onPress={handleTakeSelfie}
        >
          <View style={styles.buttonIcon}>
            <Ionicons name="camera" size={22} color="#FFFFFF" />
          </View>

          <View style={styles.buttonTextBlock}>
            <Text style={styles.primaryButtonTitle}>
              {takeSelfieText}
            </Text>

            <Text style={styles.primaryButtonSubtitle}>
              Open camera & scan your face
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* UPLOAD */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={handleUploadPhoto}
        >
          <View
            style={[
              styles.secondaryIcon,
              {
                backgroundColor: theme.primarySoft,
              },
            ]}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={22}
              color={theme.primary}
            />
          </View>

          <View style={styles.buttonTextBlock}>
            <Text
              style={[
                styles.secondaryButtonTitle,
                { color: theme.text },
              ]}
            >
              {uploadText}
            </Text>

            <Text
              style={[
                styles.secondaryButtonSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Choose from your gallery
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {/* BROWSE ALL PHOTOS (SKIP SCAN) */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.browseAllButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => {
            navigation.navigate("FaceMatchResults", {});
          }}
        >
          <Ionicons name="images-outline" size={19} color={theme.text} />
          <Text style={[styles.browseAllText, { color: theme.text }]}>
            {language === "मराठी"
              ? "सर्व इव्हेंट फोटो बघा (स्कॅन न करता)"
              : language === "हिन्दी"
                ? "सभी इवेंट फोटो देखें (बिना स्कैन)"
                : "Browse All Event Photos (No Scan)"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* PRIVACY NOTE */}
        <View style={styles.privacyRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={theme.primary}
          />

          <View style={styles.privacyTextBlock}>
            <Text
              style={[
                styles.privacyText,
                { color: theme.textMuted },
              ]}
            >
              Your photo is used only for face matching.
            </Text>

            <Text
              style={[
                styles.privacyText,
                { color: theme.textMuted },
              ]}
            >
              Your data is end-to-end encrypted.
            </Text>
          </View>
        </View>
      </View>

      {/* CAMERA MODAL */}
      <Modal
        visible={cameraOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCameraOpen(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={(ref) => setCameraRef(ref)}
            style={StyleSheet.absoluteFill}
            facing={cameraType}
          />

          <View style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <TouchableOpacity
                style={styles.cameraClose}
                onPress={() => setCameraOpen(false)}
              >
                <Ionicons name="close" size={27} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.cameraTitle}>
                Take a Selfie
              </Text>

              <TouchableOpacity
                style={styles.cameraClose}
                onPress={() =>
                  setCameraType((current) =>
                    current === "front" ? "back" : "front"
                  )
                }
              >
                <Ionicons
                  name="camera-reverse-outline"
                  size={25}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.faceGuide}>
              <View style={styles.guideCornerTopLeft} />
              <View style={styles.guideCornerTopRight} />
              <View style={styles.guideCornerBottomLeft} />
              <View style={styles.guideCornerBottomRight} />
            </View>

            <View style={styles.cameraBottom}>
              <Text style={styles.cameraInstruction}>
                Position your face inside the frame
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.captureButton}
                onPress={handleCapture}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  languageButton: {
    minWidth: 40,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  languageText: {
    ...typography.caption,
    fontWeight: "700",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  titleBlock: {
    marginBottom: 20,
  },

  title: {
    ...typography.largeTitle,
  },

  subtitle: {
    ...typography.body,
    marginTop: 6,
    maxWidth: 330,
  },

  previewCard: {
    height: 245,
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 18,
  },

  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  facePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  faceCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  placeholderTitle: {
    ...typography.title3,
    marginBottom: 6,
  },

  placeholderText: {
    ...typography.callout,
    textAlign: "center",
    lineHeight: 20,
  },

  primaryButton: {
    minHeight: 78,
    borderRadius: 22,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  buttonIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonTextBlock: {
    flex: 1,
    marginLeft: 13,
  },

  primaryButtonTitle: {
    ...typography.button,
    color: "#FFFFFF",
  },

  primaryButtonSubtitle: {
    ...typography.caption,
    color: "rgba(255,255,255,0.72)",
    marginTop: 3,
  },

  secondaryButton: {
    minHeight: 78,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  secondaryIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonTitle: {
    ...typography.button,
  },

  secondaryButtonSubtitle: {
    ...typography.caption,
    marginTop: 3,
  },

  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 15,
  },

  privacyTextBlock: {
    flex: 1,
    marginLeft: 7,
  },

  privacyText: {
    ...typography.caption,
    textAlign: "center",
    lineHeight: 18,
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "space-between",
  },

  cameraTopBar: {
    paddingTop: 55,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cameraClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraTitle: {
    ...typography.title3,
    color: "#FFFFFF",
  },

  faceGuide: {
    width: 260,
    height: 330,
    alignSelf: "center",
    position: "relative",
  },

  guideCornerTopLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 45,
    height: 45,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
    borderTopLeftRadius: 25,
  },

  guideCornerTopRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 45,
    height: 45,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
    borderTopRightRadius: 25,
  },

  guideCornerBottomLeft: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 45,
    height: 45,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
    borderBottomLeftRadius: 25,
  },

  guideCornerBottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 45,
    height: 45,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FFFFFF",
    borderBottomRightRadius: 25,
  },

  cameraBottom: {
    alignItems: "center",
    paddingBottom: 42,
  },

  cameraInstruction: {
    ...typography.callout,
    color: "#FFFFFF",
    marginBottom: 22,
  },

  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
  },

  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginBottom: 8,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  browseAllButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  browseAllText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
});
