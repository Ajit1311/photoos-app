import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  CompositeNavigationProp,
} from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MarketplaceStackParamList } from "../../navigation/MarketplaceNavigator";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getClientMarketplaceStudios,
  getClientFavoriteStudios,
  saveClientFavoriteStudio,
  removeClientFavoriteStudio,
} from "../../services/client-app/client-app.service";

import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { useAppSettings } from "../../context/AppSettingsContext";
import type {
  RootStackParamList,
  MainTabParamList,
} from "../../navigation/navigation-types";

type Navigation = CompositeNavigationProp<
  NativeStackNavigationProp<MarketplaceStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type Studio = {
  id: string;
  name: string;
  brand_name?: string | null;
  location: string;
  city: string;
  area: string;
  category: string;
  image: string;
  coverImage?: string;
  sponsored: boolean;
  verified: boolean;
  active: boolean;
  completeness: number;
  rating: number;
  reviews: number;
  phone?: string | null;
  starting_price: number;
  services: string[];
  description?: string;
};

const sponsoredAds = [
  {
    title: "Capture Your\nSpecial Moments",
    subtitle: "Find top photographers in your area.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Stories Worth\nRemembering",
    subtitle: "Discover trusted photography studios near you.",
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Your Portrait.\nYour Story.",
    subtitle: "Explore professional studios for every occasion.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
  },
];

const categories = [
  "All",
  "Wedding",
  "Pre-Wedding",
  "Portrait",
  "Events",
  "Cinematic",
];

const budgetRanges = [
  { id: "all", label: "All Budgets", min: 0, max: Infinity },
  { id: "under_15k", label: "Under ₹15,000", min: 0, max: 15000 },
  { id: "15k_35k", label: "₹15,000 - ₹35,000", min: 15000, max: 35000 },
  { id: "35k_75k", label: "₹35,000 - ₹75,000", min: 35000, max: 75000 },
  { id: "above_75k", label: "₹75,000+", min: 75000, max: Infinity },
];

function normalizeMarketplaceStudios(value: unknown): Studio[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): Studio | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      const id =
        typeof record.id === "string"
          ? record.id
          : typeof record.studio_id === "string"
            ? record.studio_id
            : "";

      if (!id) {
        return null;
      }

      const name =
        typeof record.name === "string"
          ? record.name
          : typeof record.studio_name === "string"
            ? record.studio_name
            : "Photography Studio";

      const city = typeof record.city === "string" ? record.city : "Kolhapur";
      const area = typeof record.area === "string" ? record.area : city;
      const address = typeof record.address === "string" ? record.address : "";
      const location = area && city && area !== city ? `${area}, ${city}` : city || address || "Kolhapur";

      const metadata =
        record.metadata && typeof record.metadata === "object"
          ? (record.metadata as Record<string, unknown>)
          : {};

      const verified =
        record.verified === true ||
        record.is_verified === true ||
        metadata.verified === true ||
        metadata.is_verified === true;

      const sponsored =
        record.sponsored === true ||
        record.is_sponsored === true ||
        record.is_featured === true ||
        metadata.sponsored === true ||
        metadata.is_featured === true;

      const rating =
        typeof record.rating === "number" && record.rating > 0
          ? record.rating
          : typeof metadata.rating === "number" && metadata.rating > 0
            ? (metadata.rating as number)
            : 4.8;

      const reviews =
        typeof record.reviews === "number" && record.reviews > 0
          ? record.reviews
          : typeof record.review_count === "number" && record.review_count > 0
            ? record.review_count
            : typeof metadata.review_count === "number"
              ? (metadata.review_count as number)
              : 28;

      const image =
        typeof record.logo_url === "string" && record.logo_url
          ? record.logo_url
          : typeof record.image_url === "string" && record.image_url
            ? record.image_url
            : typeof record.image === "string" && record.image
              ? record.image
              : "";

      const coverImage =
        typeof record.cover_url === "string" && record.cover_url
          ? record.cover_url
          : typeof metadata.cover_url === "string"
            ? (metadata.cover_url as string)
            : "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80";

      const phone =
        typeof record.phone === "string"
          ? record.phone
          : typeof record.contact_phone === "string"
            ? record.contact_phone
            : "+919876543210";

      const starting_price =
        typeof record.starting_price === "number" && record.starting_price > 0
          ? record.starting_price
          : typeof metadata.starting_price === "number" && metadata.starting_price > 0
            ? (metadata.starting_price as number)
            : 15000;

      const services =
        Array.isArray(record.services) && record.services.length > 0
          ? (record.services as string[])
          : Array.isArray(metadata.services) && metadata.services.length > 0
            ? (metadata.services as string[])
            : ["Wedding", "Pre-Wedding", "Cinematic 4K", "Drone"];

      const completeness =
        typeof record.completeness === "number" ? record.completeness : 85;

      const category =
        typeof record.category === "string" ? record.category : services[0] || "Wedding";

      const active = record.status === undefined || record.status === "active";

      return {
        id,
        name,
        brand_name: typeof record.brand_name === "string" ? record.brand_name : null,
        location,
        city,
        area,
        category,
        image,
        coverImage,
        sponsored,
        verified,
        active,
        completeness,
        rating,
        reviews,
        phone,
        starting_price,
        services,
        description: typeof record.description === "string" ? record.description : "",
      };
    })
    .filter((studio): studio is Studio => studio !== null);
}

