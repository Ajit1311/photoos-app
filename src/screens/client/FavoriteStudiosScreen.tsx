import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getClientFavoriteStudios,
  removeClientFavoriteStudio,
  type ClientFavoriteStudio,
} from "../../services/client-app/client-app.service";
import { useAppSettings } from "../../context/AppSettingsContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/navigation-types";

export default function FavoriteStudiosScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { theme } = useAppSettings();

  const [favorites, setFavorites] = useState<ClientFavoriteStudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      setError(null);

      const response = await getClientFavoriteStudios();

      setFavorites(response.data ?? []);
    } catch (err) {
      console.warn("FAVORITES :: load failed", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load favorite studios.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * Refresh every time the Favorite Studios screen
   * becomes active so Marketplace saves are immediately
   * reflected here.
   */
  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadFavorites();
  };

  const handleRemove = async (item: ClientFavoriteStudio) => {
    try {
      setRemovingId(item.favorite_id);

      await removeClientFavoriteStudio(
        item.favorite_id,
        item.studio_id,
      );

      setFavorites((current) =>
        current.filter(
          (favorite) => favorite.favorite_id !== item.favorite_id,
        ),
      );
    } catch (err) {
      console.warn("FAVORITES :: remove failed", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove favorite studio.",
      );
    } finally {
      setRemovingId(null);
    }
  };

  const openStudio = (item: ClientFavoriteStudio) => {
    navigation.navigate("Main", {
      screen: "Marketplace",
      params: {
        screen: "StudioDetails",
        params: {
          studioId: item.studio_id,
          studioName: item.studio.name,
        },
      },
    });
  };

  const renderItem = ({
    item,
  }: {
    item: ClientFavoriteStudio;
  }) => {
    const studio = item.studio;
    const isRemoving = removingId === item.favorite_id;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => openStudio(item)}
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.logo,
            {
              backgroundColor: theme.primary,
            },
          ]}
        >
          <Text style={styles.logoText}>
            {(studio.name?.trim().charAt(0) || "S").toUpperCase()}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text
                numberOfLines={1}
                style={[styles.title, { color: theme.text }]}
              >
                {studio.name}
              </Text>

              {studio.verification_status === "verified" ? (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.primary}
                  style={styles.verified}
                />
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={isRemoving}
              onPress={() => void handleRemove(item)}
              style={styles.heartButton}
            >
              {isRemoving ? (
                <ActivityIndicator
                  size="small"
                  color={theme.primary}
                />
              ) : (
                <Ionicons
                  name="heart"
                  size={22}
                  color={theme.primary}
                />
              )}
            </TouchableOpacity>
          </View>

          {!!(studio.city || studio.state) && (
            <View style={styles.metaRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color={theme.textMuted}
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.metaText,
                  { color: theme.textMuted },
                ]}
              >
                {[studio.city, studio.state]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          )}

          {!!studio.bio && (
            <Text
              numberOfLines={2}
              style={[
                styles.bio,
                { color: theme.textSecondary },
              ]}
            >
              {studio.bio}
            </Text>
          )}

          <View style={styles.openRow}>
            <Text
              style={[
                styles.openText,
                { color: theme.primary },
              ]}
            >
              View Studio
            </Text>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={theme.primary}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />

        <Text
          style={[
            styles.loadingText,
            { color: theme.textMuted },
          ]}
        >
          Loading favorite studios...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.text },
            ]}
          >
            Favorite Studios
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.textMuted },
            ]}
          >
            {favorites.length} saved{" "}
            {favorites.length === 1 ? "studio" : "studios"}
          </Text>
        </View>
      </View>

      {error ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => void loadFavorites()}
          style={[
            styles.errorCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={theme.primary}
          />

          <View style={styles.errorContent}>
            <Text
              style={[
                styles.errorTitle,
                { color: theme.text },
              ]}
            >
              Unable to load favorites
            </Text>

            <Text
              style={[
                styles.errorText,
                { color: theme.textMuted },
              ]}
            >
              Tap to retry
            </Text>
          </View>

          <Ionicons
            name="refresh-outline"
            size={20}
            color={theme.primary}
          />
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.favorite_id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          favorites.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.surface },
              ]}
            >
              <Ionicons
                name="heart-outline"
                size={38}
                color={theme.primary}
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                { color: theme.text },
              ]}
            >
              No favorite studios yet
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: theme.textMuted },
              ]}
            >
              Save studios from Marketplace to find them
              quickly here.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("Main", {
                  screen: "Marketplace",
                })
              }
              style={[
                styles.marketplaceButton,
                { backgroundColor: theme.primary },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text style={styles.marketplaceButtonText}>
                Explore Studios
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  header: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },

  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  card: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },

  content: {
    flex: 1,
    marginLeft: 13,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
  },

  verified: {
    marginLeft: 5,
  },

  heartButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -4,
    marginTop: -4,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  metaText: {
    flex: 1,
    marginLeft: 5,
    fontSize: 12,
  },

  bio: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
  },

  openRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  openText: {
    fontSize: 12,
    fontWeight: "700",
  },

  errorCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },

  errorContent: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
  },

  errorText: {
    marginTop: 2,
    fontSize: 12,
  },

  empty: {
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  marketplaceButton: {
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  marketplaceButtonText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
  },
});
