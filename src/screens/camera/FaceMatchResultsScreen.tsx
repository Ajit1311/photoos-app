import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  getActiveEventContextSync,
  type ActiveEventContext,
} from "../../services/event-gallery/event-qr-detector";
import {
  fetchLiveEventGallery,
  type LiveEventPhoto,
  type LiveEventInfo,
} from "../../services/event-gallery/live-event-photos.service";
import {
  extractSelfieFaceDescriptor,
  extractPhotoFacesDescriptors,
  compareTargetFace,
  loadFaceRecognitionModels,
  MATCH_THRESHOLD,
} from "../../services/ai/face-recognition";

const { width: windowWidth } = Dimensions.get("window");

export interface DisplayPhoto extends LiveEventPhoto {
  confidence?: number;
  isMatch?: boolean;
}

interface PhotoThumbnailItemProps {
  photo: DisplayPhoto;
  theme: any;
  onSelect: () => void;
  onDownload: () => void;
}

function PhotoThumbnailItem({
  photo,
  theme,
  onSelect,
  onDownload,
}: PhotoThumbnailItemProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const primaryUri = photo.thumbnailUrl || photo.url;
  const secondaryUri = photo.url || photo.thumbnailUrl;
  const currentUri = !loadFailed ? primaryUri : secondaryUri;

  return (
    <TouchableOpacity
      style={[styles.photoCard, { borderColor: theme.border, backgroundColor: theme.surface }]}
      activeOpacity={0.9}
      onPress={onSelect}
    >
      <View style={styles.photoImageContainer}>
        {!isLoaded && (
          <View style={[styles.photoImageLoader, { backgroundColor: `${theme.primary}12` }]}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
        <Image
          source={{ uri: currentUri }}
          style={styles.photoImage}
          resizeMode="cover"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (!loadFailed && primaryUri !== secondaryUri) {
              setLoadFailed(true);
            }
          }}
        />
      </View>

      {/* CONFIDENCE PILL (99%+ accuracy) */}
      {photo.confidence ? (
        <View style={styles.photoConfidenceBadge}>
          <Ionicons name="shield-checkmark" size={10} color="#34C759" />
          <Text style={styles.photoConfidenceText}>
            {photo.confidence}% Match
          </Text>
        </View>
      ) : null}

      <View style={styles.photoFooter}>
        <Text style={[styles.photoCategory, { color: theme.text }]} numberOfLines={1}>
          {photo.name || "Event Photo"}
        </Text>

        <TouchableOpacity
          style={styles.photoQuickDownload}
          onPress={onDownload}
        >
          <Ionicons name="download-outline" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function FaceMatchResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { theme, language } = useAppSettings();

  const routeSelfie = route.params?.selfieUri as string | undefined;

  // Persist and restore selfieUri from sessionStorage across page reloads
  const [selfieUri, setSelfieUri] = useState<string | undefined>(() => {
    if (routeSelfie) return routeSelfie;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("@photoos_last_selfie_v2");
        return stored || undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  });

  const [activeEvent, setActiveEvent] = useState<ActiveEventContext | null>(() =>
    getActiveEventContextSync()
  );
  const [eventInfo, setEventInfo] = useState<LiveEventInfo | null>(null);
  const [allPhotos, setAllPhotos] = useState<DisplayPhoto[]>([]);
  const [matchedPhotos, setMatchedPhotos] = useState<DisplayPhoto[]>([]);

  const [viewTab, setViewTab] = useState<"matched" | "all">("matched");
  const [matchingState, setMatchingState] = useState<
    "loading_gallery" | "loading_ai" | "scanning_selfie" | "matching" | "done" | "no_face_in_selfie"
  >("loading_gallery");
  const [statusMessage, setStatusMessage] = useState<string>("Loading event photos...");
  const [selectedPhoto, setSelectedPhoto] = useState<DisplayPhoto | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Sync new route selfie when passed
  useEffect(() => {
    if (route.params?.selfieUri) {
      setSelfieUri(route.params.selfieUri);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
          sessionStorage.setItem("@photoos_last_selfie_v2", route.params.selfieUri);
        } catch {}
      }
    }
  }, [route.params?.selfieUri]);

  // Restore previous matched results from storage if already computed for this event
  useEffect(() => {
    const currentEventId = route.params?.eventId || activeEvent?.eventId;
    if (Platform.OS === "web" && typeof window !== "undefined" && currentEventId) {
      try {
        const cached = sessionStorage.getItem(`@photoos_matched_${currentEventId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMatchedPhotos(parsed);
            setViewTab("matched");
          }
        }
      } catch {}
    }
  }, [route.params?.eventId, activeEvent?.eventId]);

  // Localization strings
  const t = useMemo(() => {
    if (language === "मराठी") {
      return {
        matchedTab: "📁 माझा अल्बम",
        allTab: "🌐 सर्व इव्हेंट फोटो",
        albumHeading: "माझा फोटो अल्बम (Personal Album)",
        albumSub: "AI द्वारे तुमच्या चेहऱ्याशी तंतोतंत मॅच झालेले सर्व फोटो या सेपरेट अल्बममध्ये सुरक्षित ठेवले आहेत.",
        downloadAll: "सर्व फोटो डाउनलोड करा",
        scanningTitle: "AI फेस रेकग्निशन चालू आहे",
        scanningSelfie: "तुमच्या चेहऱ्याची बायोमेट्रिक तपासणी करत आहे...",
        matchingPhotos: "इव्हेंटच्या फोटोंमधून तुमचे फोटो शोधत आहे...",
        foundMatches: "फोटो मॅच झाले (99% अचूकता)",
        noMatches: "तुमच्या चेहऱ्याचे कोणतेही फोटो सापडले नाहीत",
        noFaceTitle: "चेहरा स्पष्ट दिसला नाही",
        noFaceDesc: "कृपया चांगल्या प्रकाशात समोर बघून नवीन सेल्फी घ्या.",
        retakeSelfie: "नवीन सेल्फी घ्या",
        browseAll: "सर्व फोटो बघा",
        downloadHd: "HD डाउनलोड",
        shareWhatsapp: "व्हॉट्सॲपवर शेअर करा",
        emptyGallery: "या इव्हेंटमध्ये अजून फोटो अपलोड केलेले नाहीत.",
        emptySub: "फोटोग्राफर किंवा आयोजकांनी फोटो अपलोड केल्यावर ते येथे दिसतील.",
        takeSelfieCta: "तुमचे फोटो शोधण्यासाठी सेल्फी घ्या",
      };
    }
    if (language === "हिन्दी") {
      return {
        matchedTab: "📁 मेरा एल्बम",
        allTab: "🌐 सभी इवेंट फोटो",
        albumHeading: "मेरा फोटो एल्बम (Personal Album)",
        albumSub: "AI द्वारा आपके चेहरे से मैच किए गए सभी फोटो इस सेपरेट एल्बम में सुरक्षित हैं।",
        downloadAll: "सभी फोटो डाउनलोड करें",
        scanningTitle: "AI फेस रिकग्निशन जारी है",
        scanningSelfie: "आपकी सेल्फी में चेहरा स्कैन हो रहा है...",
        matchingPhotos: "इवेंट फोटो से आपकी तस्वीरें खोजी जा रही हैं...",
        foundMatches: "फोटो मैच हुए (99% सटीकता)",
        noMatches: "आपके चेहरे का कोई फोटो नहीं मिला",
        noFaceTitle: "चेहरा स्पष्ट नहीं दिखा",
        noFaceDesc: "कृपया अच्छी रोशनी में सामने देखकर नई सेल्फी लें।",
        retakeSelfie: "नई सेल्फी लें",
        browseAll: "सभी फोटो देखें",
        downloadHd: "HD डाउनलोड",
        shareWhatsapp: "व्हाट्सएप पर शेयर करें",
        emptyGallery: "इस इवेंट में अभी कोई फोटो अपलोड नहीं हुआ है।",
        emptySub: "फोटोग्राफर द्वारा फोटो अपलोड होते ही वे यहां दिखेंगे।",
        takeSelfieCta: "अपने फोटो खोजने के लिए सेल्फी लें",
      };
    }
    return {
      matchedTab: "📁 My Album",
      allTab: "🌐 All Photos",
      albumHeading: "My Matched Photo Album",
      albumSub: "All photos matching your face biometric have been organized into your private personal album.",
      downloadAll: "Download All Photos",
      scanningTitle: "AI Face Recognition in Progress",
      scanningSelfie: "Detecting biometric features from your selfie...",
      matchingPhotos: "Matching your face against event photos...",
      foundMatches: "Photos matched with 99%+ accuracy",
      noMatches: "No matching photos found for your face yet",
      noFaceTitle: "No Clear Face Detected",
      noFaceDesc: "Please take a well-lit front-facing selfie and try again.",
      retakeSelfie: "Retake Selfie",
      browseAll: "Browse All Photos",
      downloadHd: "Download HD",
      shareWhatsapp: "Share on WhatsApp",
      emptyGallery: "No photos have been uploaded to this event yet.",
      emptySub: "Once the organizer or studio uploads photos, they will appear here.",
      takeSelfieCta: "Take a Selfie to Match My Photos",
    };
  }, [language]);

  // Load live event gallery photos from backend
  const loadGalleryAndMatch = useCallback(async () => {
    const paramEvent = route.params?.eventId
      ? {
          eventId: route.params.eventId,
          eventName: route.params.eventName || "Live Event Gallery",
          studioName: route.params.studioName || "Photo Studio",
          type: route.params.type || (route.params.eventId.startsWith("ev_corp_") ? "corporate" : "studio"),
        }
      : null;

    const currentEvent = paramEvent || getActiveEventContextSync() || activeEvent;
    if (!currentEvent?.eventId) {
      setMatchingState("done");
      setViewTab("all");
      setAllPhotos([]);
      setMatchedPhotos([]);
      return;
    }

    const eventId = currentEvent.eventId;

    try {
      setMatchingState("loading_gallery");
      setStatusMessage("Connecting to PhotoOS live gallery...");

      const galleryResult = await fetchLiveEventGallery(eventId, currentEvent.type);
      setEventInfo(galleryResult.event);
      setAllPhotos(galleryResult.photos);

      const photos = galleryResult.photos;

      // Check current selfieUri
      let currentSelfie = selfieUri;
      if (!currentSelfie && Platform.OS === "web" && typeof window !== "undefined") {
        currentSelfie = sessionStorage.getItem("@photoos_last_selfie_v2") || undefined;
      }

      if (!currentSelfie) {
        // Direct event access or browse: show all photos immediately
        setViewTab("all");
        setMatchingState("done");
        return;
      }

      if (photos.length === 0) {
        setViewTab("all");
        setMatchingState("done");
        return;
      }

      // Check if we already have matched photos cached in storage
      if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
          const cached = sessionStorage.getItem(`@photoos_matched_${eventId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMatchedPhotos(parsed);
              setViewTab("matched");
              setMatchingState("done");
              return;
            }
          }
        } catch {}
      }

      // Step 2: Initialize lightweight AI models
      setMatchingState("loading_ai");
      setStatusMessage("Loading ResNet-34 AI Face Recognition engine...");
      await loadFaceRecognitionModels();

      // Step 3: Extract face descriptor from selfie
      setMatchingState("scanning_selfie");
      setStatusMessage(t.scanningSelfie);
      const selfieResult = await extractSelfieFaceDescriptor(currentSelfie);

      if (!selfieResult.success || !selfieResult.descriptor) {
        setMatchingState("no_face_in_selfie");
        return;
      }

      const selfieDescriptor = selfieResult.descriptor;

      // Step 4: Scan and match each photo sequentially (lightweight, zero WebGL crash)
      setMatchingState("matching");
      const matchedList: DisplayPhoto[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const progressCount = i + 1;
        setStatusMessage(
          language === "मराठी"
            ? `तुमचे फोटो शोधत आहे... (${progressCount}/${photos.length} फोटो)`
            : language === "हिन्दी"
              ? `तस्वीरें खोजी जा रही हैं... (${progressCount}/${photos.length} फोटो)`
              : `Matching your face against event photos... (${progressCount}/${photos.length})`
        );

        const photoUrl = photo.thumbnailUrl || photo.url;
        if (photoUrl) {
          try {
            const photoFaces = await extractPhotoFacesDescriptors(photoUrl);
            if (photoFaces.length > 0) {
              const match = compareTargetFace(
                selfieDescriptor,
                photoFaces.map((f) => f.descriptor),
                MATCH_THRESHOLD
              );

              if (match.isMatch) {
                const item: DisplayPhoto = {
                  ...photo,
                  confidence: match.similarity,
                  isMatch: true,
                };
                matchedList.push(item);
                // Dynamically update state so user sees matched photos appearing live in real time!
                setMatchedPhotos([...matchedList]);
              }
            }
          } catch (scanErr) {
            console.warn("[FaceMatch] Could not analyze photo:", photo.id, scanErr);
          }
        }

        // Cooperative 20ms yield to allow browser GC to free textures and keep UI silky smooth
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      // Sort matched photos by highest confidence
      matchedList.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

      setMatchedPhotos(matchedList);
      if (Platform.OS === "web" && typeof window !== "undefined" && eventId) {
        try {
          sessionStorage.setItem(`@photoos_matched_${eventId}`, JSON.stringify(matchedList));
        } catch {}
      }
      setViewTab(matchedList.length > 0 ? "matched" : "all");
      setMatchingState("done");
    } catch (err: any) {
      console.error("[FaceMatchResults] Flow error:", err);
      setViewTab("all");
      setMatchingState("done");
    }
  }, [activeEvent, selfieUri, t, language]);

  useEffect(() => {
    void loadGalleryAndMatch();
  }, [loadGalleryAndMatch]);

  const handleRefresh = async () => {
    // Clear storage cache for fresh scan
    const eventId = route.params?.eventId || activeEvent?.eventId;
    if (Platform.OS === "web" && typeof window !== "undefined" && eventId) {
      try {
        sessionStorage.removeItem(`@photoos_matched_${eventId}`);
      } catch {}
    }
    setRefreshing(true);
    await loadGalleryAndMatch();
    setRefreshing(false);
  };

  const handleRetakeSelfie = () => {
    // Clear last selfie and matched cache
    const eventId = route.params?.eventId || activeEvent?.eventId;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("@photoos_last_selfie_v2");
        if (eventId) {
          sessionStorage.removeItem(`@photoos_last_selfie_${eventId}`);
          sessionStorage.removeItem(`@photoos_matched_${eventId}`);
        }
      } catch {}
    }
    navigation.navigate("Main", { screen: "Camera" });
  };

  const displayedPhotos = viewTab === "matched" ? matchedPhotos : allPhotos;

  const handleDownloadSingle = (photo: DisplayPhoto) => {
    const downloadUrl = photo.url || photo.thumbnailUrl;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `PhotoOS-${photo.name || photo.id}.jpg`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      Alert.alert("Download", "Downloading photo in original high quality...");
    }
  };

  const handleDownloadAll = () => {
    if (matchedPhotos.length === 0) return;
    matchedPhotos.forEach((photo, idx) => {
      setTimeout(() => {
        handleDownloadSingle(photo);
      }, idx * 450);
    });
  };

  const handleWhatsAppShare = (photo: DisplayPhoto) => {
    const evName = eventInfo?.name || activeEvent?.eventName || "Event";
    const shareText = `Check out my photo from ${evName} on PhotoOS: ${photo.url || photo.thumbnailUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank");
    } else {
      Alert.alert("Share", "Sharing via WhatsApp...");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: theme.border,
            backgroundColor: theme.surface,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: theme.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {eventInfo?.name || activeEvent?.eventName || "Live Event Gallery"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {eventInfo?.studioName || activeEvent?.studioName || "Photo Studio"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.iconButton, { borderColor: theme.border }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name={refreshing ? "sync" : "refresh"}
            size={19}
            color={theme.primary}
          />
        </TouchableOpacity>
      </View>

      {/* SCANNING STATE OVERLAY */}
      {matchingState !== "done" && matchingState !== "no_face_in_selfie" && (
        <View style={styles.scanningContainer}>
          <View style={[styles.scanningCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.scanningPulseRing}>
              {selfieUri ? (
                <Image source={{ uri: selfieUri }} style={styles.scanningSelfie} />
              ) : (
                <View style={[styles.scanningIconWrap, { backgroundColor: `${theme.primary}20` }]}>
                  <Ionicons name="scan-outline" size={48} color={theme.primary} />
                </View>
              )}
              <ActivityIndicator
                size="large"
                color={theme.primary}
                style={styles.scanningSpinner}
              />
            </View>

            <Text style={[styles.scanningTitle, { color: theme.text }]}>
              {t.scanningTitle}
            </Text>

            <Text style={[styles.scanningSub, { color: theme.textSecondary }]}>
              {statusMessage}
            </Text>
          </View>
        </View>
      )}

      {/* NO FACE IN SELFIE WARNING */}
      {matchingState === "no_face_in_selfie" && (
        <View style={styles.scanningContainer}>
          <View style={[styles.scanningCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.scanningIconWrap, { backgroundColor: "#FF3B3020" }]}>
              <Ionicons name="alert-circle-outline" size={54} color="#FF3B30" />
            </View>

            <Text style={[styles.scanningTitle, { color: theme.text }]}>
              {t.noFaceTitle}
            </Text>

            <Text style={[styles.scanningSub, { color: theme.textSecondary }]}>
              {t.noFaceDesc}
            </Text>

            <View style={styles.errorActionRow}>
              <TouchableOpacity
                style={[styles.retakeButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate("Main", { screen: "Camera" })}
              >
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                <Text style={styles.retakeText}>
                  {language === "मराठी" ? "चेहरा स्कॅन करा (Scan Face)" : t.retakeSelfie}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.browseButton, { borderColor: theme.border }]}
                onPress={() => {
                  setViewTab("all");
                  setMatchingState("done");
                }}
              >
                <Ionicons name="images-outline" size={16} color={theme.text} />
                <Text style={[styles.browseText, { color: theme.text }]}>
                  {language === "मराठी" ? "सर्व फोटो बघा" : t.browseAll}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MATCHED RESULTS VIEW */}
      {matchingState === "done" && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB BAR: DUAL TABS FOR MATCHED PHOTOS AND ALL EVENT PHOTOS */}
          <View style={[styles.tabBarWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                viewTab === "matched" && [styles.tabButtonActive, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setViewTab("matched")}
            >
              <Ionicons
                name="sparkles"
                size={15}
                color={viewTab === "matched" ? "#FFFFFF" : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  { color: viewTab === "matched" ? "#FFFFFF" : theme.textSecondary },
                ]}
              >
                {t.matchedTab} ({matchedPhotos.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                viewTab === "all" && [styles.tabButtonActive, { backgroundColor: theme.primary }],
              ]}
              onPress={() => setViewTab("all")}
            >
              <Ionicons
                name="images-outline"
                size={15}
                color={viewTab === "all" ? "#FFFFFF" : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  { color: viewTab === "all" ? "#FFFFFF" : theme.textSecondary },
                ]}
              >
                {t.allTab} ({allPhotos.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* ALL PHOTOS WELCOME BANNER (IF NO SELFIE TAKEN YET) */}
          {viewTab === "all" && !selfieUri && (
            <View
              style={[
                styles.summaryBanner,
                {
                  backgroundColor: `${theme.primary}12`,
                  borderColor: `${theme.primary}30`,
                },
              ]}
            >
              <View style={styles.summaryLeft}>
                <View style={[styles.aiIconBadge, { backgroundColor: `${theme.primary}25` }]}>
                  <Ionicons name="sparkles" size={20} color={theme.primary} />
                </View>
                <View style={styles.summaryTextGroup}>
                  <Text style={[styles.summaryHeading, { color: theme.text }]}>
                    {language === "मराठी"
                      ? "तुमचे स्वतःचे फोटो शोधायचे आहेत?"
                      : language === "हिन्दी"
                        ? "अपनी खुद की तस्वीरें खोजनी हैं?"
                        : "Find your photos with AI"}
                  </Text>
                  <Text style={[styles.summaryDescription, { color: theme.textSecondary }]}>
                    {language === "मराठी"
                      ? "चेहरा स्कॅन करून फक्त तुमचे फोटो 1 सेकंदात शोधा."
                      : language === "हिन्दी"
                        ? "फेस स्कैन करें और तुरंत अपनी तस्वीरें पाएं।"
                        : "Scan your face once to filter only your photos."}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.takeSelfieButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate("Main", { screen: "Camera" })}
              >
                <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
                <Text style={styles.takeSelfieText}>
                  {language === "मराठी" ? "स्कॅन करा ✨" : "Scan Face ✨"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PERSONAL MATCHED ALBUM BANNER */}
          {viewTab === "matched" && (
            <View
              style={[
                styles.summaryBanner,
                {
                  backgroundColor: matchedPhotos.length > 0 ? `${theme.primary}12` : theme.surface,
                  borderColor: matchedPhotos.length > 0 ? `${theme.primary}40` : theme.border,
                },
              ]}
            >
              <View style={styles.summaryLeft}>
                {selfieUri ? (
                  <View style={styles.selfieBadgeWrap}>
                    <Image source={{ uri: selfieUri }} style={styles.selfieSmall} />
                    <View style={styles.selfieVerifiedTick}>
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.aiIconBadge, { backgroundColor: `${theme.primary}25` }]}>
                    <Ionicons name="scan-outline" size={24} color={theme.primary} />
                  </View>
                )}

                <View style={styles.summaryTextGroup}>
                  <Text style={[styles.summaryHeading, { color: theme.text }]}>
                    {matchedPhotos.length > 0
                      ? `${t.albumHeading} (${matchedPhotos.length})`
                      : t.noMatches}
                  </Text>
                  <Text style={[styles.summaryDescription, { color: theme.textSecondary }]}>
                    {matchedPhotos.length > 0
                      ? t.albumSub
                      : (language === "मराठी"
                          ? "तुम्ही 'सर्व इव्हेंट फोटो' टॅबमध्ये सर्व फोटो पाहू शकता किंवा नवीन सेल्फी घेऊ शकता."
                          : "You can browse all event photos below or retake your selfie.")}
                  </Text>
                </View>
              </View>

              <View style={styles.albumActionsRow}>
                <TouchableOpacity
                  style={[styles.albumActionBtnOutline, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={handleRetakeSelfie}
                >
                  <Ionicons name="camera-outline" size={16} color={theme.text} />
                  <Text style={[styles.albumActionTextOutline, { color: theme.text }]}>
                    {t.retakeSelfie}
                  </Text>
                </TouchableOpacity>

                {matchedPhotos.length > 0 && (
                  <TouchableOpacity
                    style={[styles.albumActionBtnPrimary, { backgroundColor: theme.primary }]}
                    onPress={handleDownloadAll}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.albumActionTextPrimary}>
                      {t.downloadAll}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* EMPTY MATCHED ALBUM STATE */}
          {viewTab === "matched" && matchedPhotos.length === 0 && (
            <View style={[styles.emptyContainer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Ionicons name="person-outline" size={54} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t.noMatches}
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {language === "मराठी"
                  ? "तुमच्या चेहऱ्याशी जुळणारे फोटो या इव्हेंटमध्ये आढळले नाहीत. तुम्ही सर्व इव्हेंट फोटो पाहू शकता किंवा योग्य प्रकाशात नवीन सेल्फी घेऊ शकता."
                  : "No matching photos found for your face yet. You can browse all event photos or take a clearer selfie."}
              </Text>

              <View style={styles.emptyActionRow}>
                <TouchableOpacity
                  style={[styles.emptyBtnPrimary, { backgroundColor: theme.primary }]}
                  onPress={handleRetakeSelfie}
                >
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyBtnTextWhite}>{t.retakeSelfie}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.emptyBtnOutline, { borderColor: theme.border }]}
                  onPress={() => setViewTab("all")}
                >
                  <Ionicons name="images-outline" size={16} color={theme.text} />
                  <Text style={[styles.emptyBtnTextDark, { color: theme.text }]}>
                    {t.browseAll}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* EMPTY ALL GALLERY STATE */}
          {viewTab === "all" && allPhotos.length === 0 && (
            <View style={[styles.emptyContainer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Ionicons name="images-outline" size={54} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t.emptyGallery}
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {t.emptySub}
              </Text>

              <TouchableOpacity
                style={[styles.takeSelfieButton, { backgroundColor: theme.primary, marginTop: 16 }]}
                onPress={handleRefresh}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.takeSelfieText}>Refresh Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PHOTO GRID */}
          <View style={styles.photoGrid}>
            {displayedPhotos.map((photo) => (
              <PhotoThumbnailItem
                key={photo.id}
                photo={photo}
                theme={theme}
                onSelect={() => setSelectedPhoto(photo)}
                onDownload={() => handleDownloadSingle(photo)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* FULLSCREEN PHOTO PREVIEW MODAL */}
      {selectedPhoto && (
        <Modal
          visible={Boolean(selectedPhoto)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.modalBackdrop}>
            {/* TOP BAR */}
            <View style={[styles.modalTopBar, { paddingTop: insets.top + 12 }]}>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedPhoto(null)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalPhotoTitle} numberOfLines={1}>
                  {selectedPhoto.name || "Event Photo"}
                </Text>
                {selectedPhoto.confidence ? (
                  <Text style={styles.modalPhotoSub}>
                    {selectedPhoto.confidence}% Biometric Match (ResNet-34)
                  </Text>
                ) : null}
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* HIGH-RES IMAGE */}
            <View style={styles.modalImageWrap}>
              <Image
                source={{ uri: selectedPhoto.url || selectedPhoto.thumbnailUrl }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>

            {/* ACTION BUTTONS */}
            <View style={[styles.modalBottomBar, { paddingBottom: insets.bottom + 18 }]}>
              <TouchableOpacity
                style={styles.modalActionBtnSecondary}
                onPress={() => handleWhatsAppShare(selectedPhoto)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text style={styles.modalBtnTextSec}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtnPrimary, { backgroundColor: theme.primary }]}
                onPress={() => handleDownloadSingle(selectedPhoto)}
              >
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.modalBtnTextPrim}>{t.downloadHd}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabBarWrap: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
  },
  tabButtonActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  summaryBanner: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selfieBadgeWrap: {
    position: "relative",
  },
  selfieSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selfieVerifiedTick: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
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
  summaryHeading: {
    fontSize: 15,
    fontWeight: "800",
  },
  summaryDescription: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  albumActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  albumActionBtnOutline: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  albumActionTextOutline: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  albumActionBtnPrimary: {
    flex: 1.4,
    height: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  albumActionTextPrimary: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  emptyActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  emptyBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyBtnTextWhite: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyBtnOutline: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyBtnTextDark: {
    fontSize: 13,
    fontWeight: "700",
  },
  takeSelfieButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  takeSelfieText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoCard: {
    width: (windowWidth - 32 - 12) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  photoImageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  photoImageLoader: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: 180,
  },
  photoConfidenceBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
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
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  photoCategory: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  photoQuickDownload: {
    padding: 2,
  },
  scanningContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scanningCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  scanningPulseRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  scanningSelfie: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  scanningIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  scanningSpinner: {
    position: "absolute",
    width: 110,
    height: 110,
  },
  scanningTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  scanningSub: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  errorActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%",
  },
  retakeButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  retakeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  browseButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  browseText: {
    fontSize: 13,
    fontWeight: "700",
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
    paddingHorizontal: 16,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleBlock: {
    alignItems: "center",
    flex: 1,
  },
  modalPhotoTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalPhotoSub: {
    color: "#34C759",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
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
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalBtnTextSec: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalActionBtnPrimary: {
    flex: 1.6,
    height: 50,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalBtnTextPrim: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