export default function MarketplaceScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<MarketplaceStackParamList, "MarketplaceHome">>();
  const { theme, language } = useAppSettings();

  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingStudios, setLoadingStudios] = useState(true);
  const [favoriteStudioIds, setFavoriteStudioIds] = useState<Set<string>>(() => new Set());
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<Set<string>>(() => new Set());

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedBudget, setSelectedBudget] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modals for JustDial Filters
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  const [activeAd, setActiveAd] = useState(0);
  const sponsoredCarouselRef = React.useRef<FlatList>(null);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await getClientFavoriteStudios();
      if (response?.success && Array.isArray(response.data)) {
        setFavoriteStudioIds(
          new Set(
            response.data
              .map((item) => item.studio_id)
              .filter((id): id is string => typeof id === "string" && id.length > 0)
          )
        );
      }
    } catch {}
  }, []);

  const loadStudios = useCallback(async () => {
    try {
      setLoadingStudios(true);
      const response = await getClientMarketplaceStudios();
      let collection: unknown = response;

      if (!Array.isArray(collection) && collection && typeof collection === "object") {
        const payload = collection as Record<string, unknown>;
        collection = payload.data ?? payload.studios ?? payload.items ?? [];
      }

      if (!Array.isArray(collection)) collection = [];
      const normalized = normalizeMarketplaceStudios(collection);
      setStudios(normalized);
    } catch (error) {
      console.error("[MarketplaceScreen] Failed to load studios:", error);
      setStudios([]);
    } finally {
      setLoadingStudios(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStudios();
      void loadFavorites();
    }, [loadStudios, loadFavorites])
  );

  const toggleFavorite = async (studio: Studio) => {
    const isFav = favoriteStudioIds.has(studio.id);
    setFavoriteStudioIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(studio.id);
      else next.add(studio.id);
      return next;
    });

    try {
      if (isFav) {
        await removeClientFavoriteStudio(studio.id);
      } else {
        await saveClientFavoriteStudio(studio.id);
      }
    } catch {}
  };

  // Available unique cities/areas for filter
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    for (const s of studios) {
      if (s.city) set.add(s.city);
      if (s.area && s.area !== s.city) set.add(s.area);
    }
    // Always include prominent Maharashtra regions
    set.add("Kolhapur");
    set.add("Sangli");
    set.add("Satara");
    set.add("Pune");
    set.add("Belagavi");
    return Array.from(set).sort();
  }, [studios]);

  const visibleStudios = useMemo(() => {
    const query = search.trim().toLowerCase();
    const budgetRange = budgetRanges.find((b) => b.id === selectedBudget);

    return studios.filter((studio) => {
      // 1. Category Filter
      const categoryMatch =
        selectedCategory === "All" ||
        studio.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        studio.services.some((srv) => srv.toLowerCase().includes(selectedCategory.toLowerCase()));

      // 2. Search query match
      const searchMatch =
        !query ||
        studio.name.toLowerCase().includes(query) ||
        studio.location.toLowerCase().includes(query) ||
        studio.services.some((srv) => srv.toLowerCase().includes(query));

      // 3. Area / City Filter
      const areaMatch =
        selectedArea === "all" ||
        studio.location.toLowerCase().includes(selectedArea.toLowerCase()) ||
        studio.city.toLowerCase().includes(selectedArea.toLowerCase()) ||
        studio.area.toLowerCase().includes(selectedArea.toLowerCase());

      // 4. Budget Filter
      const budgetMatch =
        !budgetRange ||
        (studio.starting_price >= budgetRange.min && studio.starting_price <= budgetRange.max);

      return categoryMatch && searchMatch && areaMatch && budgetMatch;
    });
  }, [studios, search, selectedCategory, selectedArea, selectedBudget]);

  const handleCallStudio = (phone?: string | null) => {
    if (!phone) return;
    const clean = phone.replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${clean}`);
  };

  const handleChatStudio = (studio: Studio) => {
    navigation.getParent()?.navigate("Conversation", {
      studioId: studio.id,
      studioName: studio.name,
    });
  };

  const handleBookStudio = (studio: Studio) => {
    navigation.navigate("MarketplaceBooking", {
      studioId: studio.id,
      studioName: studio.name,
    });
  };

  const renderStudioCard = ({ item }: { item: Studio }) => (
    <View style={[styles.jdCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* CARD COVER / LOGO HEADER */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("StudioDetails", { studioId: item.id, studioName: item.name })}
        style={styles.jdCoverWrap}
      >
        <Image source={{ uri: item.coverImage || item.image }} style={styles.jdCoverImg} resizeMode="cover" />
        <View style={styles.jdCoverOverlay} />

        {/* TOP BADGES */}
        <View style={styles.jdCoverTopRow}>
          {item.verified ? (
            <View style={styles.jdVerifiedBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
              <Text style={styles.jdVerifiedText}>VERIFIED</Text>
            </View>
          ) : (
            <View style={styles.jdProBadge}>
              <Text style={styles.jdProText}>STUDIO PRO</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.jdFavButton}
            onPress={(e) => {
              e.stopPropagation();
              void toggleFavorite(item);
            }}
          >
            <Ionicons
              name={favoriteStudioIds.has(item.id) ? "heart" : "heart-outline"}
              size={20}
              color={favoriteStudioIds.has(item.id) ? "#E5484D" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>

        {/* STUDIO AVATAR & NAME ON COVER */}
        <View style={styles.jdCoverBottomBlock}>
          <View style={styles.jdAvatarWrap}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.jdAvatarImg} />
            ) : (
              <View style={[styles.jdAvatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.jdAvatarLetter}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.jdCoverNameBlock}>
            <View style={styles.jdNameWithBadge}>
              <Text style={styles.jdStudioName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && <Ionicons name="checkmark-circle" size={17} color="#25D366" />}
            </View>
            <Text style={styles.jdStudioLocation} numberOfLines={1}>
              📍 {item.location}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* CARD BODY: RATINGS, PRICE & SERVICES */}
      <View style={styles.jdCardBody}>
        <View style={styles.jdMetaBar}>
          <View style={styles.jdRatingPill}>
            <Ionicons name="star" size={14} color="#FFA000" />
            <Text style={styles.jdRatingScore}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.jdRatingCount}>({item.reviews} reviews)</Text>
          </View>

          <View style={styles.jdPriceBadge}>
            <Text style={styles.jdPriceLabel}>Starting</Text>
            <Text style={styles.jdPriceValue}>₹{item.starting_price.toLocaleString("en-IN")}</Text>
          </View>
        </View>

        {/* SERVICES TAGS */}
        <View style={styles.jdServiceChipsRow}>
          {item.services.slice(0, 3).map((srv, idx) => (
            <View key={idx} style={[styles.jdServiceTag, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Text style={[styles.jdServiceTagText, { color: theme.textSecondary }]}>
                {srv}
              </Text>
            </View>
          ))}
          {item.services.length > 3 && (
            <View style={[styles.jdServiceTagMore, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.jdServiceTagMoreText, { color: colors.primary }]}>
                +{item.services.length - 3}
              </Text>
            </View>
          )}
        </View>

        {/* ACTION BUTTONS (JUSTDIAL STYLE: CALL, CHAT, BOOK) */}
        <View style={[styles.jdActionGrid, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.jdCallBtn, { borderColor: "#25D366", backgroundColor: "#25D36612" }]}
            activeOpacity={0.82}
            onPress={() => handleCallStudio(item.phone)}
          >
            <Ionicons name="call" size={15} color="#25D366" />
            <Text style={[styles.jdCallBtnText, { color: "#25D366" }]}>
              {language === "मराठी" ? "कॉल करा" : "Call"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.jdChatBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
            activeOpacity={0.82}
            onPress={() => handleChatStudio(item)}
          >
            <Ionicons name="chatbubbles" size={15} color={colors.primary} />
            <Text style={[styles.jdChatBtnText, { color: colors.primary }]}>
              {language === "मराठी" ? "चॅट करा" : "Chat"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.jdBookBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() => handleBookStudio(item)}
          >
            <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
            <Text style={styles.jdBookBtnText}>
              {language === "मराठी" ? "बुक करा" : "Book Now"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* TOP BRAND HEADER */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.logoGroup} onPress={() => navigation.navigate("Main")}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
            <Image
              source={require("../../../assets/PhotoOS-brand-master.png")}
              style={styles.logoMarkImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={[styles.logoText, { color: theme.text }]}>PhotoOS</Text>
            <Text style={[styles.logoSub, { color: theme.textSecondary }]}>STUDIO DIRECTORY</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => navigation.navigate("Language")}
          >
            <Text style={[styles.languageText, { color: theme.text }]}>
              {language === "मराठी" ? "मराठी" : "EN"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={visibleStudios}
        keyExtractor={(item) => item.id}
        renderItem={renderStudioCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* TITLE & SEARCH BAR */}
            <View style={styles.titleSection}>
              <Text style={[styles.mainTitle, { color: theme.text }]}>
                {language === "मराठी" ? "सर्वोत्तम फोटोग्राफी स्टुडिओ" : "Find Top Photography Studios"}
              </Text>
              <Text style={[styles.mainSubtitle, { color: theme.textSecondary }]}>
                {language === "मराठी"
                  ? "लग्न, प्री-वेडिंग व इव्हेंट्ससाठी प्रमाणित स्टुडिओ थेट शोधा व संपर्क करा"
                  : "Verified photographers with direct pricing, ratings & instant booking"}
              </Text>

              {/* SEARCH INPUT */}
              <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search" size={18} color={colors.primary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={
                    language === "मराठी"
                      ? "स्टुडिओचे नाव, शहर किंवा एरिया शोधा..."
                      : "Search by studio, area, city or service..."
                  }
                  placeholderTextColor={theme.textMuted}
                  style={[styles.searchInput, { color: theme.text }]}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* JUSTDIAL QUICK FILTER CHIPS BAR */}
            <View style={styles.filterChipsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {/* 1. AREA FILTER CHIP */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedArea !== "all" ? styles.filterChipActive : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                  onPress={() => setAreaModalVisible(true)}
                >
                  <Ionicons
                    name="location"
                    size={13}
                    color={selectedArea !== "all" ? "#FFFFFF" : colors.primary}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedArea !== "all" ? styles.filterChipTextActive : { color: theme.text },
                    ]}
                  >
                    {selectedArea === "all" ? (language === "मराठी" ? "एरिया ▾" : "Area ▾") : `${selectedArea} ✕`}
                  </Text>
                </TouchableOpacity>

                {/* 2. BUDGET FILTER CHIP */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedBudget !== "all" ? styles.filterChipActive : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                  onPress={() => setBudgetModalVisible(true)}
                >
                  <Ionicons
                    name="cash-outline"
                    size={13}
                    color={selectedBudget !== "all" ? "#FFFFFF" : "#FFA000"}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedBudget !== "all" ? styles.filterChipTextActive : { color: theme.text },
                    ]}
                  >
                    {selectedBudget === "all"
                      ? (language === "मराठी" ? "बजेट ▾" : "Budget ▾")
                      : `${budgetRanges.find((b) => b.id === selectedBudget)?.label} ✕`}
                  </Text>
                </TouchableOpacity>

                {/* 3. DATE / AVAILABILITY CHIP */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedDate ? styles.filterChipActive : { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                  onPress={() => setDateModalVisible(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={selectedDate ? "#FFFFFF" : "#34C759"}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedDate ? styles.filterChipTextActive : { color: theme.text },
                    ]}
                  >
                    {selectedDate ? `${selectedDate} ✕` : (language === "मराठी" ? "तारीख ▾" : "Date ▾")}
                  </Text>
                </TouchableOpacity>

                {/* 4. CATEGORIES CHIPS */}
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        isActive ? styles.filterChipActive : { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isActive ? styles.filterChipTextActive : { color: theme.text },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* RESULTS COUNT */}
            <View style={styles.resultsCountRow}>
              <Text style={[styles.resultsCountText, { color: theme.textSecondary }]}>
                {language === "मराठी"
                  ? `${visibleStudios.length} स्टुडिओ उपलब्ध`
                  : `Showing ${visibleStudios.length} available studios`}
              </Text>
              {(selectedArea !== "all" || selectedBudget !== "all" || selectedCategory !== "All" || selectedDate) && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedArea("all");
                    setSelectedBudget("all");
                    setSelectedCategory("All");
                    setSelectedDate(null);
                    setSearch("");
                  }}
                >
                  <Text style={[styles.resetFiltersText, { color: colors.primary }]}>
                    {language === "मराठी" ? "फिल्टर काढा (Reset)" : "Reset Filters"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          !loadingStudios ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {language === "मराठी" ? "कोणताही स्टुडिओ आढळला नाही" : "No studios found"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {language === "मराठी"
                  ? "कृपया फिल्टर किंवा एरिया बदलून पुन्हा प्रयत्न करा."
                  : "Try adjusting your area, budget or search keywords."}
              </Text>
            </View>
          ) : null
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: AREA / CITY FILTER PICKER */}
      {/* ------------------------------------------------------------- */}
      <Modal visible={areaModalVisible} transparent animationType="slide" onRequestClose={() => setAreaModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerModalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={[styles.pickerModalTitle, { color: theme.text }]}>
                📍 {language === "मराठी" ? "एरिया / शहर निवडा" : "Select Area / City"}
              </Text>
              <TouchableOpacity onPress={() => setAreaModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              <TouchableOpacity
                style={[styles.pickerItem, selectedArea === "all" && styles.pickerItemActive]}
                onPress={() => {
                  setSelectedArea("all");
                  setAreaModalVisible(false);
                }}
              >
                <Text style={[styles.pickerItemText, { color: theme.text }, selectedArea === "all" && { color: colors.primary, fontWeight: "700" }]}>
                  {language === "मराठी" ? "सर्व एरिया (All Locations)" : "All Locations"}
                </Text>
                {selectedArea === "all" && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>

              {availableAreas.map((areaName) => (
                <TouchableOpacity
                  key={areaName}
                  style={[styles.pickerItem, selectedArea === areaName && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedArea(areaName);
                    setAreaModalVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text }, selectedArea === areaName && { color: colors.primary, fontWeight: "700" }]}>
                    📍 {areaName}
                  </Text>
                  {selectedArea === areaName && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: BUDGET RANGE PICKER */}
      {/* ------------------------------------------------------------- */}
      <Modal visible={budgetModalVisible} transparent animationType="slide" onRequestClose={() => setBudgetModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerModalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={[styles.pickerModalTitle, { color: theme.text }]}>
                ₹ {language === "मराठी" ? "बजेट रेंज निवडा" : "Select Starting Budget"}
              </Text>
              <TouchableOpacity onPress={() => setBudgetModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {budgetRanges.map((br) => (
                <TouchableOpacity
                  key={br.id}
                  style={[styles.pickerItem, selectedBudget === br.id && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedBudget(br.id);
                    setBudgetModalVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text }, selectedBudget === br.id && { color: colors.primary, fontWeight: "700" }]}>
                    {br.label}
                  </Text>
                  {selectedBudget === br.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: DATE AVAILABILITY PICKER */}
      {/* ------------------------------------------------------------- */}
      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerModalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={[styles.pickerModalTitle, { color: theme.text }]}>
                📅 {language === "मराठी" ? "इव्हेंट तारीख निवडा" : "Select Event Date"}
              </Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12 }}>
              {["Today / Any Date", "This Weekend", "Next Month", "2026 Season Booking"].map((dt) => (
                <TouchableOpacity
                  key={dt}
                  style={[styles.pickerItem, selectedDate === dt && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedDate(dt === "Today / Any Date" ? null : dt);
                    setDateModalVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: theme.text }, selectedDate === dt && { color: colors.primary, fontWeight: "700" }]}>
                    {dt}
                  </Text>
                  {selectedDate === dt && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  logoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkImage: {
    width: 26,
    height: 26,
  },
  logoText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  languageText: {
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  titleSection: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  mainSubtitle: {
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },
  filterChipsContainer: {
    marginTop: 10,
    marginBottom: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  resultsCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: "500",
  },
  resetFiltersText: {
    fontSize: 12,
    fontWeight: "700",
  },
  /* JUSTDIAL STYLE CARD */
  jdCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  jdCoverWrap: {
    height: 150,
    width: "100%",
    position: "relative",
    justifyContent: "space-between",
    padding: 12,
  },
  jdCoverImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  jdCoverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  jdCoverTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jdVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#25D366",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  jdVerifiedText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  jdProBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  jdProText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  jdFavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  jdCoverBottomBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  jdAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  jdAvatarImg: {
    width: "100%",
    height: "100%",
  },
  jdAvatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  jdAvatarLetter: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  jdCoverNameBlock: {
    flex: 1,
  },
  jdNameWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  jdStudioName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  jdStudioLocation: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11.5,
    marginTop: 2,
  },
  jdCardBody: {
    padding: 14,
  },
  jdMetaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  jdRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFA00018",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  jdRatingScore: {
    color: "#D97706",
    fontSize: 12.5,
    fontWeight: "800",
  },
  jdRatingCount: {
    color: "#6B7280",
    fontSize: 11,
  },
  jdPriceBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  jdPriceLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  jdPriceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
  },
  jdServiceChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  jdServiceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  jdServiceTagText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  jdServiceTagMore: {
    paddingHorizontal: 6,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  jdServiceTagMoreText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  jdActionGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  jdCallBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  jdCallBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  jdChatBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  jdChatBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  jdBookBtn: {
    flex: 1.3,
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  jdBookBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    marginTop: 4,
    textAlign: "center",
  },
  /* MODAL BOTTOM SHEET */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  pickerItemActive: {
    backgroundColor: `${colors.primary}08`,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
