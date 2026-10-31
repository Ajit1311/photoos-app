import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  FlatList,
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
  const { theme, t } = useAppSettings();
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

        carouselRef.current?.scrollToOffset({
          offset: next * carouselWidth,
          animated: true,
        });

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
              <Text style={[styles.logoText, { color: theme.text }]}>
                PhotoOS
              </Text>
              <Text style={[styles.logoSubtitle, { color: theme.textSecondary }]}>
                STUDIO PRO
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
          <Text style={[styles.welcomeGreeting, { color: theme.textSecondary }]}>
            {t("welcomeBack")}
          </Text>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            {userName}
          </Text>
        </View>

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
        {/* SPONSORED CAROUSEL */}
        {/* ------------------------------------------------------------ */}
        <View style={styles.adSectionHeader}>
          <Text style={[styles.adLabel, { color: theme.textSecondary }]}>
            {t("sponsored")}
          </Text>

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
                          color="#000000"
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
          borderColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.quickIcon,
          { backgroundColor: `${accentColor}15` },
        ]}
      >
        <Ionicons name={icon} size={20} color={accentColor} />
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
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F589B",
  },

  logoMarkImage: {
    width: 32,
    height: 32,
  },

  brandTextWrap: {
    marginLeft: 10,
  },

  logoText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  logoSubtitle: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: -1,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  notificationDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  /* WELCOME */
  welcomeSection: {
    marginBottom: 16,
    paddingTop: 4,
  },

  welcomeGreeting: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
    marginBottom: 2,
  },

  welcomeTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
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
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    marginBottom: 8,
  },

  adLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
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
});
