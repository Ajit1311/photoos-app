import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
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

type Studio = {
  id: string;
  name: string;
  location: string;
  category: string;
  image: string;
  sponsored: boolean;
  verified: boolean;
  active: boolean;
  completeness: number;
  rating: number;
  reviews: number;
};

const sponsoredAds = [
  {
    title: "Capture Your\\nSpecial Moments",
    subtitle: "Find photographers who turn moments into memories.",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Stories Worth\\nRemembering",
    subtitle: "Discover trusted photography studios near you.",
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Your Portrait.\\nYour Story.",
    subtitle: "Explore photographers for every occasion.",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Stories That\\nLast Forever",
    subtitle: "Book the right studio for your next memory.",
    image:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85",
  },
];



const categories = [
  "All",
  "Wedding",
  "Pre-Wedding",
  "Portrait",
  "Events",
  "Photography",
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

      const city =
        typeof record.city === "string"
          ? record.city
          : "";

      const address =
        typeof record.address === "string"
          ? record.address
          : "";

      const location =
        city ||
        address ||
        "Location not available";

      const metadata =
        record.metadata &&
        typeof record.metadata === "object"
          ? (record.metadata as Record<string, unknown>)
          : {};

      const verified =
        record.verified === true ||
        record.is_verified === true ||
        metadata.verified === true;

      const sponsored =
        record.sponsored === true ||
        record.is_featured === true ||
        metadata.sponsored === true ||
        metadata.is_featured === true;

      const rating =
        typeof record.rating === "number"
          ? record.rating
          : typeof record.average_rating === "number"
            ? record.average_rating
            : 0;

      const reviews =
        typeof record.reviews === "number"
          ? record.reviews
          : typeof record.review_count === "number"
            ? record.review_count
            : typeof record.total_reviews === "number"
              ? record.total_reviews
              : 0;

      const image =
        typeof record.logo_url === "string"
          ? record.logo_url
          : typeof record.image_url === "string"
            ? record.image_url
            : typeof record.cover_url === "string"
              ? record.cover_url
              : "";

      const completeness =
        typeof record.completeness === "number"
          ? record.completeness
          : 0;

      const category =
        typeof record.category === "string"
          ? record.category
          : "Photography";

      const active =
        record.status === undefined ||
        record.status === "active";

      return {
        id,
        name,
        location,
        category,
        image,
        sponsored,
        verified,
        active,
        completeness,
        rating,
        reviews,
      };
    })
    .filter((studio): studio is Studio => studio !== null);
}

