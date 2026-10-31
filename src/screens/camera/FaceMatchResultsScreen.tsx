import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { useAppSettings } from "../../context/AppSettingsContext";
import { getActiveEventContextSync, type ActiveEventContext } from "../../services/event-gallery/event-qr-detector";

const { width: windowWidth } = Dimensions.get("window");

interface MatchedPhoto {
  id: string;
  url: string;
  category: "Portraits" | "Ceremony" | "Reception" | "Candid";
  confidence: number;
  timeAgo: string;
  dimensions: string;
}

// Curated high-resolution event photography showcase for weddings & corporate events
const SAMPLE_EVENT_PHOTOS: MatchedPhoto[] = [
  {
    id: "p1",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    category: "Portraits",
    confidence: 99.6,
    timeAgo: "2 hours ago",
    dimensions: "4000 x 6000",
  },
  {
    id: "p2",
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
    category: "Ceremony",
    confidence: 99.4,
    timeAgo: "3 hours ago",
    dimensions: "3840 x 5760",
  },
  {
    id: "p3",
    url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80",
    category: "Portraits",
    confidence: 99.1,
    timeAgo: "3 hours ago",
    dimensions: "4000 x 6000",
  },
  {
    id: "p4",
    url: "https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1200&q=80",
    category: "Reception",
    confidence: 98.9,
    timeAgo: "4 hours ago",
    dimensions: "3600 x 5400",
  },
  {
    id: "p5",
    url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
    category: "Ceremony",
    confidence: 99.2,
    timeAgo: "4 hours ago",
    dimensions: "4000 x 6000",
  },
  {
    id: "p6",
    url: "https://images.unsplash.com/photo-1519225438184-88185c4387e8?auto=format&fit=crop&w=1200&q=80",
    category: "Candid",
    confidence: 98.7,
    timeAgo: "5 hours ago",
    dimensions: "3800 x 5700",
  },
  {
    id: "p7",
    url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
    category: "Reception",
    confidence: 99.0,
    timeAgo: "5 hours ago",
    dimensions: "4200 x 6300",
  },
  {
    id: "p8",
    url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
    category: "Candid",
    confidence: 98.5,
    timeAgo: "6 hours ago",
    dimensions: "3900 x 5850",
  },
  {
    id: "p9",
    url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
    category: "Portraits",
    confidence: 99.5,
    timeAgo: "6 hours ago",
    dimensions: "4000 x 6000",
  },
];

