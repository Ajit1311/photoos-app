import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Image,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/navigation-types";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { useAppSettings } from "../../context/AppSettingsContext";
import type { AppTheme } from "../../context/AppSettingsContext";
import { useAuth } from "../../services/auth/auth-context";
import {
  getClientAlbums,
  getClientBookings,
  type ClientAlbum,
  type ClientBooking,
} from "../../services/client-app/client-app.service";
import {
  detectEventFromUrlOrDeepLink,
  getActiveEventContextSync,
  type ActiveEventContext,
} from "../../services/event-gallery/event-qr-detector";
import {
  fetchLiveEventGallery,
  type LiveEventPhoto,
} from "../../services/event-gallery/live-event-photos.service";

const sponsoredAds = [
  {
    id: "ad-1",
    badge: "FEATURED",
    title: "Capture Your\nSpecial Moments",
    subtitle: "Professional photography for every occasion.",
    action: "Book Now",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
    align: "left" as const,
  },
  {
    id: "ad-2",
    badge: "PROMOTED",
    title: "Stories Worth\nRemembering",
    subtitle: "Beautiful pre-wedding photography with a cinematic touch.",
    action: "Explore",
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85",
    align: "left" as const,
  },
  {
    id: "ad-3",
    badge: "FEATURED",
    title: "Your Portrait.\nYour Story.",
    subtitle: "Premium studio portraits for every profile and occasion.",
    action: "View Studio",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    align: "left" as const,
  },
  {
    id: "ad-4",
    badge: "PROMOTED",
    title: "Stories That\nLast Forever",
    subtitle: "Find trusted photographers and studios on PhotoOS.",
    action: "Discover",
    image:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85",
    align: "left" as const,
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, t, language } = useAppSettings();
  const { width: windowWidth } = useWindowDimensions();
  const { user, photoosIdentity } = useAuth();

  const firebaseName = String(
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ""
  ).trim();

  const profileName = photoosIdentity?.profile?.full_name?.trim() || "";

  const userName =
    firebaseName && !firebaseName.includes("@")
      ? firebaseName
      : profileName && !profileName.includes("@")
        ? profileName
        : "Guest";

  const carouselWidth = Math.max(windowWidth - 36, 280);
  const carouselRef = useRef<FlatList>(null);
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAdIndex((current) => {
        const next =
          current === sponsoredAds.length - 1 ? 0 : current + 1;

        setTimeout(() => {
          try {
            carouselRef.current?.scrollToOffset({
              offset: next * carouselWidth,
              animated: true,
            });
          } catch {}
        }, 0);

        return next;
      });
    }, 3800);

    return () => clearInterval(timer);
  }, [carouselWidth]);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [lastBooking, setLastBooking] = useState<ClientBooking | null>(null);
  const [recentAlbum, setRecentAlbum] = useState<ClientAlbum | null>(null);
  const [homeDataLoading, setHomeDataLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<ActiveEventContext | null>(
    () => getActiveEventContextSync()
  );
  const [eventPhotos, setEventPhotos] = useState<LiveEventPhoto[]>([]);
  const [loadingEventPhotos, setLoadingEventPhotos] = useState(false);
  const [cachedMatchedCount, setCachedMatchedCount] = useState<number>(0);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && activeEvent?.eventId) {
      try {
        const raw = localStorage.getItem(`@photoos_matched_${activeEvent.eventId}`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            setCachedMatchedCount(list.length);
          }
        }
      } catch {}
    }
  }, [activeEvent?.eventId]);

  useEffect(() => {
    void (async () => {
      const detected = await detectEventFromUrlOrDeepLink();
      if (detected) {
        setActiveEvent(detected);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeEvent?.eventId) return;
    let isMounted = true;
    setLoadingEventPhotos(true);
    fetchLiveEventGallery(activeEvent.eventId, activeEvent.type)
      .then((res) => {
        if (isMounted && res.photos) {
          setEventPhotos(res.photos);
        }
      })
      .catch((err) => {
        console.warn("[HomeScreen] Unable to load event preview photos:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingEventPhotos(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeEvent?.eventId, activeEvent?.type]);

  useEffect(() => {
    let mounted = true;

    const loadHomeData = async () => {
      try {
        const [bookingResponse, albumResponse] = await Promise.all([
          getClientBookings(),
          getClientAlbums(),
        ]);

        if (!mounted) return;

        const bookings = bookingResponse.bookings ?? [];
        const albums = albumResponse.albums ?? [];

        setLastBooking(bookings[0] ?? null);
        setRecentAlbum(albums[0] ?? null);
      } catch (error) {
        console.warn("HOME_DATA :: unable to load client data", error);
      } finally {
        if (mounted) {
          setHomeDataLoading(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      mounted = false;
    };
  }, []);

  const dynamicStyles = {
    text: { color: theme.text },
    secondary: { color: theme.textSecondary },
    muted: { color: theme.textMuted },
    primary: { color: theme.primary },
    surface: { backgroundColor: theme.surface },
    background: { backgroundColor: theme.background },
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 110,
          },
        ]}
      >
        {/* ------------------------------------------------------------ */}
        {/* TOP APPLE HEADER */}
        {/* ------------------------------------------------------------ */}
        <View
          style={[
            styles.topHeader,
            { backgroundColor: theme.background },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.logoArea}
            onPress={() => navigation.navigate("Main")}
          >
            <View style={styles.logoMark}>
              <Image
                source={require("../../../assets/PhotoOS-brand-master.png")}
                style={styles.logoMarkImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.brandTextWrap}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.logoText, { color: theme.text }]}>
                  PhotoOS
                </Text>
                <View style={styles.vipBadgePill}>
                  <Text style={styles.vipBadgeText}>CLIENT</Text>
                </View>
              </View>
              <Text style={styles.logoSubtitle}>
                AI STUDIO NETWORK
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.navigate("Appearance")}
            >
              <Ionicons
                name="contrast-outline"
                size={18}
                color={theme.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.navigate("Language")}
            >
              <Ionicons
                name="globe-outline"
                size={18}
                color={theme.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.headerIconButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color={theme.text}
              />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ------------------------------------------------------------ */}
        {/* APPLE LARGE TITLE WELCOME */}
        {/* ------------------------------------------------------------ */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeSubRow}>
            <Ionicons name="sparkles" size={13} color="#EF8619" />
            <Text style={[styles.welcomeGreeting, { color: theme.textSecondary }]}>
              {t("welcomeBack")}
            </Text>
          </View>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            {userName}
          </Text>
        </View>

        {/* ------------------------------------------------------------ */}
        {/* TOP SPONSORED / PAID AD CAROUSEL */}
        {/* ------------------------------------------------------------ */}
        <View style={styles.adSectionHeader}>
          <View style={styles.topAdBadgeWrap}>
            <Ionicons name="sparkles" size={12} color="#EF8619" />
            <Text style={styles.adLabel}>
              {language === "मराठी" ? "प्रायोजित जाहिरात • SPONSORED" : "SPONSORED SPOTLIGHT"}
            </Text>
          </View>

          <View style={styles.carouselIndicator}>
            {sponsoredAds.map((_, index) => (
              <View
                key={index}
                style={[
                  index === activeAdIndex
                    ? [styles.carouselDotActive, { backgroundColor: theme.primary }]
                    : [styles.carouselDot, { backgroundColor: theme.border }],
                ]}
              />
            ))}
          </View>
        </View>

        <View
          style={[
            styles.carouselViewport,
            { width: carouselWidth, borderColor: theme.border },
          ]}
        >
          <FlatList
            ref={carouselRef}
            data={sponsoredAds}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            snapToInterval={carouselWidth}
            snapToAlignment="start"
            disableIntervalMomentum
            keyExtractor={(item) => item.id}
            getItemLayout={(_, index) => ({
              length: carouselWidth,
              offset: carouselWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const offset = event.nativeEvent.contentOffset.x;
              const index = Math.round(offset / carouselWidth);
              setActiveAdIndex(
                Math.max(0, Math.min(index, sponsoredAds.length - 1))
              );
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => navigation.navigate("Main", { screen: "Marketplace" })}
                style={[styles.adCard, { width: carouselWidth }]}
              >
                <ImageBackground
                  source={{ uri: item.image }}
                  style={styles.adImage}
                  imageStyle={styles.adImageRadius}
                  resizeMode="cover"
                >
                  <View style={styles.adImageOverlay} />

                  <View style={styles.adBannerContent}>
                    <View style={styles.adBadge}>
                      <Text style={styles.adBadgeText}>{item.badge}</Text>
                    </View>

                    <View style={styles.adBannerBottom}>
                      <Text style={styles.adTitle} numberOfLines={2}>
                        {item.title}
                      </Text>

                      <Text style={styles.adSubtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>

                      <View style={styles.adAction}>
                        <Text style={styles.adActionText}>{item.action}</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color="#0A3F61"
                        />
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ------------------------------------------------------------ */}
        {/* ACTIVE EVENT HERO CARD */}
        {/* ------------------------------------------------------------ */}
        {activeEvent ? (
          <View
            style={[
              styles.eventHeroCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.eventHeroBadgeRow}>
              <View style={styles.eventLiveBadge}>
                <View style={styles.eventLiveDot} />
                <Text style={styles.eventLiveText}>
                  {activeEvent.type === "corporate" ? "🏢 CORPORATE EVENT" : "📸 STUDIO EVENT"}
                </Text>
              </View>

              <View style={[styles.eventPhotoCountBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="images" size={12} color={colors.primary} />
                <Text style={[styles.eventPhotoCountText, { color: colors.primary }]}>
                  {loadingEventPhotos ? "..." : `${eventPhotos.length} Photos`}
                </Text>
              </View>
            </View>

            <Text style={[styles.eventHeroTitle, { color: theme.text }]}>
              {activeEvent.eventName}
            </Text>

            <Text style={[styles.eventStudioText, { color: theme.textSecondary, marginBottom: 8 }]}>
              {activeEvent.type === "corporate"
                ? `🏢 ${activeEvent.studioName || "Corporate Office"} (HR Admin)`
                : `📍 ${activeEvent.studioName || "Photo Studio"}`}
            </Text>

            {/* EVENT PHOTOS PREVIEW STRIP */}
            {eventPhotos.length > 0 && (
              <View style={styles.eventPhotoPreviewContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventPhotoStrip}
                >
                  {eventPhotos.slice(0, 8).map((photo, pIdx) => (
                    <TouchableOpacity
                      key={photo.id || `thumb_${pIdx}`}
                      activeOpacity={0.85}
                      style={[styles.eventPhotoThumbWrap, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate("FaceMatchResults", {})}
                    >
                      <Image
                        source={{ uri: photo.thumbnailUrl || photo.url }}
                        style={styles.eventPhotoThumb}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                  {eventPhotos.length > 8 && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.eventPhotoMoreWrap,
                        { backgroundColor: `${colors.primary}18`, borderColor: colors.primary },
                      ]}
                      onPress={() => navigation.navigate("FaceMatchResults", {})}
                    >
                      <Text style={[styles.eventPhotoMoreText, { color: colors.primary }]}>
                        +{eventPhotos.length - 8}
                      </Text>
                      <Text style={[styles.eventPhotoMoreSub, { color: colors.primary }]}>
                        More
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.eventHeroSub, { color: theme.textSecondary }]}>
              {language === "मराठी"
                ? "तुमचे वैयक्तिक फोटो AI द्वारे शोधण्यासाठी सेल्फी स्कॅन करा किंवा थेट सर्व फोटो पहा."
                : language === "हिन्दी"
                  ? "अपनी तस्वीरें AI से खोजने के लिए सेल्फी स्कैन करें या सीधे सभी फोटो देखें।"
                  : "Scan your face for instant AI matching or browse all event photos directly."}
            </Text>

            {/* ACTION 0: DEDICATED PERSONAL MATCHED ALBUM IF ALREADY SCANNED */}
            {cachedMatchedCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.eventHeroButton,
                  {
                    backgroundColor: "#10B981",
                    marginBottom: 10,
                  },
                ]}
                onPress={() => navigation.navigate("FaceMatchResults", {})}
              >
                <Ionicons name="folder-open" size={18} color="#FFFFFF" />
                <Text style={styles.eventHeroButtonText}>
                  {language === "मराठी"
                    ? `✨ माझा वैयक्तिक अल्बम (${cachedMatchedCount} फोटो)`
                    : `✨ My Personal Album (${cachedMatchedCount} Photos)`}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* ACTION 1: AI FACE MATCH */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.eventHeroButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate("Main", { screen: "Camera" })}
            >
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.eventHeroButtonText}>
                {language === "मराठी"
                  ? "✨ AI द्वारे माझे फोटो शोधा (Scan Face)"
                  : language === "हिन्दी"
                    ? "✨ AI से मेरे फोटो खोजें (Scan Face)"
                    : "✨ Find My Photos with AI (Scan Face)"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* ACTION 2: BROWSE ALL EVENT PHOTOS */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.eventBrowseAllButton,
                {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                },
              ]}
              onPress={() => navigation.navigate("FaceMatchResults", {})}
            >
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={[styles.eventBrowseAllText, { color: colors.primary }]}>
                {language === "मराठी"
                  ? `🖼️ सर्व फोटो पहा (${eventPhotos.length}) - Browse All`
                  : language === "हिन्दी"
                    ? `🖼️ सभी फोटो देखें (${eventPhotos.length}) - Browse All`
                    : `🖼️ Browse All Event Photos (${eventPhotos.length})`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>

            {/* ACTION 3: CHAT (CORPORATE ADMIN / STUDIO) */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.eventBrowseAllButton,
                {
                  borderColor: activeEvent.type === "corporate" ? "#2563EB" : "#00a884",
                  backgroundColor: activeEvent.type === "corporate" ? "#2563EB15" : "#00a88415",
                  marginTop: 8,
                },
              ]}
              onPress={() =>
                navigation.navigate("Conversation", {
                  studioId: activeEvent.studioId || activeEvent.eventId,
                  studioName:
                    activeEvent.type === "corporate"
                      ? (activeEvent.studioName ? `${activeEvent.studioName} (Admin)` : "Office Admin (HR)")
                      : (activeEvent.studioName || "Photo Studio"),
                  title:
                    activeEvent.type === "corporate"
                      ? "Chat with Admin"
                      : (activeEvent.studioName || activeEvent.eventName),
                  isCorporate: activeEvent.type === "corporate",
                  eventName: activeEvent.eventName,
                })
              }
            >
              <Ionicons
                name={activeEvent.type === "corporate" ? "people" : "chatbubbles"}
                size={18}
                color={activeEvent.type === "corporate" ? "#2563EB" : "#00a884"}
              />
              <Text
                style={[
                  styles.eventBrowseAllText,
                  { color: activeEvent.type === "corporate" ? "#2563EB" : "#00a884" },
                ]}
              >
                {activeEvent.type === "corporate"
                  ? (language === "मराठी"
                      ? "💬 ॲडमिनशी थेट चॅट करा (Chat with HR Admin)"
                      : language === "हिन्दी"
                        ? "💬 एडमिन से सीधे चैट करें (Chat with HR Admin)"
                        : "💬 Chat with Admin (HR / Office Admin)")
                  : (language === "मराठी"
                      ? "💬 स्टुडिओशी थेट चॅट करा (Chat with Studio)"
                      : language === "हिन्दी"
                        ? "💬 स्टूडियो से सीधे चैट करें (Chat with Studio)"
                        : "💬 Chat Directly with Studio")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={activeEvent.type === "corporate" ? "#2563EB" : "#00a884"}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.aiDiscoveryHeroCard}
            onPress={() => navigation.navigate("Main", { screen: "Camera" })}
          >
            <View style={styles.aiHeroBadgeRow}>
              <View style={styles.aiHeroBadge}>
                <Ionicons name="sparkles" size={13} color="#EF8619" />
                <Text style={styles.aiHeroBadgeText}>AI-POWERED MATCHING • 99.4% ACCURACY</Text>
              </View>

              <View style={styles.aiInstantBadge}>
                <Text style={styles.aiInstantText}>INSTANT</Text>
              </View>
            </View>

            <Text style={styles.aiHeroTitle}>
              {language === "मराठी"
                ? "चेहऱ्यावरून तुमचे फोटो त्वरित शोधा"
                : language === "हिन्दी"
                  ? "चेहरे से अपने फोटो तुरंत खोजें"
                  : "Find Your Photos by Face"}
            </Text>

            <Text style={styles.aiHeroSubtitle}>
              {language === "मराठी"
                ? "इव्हेंटमधील हजारो फोटोंमधून तुमचा सेल्फी स्कॅन करून तुमचे सर्व फोटो सेकंदात मिळवा."
                : language === "हिन्दी"
                  ? "हजारों तस्वीरों में से अपना सेल्फी स्कैन करके अपने सभी फोटो तुरंत प्राप्त करें।"
                  : "Scan your selfie to discover and download all your private event photos instantly."}
            </Text>

            <View style={styles.aiHeroScanButton}>
              <Ionicons name="camera" size={18} color="#0A3F61" />
              <Text style={styles.aiHeroScanButtonText}>
                {language === "मराठी"
                  ? "✨ सेल्फी स्कॅन सुरू करा (Scan Face)"
                  : language === "हिन्दी"
                    ? "✨ सेल्फी स्कैन शुरू करें (Scan Face)"
                    : "✨ Start Face Scan Now"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#0A3F61" />
            </View>
          </TouchableOpacity>
        )}

        {/* ------------------------------------------------------------ */}
        {/* APPLE SEARCH BAR */}
        {/* ------------------------------------------------------------ */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => navigation.navigate("Main", { screen: "Marketplace" })}
        >
          <View style={[styles.searchIcon, { backgroundColor: `${theme.primary}14` }]}>
            <Ionicons
              name="search"
              size={18}
              color={theme.primary}
            />
          </View>

          <Text style={[styles.searchPlaceholder, { color: theme.textMuted }]}>
            {t("search")}
          </Text>

          <View style={[styles.filterButton, { backgroundColor: theme.surfaceSoft }]}>
            <Ionicons
              name="options-outline"
              size={16}
              color={theme.textSecondary}
            />
          </View>
        </TouchableOpacity>


        {/* ------------------------------------------------------------ */}
        {/* APPLE QUICK ACCESS GRID */}
        {/* ------------------------------------------------------------ */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("quickAccess")}
          </Text>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction
            theme={theme}
            icon="calendar"
            accentColor="#007AFF"
            title={t("bookings")}
            subtitle={t("bookingsSub")}
            onPress={() => navigation.navigate("Bookings")}
          />

          <QuickAction
            theme={theme}
            icon="images"
            accentColor="#5856D6"
            title={t("albums")}
            subtitle={t("albumsSub")}
            onPress={() => navigation.navigate("Albums")}
          />

          <QuickAction
            theme={theme}
            icon="card"
            accentColor="#34C759"
            title={t("payments")}
            subtitle={t("paymentsSub")}
            onPress={() => navigation.navigate("Payments")}
          />

          <QuickAction
            theme={theme}
            icon="heart"
            accentColor="#FF2D55"
            title="Saved Studios"
            subtitle="Your favorites"
            onPress={() => navigation.navigate("FavoriteStudios")}
          />
        </View>

        {/* ------------------------------------------------------------ */}
        {/* LAST BOOKING - APPLE INSET GROUP */}
        {/* ------------------------------------------------------------ */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("lastBooking")}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Bookings")}
          >
            <Text style={[styles.viewAll, { color: theme.primary }]}>
              {t("viewAll")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate("Bookings")}
          style={[
            styles.bookingCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.bookingIcon,
              { backgroundColor: `${theme.primary}12` },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={theme.primary}
            />
          </View>

          <View style={styles.bookingInfo}>
            <Text
              style={[styles.bookingStudio, { color: theme.text }]}
              numberOfLines={1}
            >
              {homeDataLoading
                ? "Checking sessions..."
                : lastBooking?.title ||
                  lastBooking?.event_type ||
                  t("photographyStudio")}
            </Text>

            <Text
              style={[styles.bookingType, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {homeDataLoading
                ? "Loading details..."
                : lastBooking
                  ? lastBooking.status || t("photographySession")
                  : t("noBooking")}
            </Text>

            <View style={styles.bookingMeta}>
              <Ionicons
                name="time-outline"
                size={13}
                color={theme.textMuted}
              />
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {homeDataLoading
                  ? "Loading..."
                  : lastBooking?.event_date
                    ? new Date(lastBooking.event_date).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "No upcoming session"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${theme.primary}14` },
            ]}
          >
            <Text style={[styles.statusText, { color: theme.primary }]}>
              {lastBooking?.status || t("explore")}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ------------------------------------------------------------ */}
        {/* RECENT ALBUM */}
        {/* ------------------------------------------------------------ */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("recentAlbum")}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Albums")}
          >
            <Text style={[styles.viewAll, { color: theme.primary }]}>
              {t("viewAll")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate("Albums")}
          style={[
            styles.albumCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.albumImage}>
            <Ionicons
              name="images"
              size={36}
              color="rgba(255, 255, 255, 0.85)"
            />
          </View>

          <View style={styles.albumInfo}>
            <Text style={[styles.albumTitle, { color: theme.text }]}>
              {homeDataLoading
                ? "Loading memories..."
                : recentAlbum?.title || t("memories")}
            </Text>

            <Text
              style={[styles.albumSubtitle, { color: theme.textSecondary }]}
            >
              {homeDataLoading
                ? "Fetching album..."
                : recentAlbum
                  ? recentAlbum.status || "Album ready for download"
                  : `${t("memoriesText")}`}
            </Text>

            <View style={styles.albumArrow}>
              <Text style={[styles.albumArrowText, { color: theme.primary }]}>
                {recentAlbum ? t("openAlbum") : t("viewAll")}
              </Text>

              <Ionicons
                name="arrow-forward"
                size={14}
                color={theme.primary}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* ------------------------------------------------------------ */}
        {/* DISCOVER STUDIOS */}
        {/* ------------------------------------------------------------ */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate("Main", { screen: "Marketplace" })}
          style={[
            styles.discoverCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.discoverIcon,
              { backgroundColor: `${theme.primary}14` },
            ]}
          >
            <Ionicons
              name="compass"
              size={24}
              color={theme.primary}
            />
          </View>

          <View style={styles.discoverContent}>
            <Text style={[styles.discoverTitle, { color: theme.text }]}>
              {t("discoverStudios")}
            </Text>

            <Text
              style={[styles.discoverText, { color: theme.textSecondary }]}
            >
              {t("discoverDescription")}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.textMuted}
          />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  accentColor,
  title,
  subtitle,
  theme,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  theme: AppTheme;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.quickCard,
        {
          backgroundColor: theme.surface,
          borderColor: `${accentColor}35`,
        },
      ]}
    >
      <View style={styles.quickCardHeader}>
        <View
          style={[
            styles.quickIcon,
            { backgroundColor: accentColor },
          ]}
        >
          <Ionicons name={icon} size={19} color="#FFFFFF" />
        </View>

        <View style={[styles.quickCardArrowPill, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons name="arrow-forward" size={12} color={accentColor} />
        </View>
      </View>

      <Text style={[styles.quickTitle, { color: theme.text }]}>
        {title}
      </Text>

      <Text
        style={[styles.quickSubtitle, { color: theme.textSecondary }]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },

  /* HEADER */
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 14,
  },

  logoArea: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A3F61",
    borderWidth: 1,
    borderColor: "rgba(239, 134, 25, 0.35)",
    shadowColor: "#0A3F61",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },

  logoMarkImage: {
    width: 32,
    height: 32,
  },

  brandTextWrap: {
    marginLeft: 10,
  },

  logoText: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  vipBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "rgba(239, 134, 25, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 134, 25, 0.3)",
  },

  vipBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#EF8619",
    letterSpacing: 0.6,
  },

  logoSubtitle: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#EF8619",
    marginTop: 1,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  notificationDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  /* WELCOME */
  welcomeSection: {
    marginBottom: 16,
    paddingTop: 4,
  },

  welcomeSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },

  welcomeGreeting: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  welcomeTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  /* SEARCH */
  searchBox: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    letterSpacing: -0.2,
  },

  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* SECTIONS */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  viewAll: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* QUICK ACCESS */
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  quickCard: {
    width: "48.5%",
    minHeight: 114,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0A3F61",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "space-between",
  },

  quickCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  quickCardArrowPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  quickTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 2,
  },

  quickSubtitle: {
    fontSize: 11.5,
  },

  /* BOOKING */
  bookingCard: {
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  bookingIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  bookingInfo: {
    flex: 1,
  },

  bookingStudio: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  bookingType: {
    fontSize: 12,
    marginTop: 2,
  },

  bookingMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },

  metaText: {
    fontSize: 11,
  },

  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* AD */
  carouselViewport: {
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
  },

  carouselIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  carouselDotActive: {
    width: 18,
    height: 5,
    borderRadius: 3,
  },

  carouselDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  adCard: {
    height: 195,
    borderRadius: 20,
    overflow: "hidden",
  },

  adImage: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
  },

  adImageRadius: {
    borderRadius: 20,
  },

  adImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.32)",
  },

  adBannerContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: "space-between",
  },

  adBannerBottom: {
    width: "80%",
    maxWidth: 290,
  },

  adSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },

  topAdBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239, 134, 25, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 134, 25, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  adLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#EF8619",
  },

  adBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },

  adBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#000000",
  },

  adTitle: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 4,
  },

  adSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 10,
  },

  adAction: {
    alignSelf: "flex-start",
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  adActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#000000",
  },

  /* ALBUM */
  albumCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  albumImage: {
    height: 120,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },

  albumInfo: {
    padding: 15,
  },

  albumTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  albumSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  albumArrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  albumArrowText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* DISCOVER */
  discoverCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  discoverIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  discoverContent: {
    flex: 1,
  },

  discoverTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  discoverText: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },

  /* AI DISCOVERY HERO CARD (PREMIUM ULTRA-LUXURY) */
  aiDiscoveryHeroCard: {
    borderRadius: 24,
    backgroundColor: "#0A3F61",
    padding: 22,
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: "rgba(239, 134, 25, 0.35)",
    shadowColor: "#0A3F61",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  aiHeroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  aiHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 134, 25, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(239, 134, 25, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  aiHeroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FF9D3B",
    letterSpacing: 0.6,
  },
  aiInstantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  aiInstantText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  aiHeroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 6,
    lineHeight: 28,
  },
  aiHeroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(255, 255, 255, 0.82)",
    marginBottom: 16,
  },
  aiHeroScanButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  aiHeroScanButtonText: {
    color: "#0A3F61",
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  /* ACTIVE EVENT HERO CARD */
  eventHeroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  eventHeroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  eventLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(52, 199, 89, 0.15)",
  },
  eventLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  eventLiveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34C759",
    letterSpacing: 0.4,
  },
  eventStudioText: {
    fontSize: 12,
    fontWeight: "600",
  },
  eventHeroTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  eventHeroSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  eventHeroButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  eventHeroButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  eventBrowseAllButton: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  eventBrowseAllText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginLeft: 8,
  },
  eventPhotoCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventPhotoCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  eventPhotoPreviewContainer: {
    marginVertical: 10,
  },
  eventPhotoStrip: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  eventPhotoThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  eventPhotoThumb: {
    width: "100%",
    height: "100%",
  },
  eventPhotoMoreWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eventPhotoMoreText: {
    fontSize: 14,
    fontWeight: "800",
  },
  eventPhotoMoreSub: {
    fontSize: 10,
    fontWeight: "600",
  },
});