export default function MarketplaceScreen() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingStudios, setLoadingStudios] = useState(true);
  const [studioLoadError, setStudioLoadError] = useState<string | null>(null);
  const [favoriteStudioIds, setFavoriteStudioIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState<Set<string>>(
    () => new Set(),
  );

  const loadFavorites = useCallback(async () => {
    try {
      const response = await getClientFavoriteStudios();

      if (response?.success && Array.isArray(response.data)) {
        setFavoriteStudioIds(
          new Set(
            response.data
              .map((item) => item.studio_id)
              .filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        );
      }
    } catch {
      // Marketplace discovery remains usable even if favorites fail to load.
    }
  }, []);

  const toggleFavorite = useCallback(
    async (studio: Studio) => {
      if (favoriteLoadingIds.has(studio.id)) {
        return;
      }

      setFavoriteLoadingIds((current) => {
        const next = new Set(current);
        next.add(studio.id);
        return next;
      });

      const wasFavorite = favoriteStudioIds.has(studio.id);

      // Optimistic UI update.
      setFavoriteStudioIds((current) => {
        const next = new Set(current);

        if (wasFavorite) {
          next.delete(studio.id);
        } else {
          next.add(studio.id);
        }

        return next;
      });

      try {
        console.log(
          "[MarketplaceFavorite] Toggle:",
          {
            studioId: studio.id,
            studioName: studio.name,
            wasFavorite,
          },
        );

        if (wasFavorite) {
          const response =
            await removeClientFavoriteStudio(
              undefined,
              studio.id,
            );

          console.log(
            "[MarketplaceFavorite] Remove response:",
            response,
          );
        } else {
          const response =
            await saveClientFavoriteStudio(
              studio.id,
            );

          console.log(
            "[MarketplaceFavorite] Save response:",
            response,
          );
        }

        /*
         * Confirm the persisted favorite from backend.
         * This keeps Marketplace and Home/FavoriteStudios
         * synchronized with the real DB state.
         */
        await loadFavorites();
      } catch (error) {
        console.error(
          "[MarketplaceFavorite] Toggle failed:",
          error,
        );
        // Roll back if the API request fails.
        setFavoriteStudioIds((current) => {
          const next = new Set(current);

          if (wasFavorite) {
            next.add(studio.id);
          } else {
            next.delete(studio.id);
          }

          return next;
        });
      } finally {
        setFavoriteLoadingIds((current) => {
          const next = new Set(current);
          next.delete(studio.id);
          return next;
        });
      }
    },
    [
      favoriteLoadingIds,
      favoriteStudioIds,
      loadFavorites,
    ],
  );

  const loadStudios = useCallback(async () => {
    try {
      setLoadingStudios(true);
      setStudioLoadError(null);

      const response = await getClientMarketplaceStudios(50);

      console.log(
        "[MarketplaceScreen] Raw marketplace response:",
        response,
      );

      let collection: unknown = response;

      /*
       * get-client-marketplace-studios currently returns the RPC
       * JSON array directly. Keep support for wrapped API responses
       * as well so the client remains backward compatible.
       */
      if (!Array.isArray(collection) && collection && typeof collection === "object") {
        const payload = collection as Record<string, unknown>;

        collection =
          payload.data ??
          payload.studios ??
          payload.items ??
          payload.results ??
          [];

        if (
          collection &&
          typeof collection === "object" &&
          !Array.isArray(collection)
        ) {
          const nested = collection as Record<string, unknown>;

          collection =
            nested.data ??
            nested.studios ??
            nested.items ??
            nested.results ??
            [];
        }
      }

      if (!Array.isArray(collection)) {
        collection = [];
      }

      console.log(
        "[MarketplaceScreen] Marketplace studio collection:",
        collection,
      );

      const normalized =
        normalizeMarketplaceStudios(collection);

      console.log(
        "[MarketplaceScreen] Normalized studios:",
        normalized,
      );

      setStudios(normalized);
    } catch (error) {
      console.error(
        "[MarketplaceScreen] Failed to load studios:",
        error,
      );

      setStudios([]);
      setStudioLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load studios.",
      );
    } finally {
      setLoadingStudios(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStudios();
      void loadFavorites();
    }, [loadStudios, loadFavorites]),
  );


  const navigation = useNavigation<Navigation>();
  const route =
    useRoute<RouteProp<MarketplaceStackParamList, "MarketplaceHome">>();
  const { theme } = useAppSettings();

  const filters = route.params?.filters;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeAd, setActiveAd] = useState(0);

  const sponsoredCarouselRef = React.useRef<FlatList>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveAd((current) => {
        const next = (current + 1) % sponsoredAds.length;

        sponsoredCarouselRef.current?.scrollToOffset({
          offset: next * 347,
          animated: true,
        });

        return next;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const visibleStudios = useMemo(() => {
    const query = search.trim().toLowerCase();

    return studios
      .filter((studio) => {
        const categoryMatch =
          selectedCategory === "All" ||
          studio.category === selectedCategory;

        const searchMatch =
          !query ||
          studio.name.toLowerCase().includes(query) ||
          studio.location.toLowerCase().includes(query) ||
          studio.category.toLowerCase().includes(query);

        const locationMatch =
          !filters?.location ||
          studio.location === filters.location;

        const areaMatch =
          !filters?.area ||
          studio.location.toLowerCase().includes(
            filters.area.toLowerCase()
          ) ||
          filters.area === "All areas";

        const serviceMatch =
          !filters?.services?.length ||
          filters.services.includes(studio.category);

        const minimumRating =
          !filters?.rating || filters.rating === "Any"
            ? 0
            : Number(filters.rating.replace("+", ""));

        const ratingMatch = studio.rating >= minimumRating;

        return (
          categoryMatch &&
          searchMatch &&
          locationMatch &&
          areaMatch &&
          serviceMatch &&
          ratingMatch
        );
      })
      .sort((a, b) => {
        const tier = (studio: Studio) => {
          if (studio.sponsored) return 0;
          if (studio.verified && studio.active) return 1;
          return 2;
        };

        return tier(a) - tier(b) || b.completeness - a.completeness;
      });
  }, [studios, search, selectedCategory, filters]);

  const openStudio = (studio: Studio) => {
    navigation.navigate("StudioDetails", {
      studioId: studio.id,
      studioName: studio.name,
    });
  };

  const getStudioInitial = (name: string) => {
  const normalized = name.trim();

  if (!normalized) {
    return "S";
  }

  return normalized.charAt(0).toUpperCase();
};

const renderStudio = ({ item }: { item: Studio }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => openStudio(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.favoriteButtonRow}>
            <View />
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={(event) => {
                event.stopPropagation();
                void toggleFavorite(item);
              }}
              disabled={favoriteLoadingIds.has(item.id)}
              style={[
                styles.favoriteButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name={
                  favoriteStudioIds.has(item.id)
                    ? "heart"
                    : "heart-outline"
                }
                size={19}
                color={
                  favoriteStudioIds.has(item.id)
                    ? "#E5484D"
                    : theme.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[styles.studioName, { color: theme.text }]}
            >
              {item.name}
            </Text>

            {item.verified && (
              <Ionicons
                name="checkmark-circle"
                size={17}
                color="#168A5B"
              />
            )}
          </View>

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={theme.textSecondary}
            />
            <Text
              style={[
                styles.location,
                { color: theme.textSecondary },
              ]}
            >
              {item.location}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.rating}>
              <Ionicons name="star" size={13} color="#E3A51B" />
              <Text style={[styles.metaText, { color: theme.text }]}>
                {item.rating}
              </Text>
              <Text
                style={[
                  styles.reviewText,
                  { color: theme.textMuted },
                ]}
              >
                ({item.reviews})
              </Text>
            </View>

            <Text
              style={[
                styles.categoryText,
                { color: theme.textSecondary },
              ]}
            >
              {item.category}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            {item.sponsored && (
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>SPONSORED</Text>
              </View>
            )}

            {item.verified && item.active && (
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <View style={styles.activeDot} />
                <Text
                  style={[
                    styles.activeText,
                    { color: theme.primary },
                  ]}
                >
                  Verified · Active
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.chatButton,
            {
              borderColor: theme.primary,
              backgroundColor: theme.surface,
            },
          ]}
          onPress={() =>
            navigation.getParent()?.navigate("Conversation", {
              studioId: item.id,
              studioName: item.name,
            })
          }
        >
          <Ionicons
            name="chatbubble-outline"
            size={17}
            color={theme.primary}
          />
          <Text style={[styles.chatButtonText, { color: theme.primary }]}>
            Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.bookButton, { backgroundColor: theme.primary }]}
          onPress={() =>
            navigation.navigate("MarketplaceBooking", {
              studioId: item.id,
              studioName: item.name,
            })
          }
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.logoGroup}
          onPress={() => navigation.navigate("Main")}
        >
          <View
            style={[
              styles.logoMark,
              { backgroundColor: theme.primary },
            ]}
          >
            <Image
              source={require("../../../assets/PhotoOS-brand-master.png")}
              style={styles.logoMarkImage}
              resizeMode="contain"
            />
          </View>

          <Text
            style={[
              styles.logoText,
              { color: theme.primary },
            ]}
          >
            PhotoOS
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerIcon,
              { backgroundColor: theme.surface },
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
              styles.headerIcon,
              { backgroundColor: theme.surface },
            ]}
            onPress={() => navigation.navigate("Language")}
          >
            <Text
              style={[
                styles.languageText,
                { color: theme.text },
              ]}
            >
              EN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerIcon,
              { backgroundColor: theme.surface },
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

      <FlatList
        data={visibleStudios}
        keyExtractor={(item) => item.id}
        renderItem={renderStudio}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.titleBlock}>
              <Text
                style={[
                  styles.title,
                  { color: theme.text },
                ]}
              >
                Marketplace
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Discover photographers & studios near you
              </Text>
            </View>

            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={20}
                color={theme.textMuted}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search studios, locations..."
                placeholderTextColor={theme.textMuted}
                style={[styles.searchInput, { color: theme.text }]}
                returnKeyType="search"
              />
<TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() =>
                  navigation.navigate("MarketplaceFilters")
                }
              >
                <Ionicons
                  name="options-outline"
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.sponsoredSection}>
              <View style={styles.sponsoredHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text },
                  ]}
                >
                  Sponsored
                </Text>

                <View style={styles.adDots}>
                  {sponsoredAds.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.adDot,
                        {
                          width: activeAd === index ? 16 : 5,
                          backgroundColor:
                            activeAd === index
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              <FlatList
                ref={sponsoredCarouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                data={sponsoredAds}
                keyExtractor={(_, index) => String(index)}
                onMomentumScrollEnd={(event) => {
                  const width = event.nativeEvent.layoutMeasurement.width;
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / width
                  );
                  setActiveAd(index);
                }}
                renderItem={({ item }) => (
                  <View style={styles.adCard}>
                    <ImageBackground
                      source={{ uri: item.image }}
                      resizeMode="cover"
                      style={styles.adImage}
                    >
                      <View style={styles.adOverlay} />

                      <View style={styles.adContent}>
                        <View style={styles.adBadge}>
                          <Text style={styles.adBadgeText}>
                            SPONSORED
                          </Text>
                        </View>

                        <View style={styles.adBottom}>
                          <Text style={styles.adTitle}>
                            {item.title}
                          </Text>

                          <Text style={styles.adSubtitle}>
                            {item.subtitle}
                          </Text>
                        </View>
                      </View>
                    </ImageBackground>
                  </View>
                )}
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text },
                ]}
              >
                Categories
              </Text>
            </View>

            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
              renderItem={({ item }) => {
                const active = selectedCategory === item;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedCategory(item)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: active
                          ? theme.primary
                          : theme.surface,
                        borderColor: active
                          ? theme.primary
                          : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: active
                            ? "#FFFFFF"
                            : theme.text,
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text },
                ]}
              >
                {visibleStudios.some((studio) => studio.sponsored)
                  ? "Sponsored Studios"
                  : "Studios"}
              </Text>

              <Text
                style={[
                  styles.resultCount,
                  { color: theme.textMuted },
                ]}
              >
                {visibleStudios.length}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={38}
              color={theme.textMuted}
            />
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.text },
              ]}
            >
              No studios found
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary },
              ]}
            >
              Try another search or category.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  header: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  logoMarkImage: {
    width: 40,
    height: 40,
  },

  logoText: {
    ...typography.title3,
    fontWeight: "700",
    letterSpacing: -0.35,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  languageText: {
    ...typography.caption,
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  titleBlock: {
    marginTop: 10,
    marginBottom: 20,
  },

  title: {
    ...typography.largeTitle,
  },

  subtitle: {
    ...typography.callout,
    marginTop: 5,
  },

  searchRow: {
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    paddingLeft: 15,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    ...typography.callout,
    paddingVertical: 0,
  },

  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  sponsoredSection: {
    marginTop: 22,
  },

  sponsoredHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  adDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  adDot: {
    height: 5,
    borderRadius: 3,
  },

  adCard: {
    width: 335,
    height: 190,
    marginRight: 12,
    borderRadius: 22,
    overflow: "hidden",
  },

  adImage: {
    flex: 1,
  },

  adOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  adContent: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },

  adBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.92)",
  },

  adBadgeText: {
    ...typography.micro,
    color: "#18181B",
    fontWeight: "600",
  },

  adBottom: {
    width: "78%",
  },

  adTitle: {
    color: "#FFFFFF",
    ...typography.title2,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  adSubtitle: {
    color: "rgba(255,255,255,0.9)",
    ...typography.caption,
    marginTop: 6,
  },

  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    ...typography.title3,
  },

  resultCount: {
    ...typography.caption,
  },

  categories: {
    gap: 9,
    paddingRight: 20,
  },

  categoryChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  cover: {
    width: "100%",
    height: 190,
  },

  studioInitialCover: {
    alignItems: "center",
    justifyContent: "center",
  },

  studioInitialText: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1,
  },

  favoriteButtonRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  cardContent: {
    paddingHorizontal: 16,
    paddingTop: 15,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  studioName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },

  location: {
    fontSize: 12.5,
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 12.5,
    fontWeight: "600",
  },

  reviewText: {
    fontSize: 11.5,
  },

  categoryText: {
    fontSize: 12,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    marginBottom: 12,
  },

  sponsoredBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  sponsoredText: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
  },

  activeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  actionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  chatButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },

  chatButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
  },

  bookButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },

  bookButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    ...typography.title3,
    marginTop: 12,
  },

  emptyText: {
    ...typography.callout,
    marginTop: 5,
    textAlign: "center",
  },
});