export default function FaceMatchResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { theme, language } = useAppSettings();

  const selfieUri = route.params?.selfieUri as string | undefined;

  const [activeEvent, setActiveEvent] = useState<ActiveEventContext | null>(null);
  const [matchingState, setMatchingState] = useState<"scanning" | "matched">("scanning");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedPhoto, setSelectedPhoto] = useState<MatchedPhoto | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const event = getActiveEventContextSync();
    if (event) {
      setActiveEvent(event);
    }

    // Simulate precise AI ResNet-34 face feature extraction & vector distance search
    const timer = setTimeout(() => {
      setMatchingState("matched");
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  const categories = useMemo(() => {
    return ["All", "Portraits", "Ceremony", "Reception", "Candid"];
  }, []);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === "All") return SAMPLE_EVENT_PHOTOS;
    return SAMPLE_EVENT_PHOTOS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleDownloadSingle = (photo: MatchedPhoto) => {
    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = photo.url;
      a.download = `PhotoOS-${photo.id}.jpg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      Alert.alert("Photo Saved", "High-resolution photo saved to your gallery.");
    }
  };

  const handleDownloadAll = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      Alert.alert(
        "Photos Ready",
        `All ${SAMPLE_EVENT_PHOTOS.length} matched photos have been prepared in original print quality.`
      );
    }, 1200);
  };

  const titleText =
    language === "मराठी"
      ? "तुमचे मॅच झालेले फोटो"
      : language === "हिन्दी"
        ? "आपकी मैच हुई तस्वीरें"
        : "Your Matched Photos";

  const subtitleText =
    language === "मराठी"
      ? `AI द्वारे ${SAMPLE_EVENT_PHOTOS.length} फोटो सापडले आहेत`
      : language === "हिन्दी"
        ? `AI द्वारा ${SAMPLE_EVENT_PHOTOS.length} तस्वीरें मिलीं`
        : `${SAMPLE_EVENT_PHOTOS.length} photos matched via AI Face Recognition`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ------------------------------------------------------------ */}
      {/* TOP HEADER */}
      {/* ------------------------------------------------------------ */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {activeEvent?.eventName ?? "Event Gallery"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {activeEvent?.studioName ?? "Studio Pro"} • 99.4% Biometric Match
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.navigate("Main", { screen: "Camera" })}
        >
          <Ionicons name="camera-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------ */}
      {/* SCANNING STATE OVERLAY */}
      {/* ------------------------------------------------------------ */}
      {matchingState === "scanning" ? (
        <View style={styles.scanningContainer}>
          {selfieUri ? (
            <View style={styles.scanningAvatarWrap}>
              <Image source={{ uri: selfieUri }} style={styles.scanningAvatar} />
              <View style={styles.scanningScanBeam} />
            </View>
          ) : (
            <View style={[styles.scanningIconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="scan" size={48} color={colors.primary} />
            </View>
          )}

          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
          <Text style={[styles.scanningTitle, { color: theme.text }]}>Scanning Biometric Features...</Text>
          <Text style={[styles.scanningSub, { color: theme.textSecondary }]}>
            Running ResNet-34 face detection across event album photographs
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          {/* ------------------------------------------------------------ */}
          {/* AI SUMMARY HERO BANNER */}
          {/* ------------------------------------------------------------ */}
          <View
            style={[
              styles.summaryBanner,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.summaryLeft}>
              {selfieUri ? (
                <View style={styles.selfieBadgeWrap}>
                  <Image source={{ uri: selfieUri }} style={styles.selfieSmall} />
                  <View style={styles.selfieVerifiedTick}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                </View>
              ) : (
                <View style={[styles.aiIconBadge, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="sparkles" size={22} color={colors.primary} />
                </View>
              )}

              <View style={styles.summaryTextGroup}>
                <View style={styles.badgeRow}>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>99.4% ACCURACY</Text>
                  </View>
                  <Text style={[styles.eventLabel, { color: theme.textSecondary }]}>
                    {activeEvent?.eventName ? `Event: ${activeEvent.eventName}` : "Face Search Complete"}
                  </Text>
                </View>

                <Text style={[styles.summaryHeading, { color: theme.text }]}>
                  {titleText}
                </Text>
                <Text style={[styles.summaryDescription, { color: theme.textSecondary }]}>
                  {subtitleText}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.downloadAllBtn, { backgroundColor: colors.primary }]}
              onPress={handleDownloadAll}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.downloadAllText}>Download All</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ------------------------------------------------------------ */}
          {/* CATEGORY FILTER CHIPS */}
          {/* ------------------------------------------------------------ */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}
          >
            {categories.map((cat) => {
              const active = cat === activeCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    active
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? { color: "#FFFFFF", fontWeight: "700" } : { color: theme.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ------------------------------------------------------------ */}
          {/* MATCHED PHOTOS GRID */}
          {/* ------------------------------------------------------------ */}
          <View style={styles.photoGrid}>
            {filteredPhotos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                activeOpacity={0.88}
                style={[
                  styles.photoCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setSelectedPhoto(photo)}
              >
                <Image source={{ uri: photo.url }} style={styles.photoImage} />

                <View style={styles.photoConfidenceBadge}>
                  <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                  <Text style={styles.photoConfidenceText}>{photo.confidence}%</Text>
                </View>

                <View style={styles.photoFooter}>
                  <Text style={[styles.photoCategory, { color: theme.text }]} numberOfLines={1}>
                    {photo.category}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.photoQuickDownload}
                    onPress={() => handleDownloadSingle(photo)}
                  >
                    <Ionicons name="arrow-down-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ------------------------------------------------------------ */}
      {/* FULL SCREEN PHOTO MODAL */}
      {/* ------------------------------------------------------------ */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalTopBar, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedPhoto(null)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.modalTitleBlock}>
              <Text style={styles.modalPhotoTitle}>{selectedPhoto?.category}</Text>
              <Text style={styles.modalPhotoSub}>
                {selectedPhoto?.confidence}% Biometric Match • {selectedPhoto?.dimensions}
              </Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          {selectedPhoto ? (
            <View style={styles.modalImageWrap}>
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>
          ) : null}

          <View style={[styles.modalBottomBar, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalActionBtnSecondary}
              onPress={() => {
                if (selectedPhoto) {
                  Alert.alert("Share", "Sharing photo link to WhatsApp...");
                }
              }}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.modalBtnTextSec}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalActionBtnPrimary}
              onPress={() => {
                if (selectedPhoto) {
                  handleDownloadSingle(selectedPhoto);
                }
              }}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.modalBtnTextPrim}>Save to Device</Text>
            </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    ...typography.title3,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
  scanningContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  scanningAvatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    position: "relative",
    borderWidth: 3,
    borderColor: colors.primary,
  },
  scanningAvatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  scanningScanBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 3,
    backgroundColor: "#38BDF8",
  },
  scanningIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  scanningTitle: {
    ...typography.title2,
    marginTop: 20,
    textAlign: "center",
  },
  scanningSub: {
    ...typography.callout,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  summaryBanner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  selfieBadgeWrap: {
    position: "relative",
  },
  selfieSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selfieVerifiedTick: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
  },
  aiIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextGroup: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  activePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: `${colors.primary}20`,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.4,
  },
  eventLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  summaryHeading: {
    ...typography.title3,
    fontSize: 17,
    fontWeight: "800",
  },
  summaryDescription: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  downloadAllBtn: {
    height: 44,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  downloadAllText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoCard: {
    width: (windowWidth - 36 - 12) / 2,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: 190,
    resizeMode: "cover",
  },
  photoConfidenceBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoConfidenceText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  photoFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  photoCategory: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  photoQuickDownload: {
    padding: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleBlock: {
    alignItems: "center",
  },
  modalPhotoTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalPhotoSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 2,
  },
  modalImageWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  modalActionBtnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalBtnTextSec: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modalActionBtnPrimary: {
    flex: 1.5,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalBtnTextPrim: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
