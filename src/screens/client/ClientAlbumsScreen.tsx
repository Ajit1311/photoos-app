import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/navigation-types";
import { colors } from "../../theme/colors";
import {
  getClientAlbums,
  type ClientAlbum,
} from "../../services/client-app/client-app.service";

export default function ClientAlbumsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [albums, setAlbums] = useState<ClientAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await getClientAlbums();
      setAlbums(response.albums ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load albums.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Albums</Text>
          <Text style={styles.subtitle}>Your photography albums</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Unable to load albums</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
        >
          {albums.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="images-outline"
                size={50}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No albums yet</Text>
              <Text style={styles.emptyText}>
                Albums shared by your studio will appear here.
              </Text>
            </View>
          ) : (
            albums.map((album) => (
              <View key={album.id} style={styles.card}>
                <View style={styles.albumIcon}>
                  <Ionicons
                    name="images-outline"
                    size={25}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.details}>
                  <Text style={styles.albumTitle} numberOfLines={2}>
                    {album.title || album.code || "Photo Album"}
                  </Text>

                  {!!album.description && (
                    <Text style={styles.description} numberOfLines={2}>
                      {album.description}
                    </Text>
                  )}

                  <View style={styles.meta}>
                    <Text style={styles.metaText}>
                      {album.album_type || "Album"}
                    </Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.metaText}>
                      {album.status || "Available"}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  content: {
    padding: 20,
    paddingTop: 4,
    gap: 12,
    flexGrow: 1,
  },
  card: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  albumIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },
  details: {
    flex: 1,
    marginHorizontal: 13,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  dot: {
    marginHorizontal: 6,
    color: colors.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retry: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
  },
});
