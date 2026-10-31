import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../../navigation/navigation-types";
import { useAppSettings } from "../../context/AppSettingsContext";
import { getClientMarketplaceChats } from "../../services/client-app/client-app.service";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ChatItem = {
  id: string;
  conversationId: string;
  title: string;
  lastMessage: string;
  updatedAt?: string;
  unreadCount?: number;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function extractArray(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const data = root.data;

  if (Array.isArray(data)) return data;

  const dataRecord = asRecord(data);

  if (Array.isArray(dataRecord.conversations)) {
    return dataRecord.conversations;
  }

  if (Array.isArray(root.conversations)) {
    return root.conversations;
  }

  return [];
}

function normalizeChat(value: unknown): ChatItem | null {
  const item = asRecord(value);

  const conversationId = String(
    item.conversation_id ?? item.id ?? item.chat_id ?? ""
  ).trim();

  if (!conversationId) return null;

  const title = String(
    item.studio_name ?? item.name ?? item.title ?? "Photography Studio"
  ).trim();

  const lastMessage = String(
    item.last_message ??
      item.lastMessage ??
      item.preview ??
      item.last_content ??
      "No messages yet"
  ).trim();

  return {
    id: conversationId,
    conversationId,
    title,
    lastMessage: lastMessage || "No messages yet",
    updatedAt:
      item.updated_at ??
      item.last_message_at ??
      item.created_at ??
      undefined,
    unreadCount: Number(item.unread_count ?? 0) || 0,
  };
}

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, language } = useAppSettings();

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const title =
    language === "मराठी"
      ? "मेसेजेस"
      : language === "हिन्दी"
        ? "संदेश"
        : "Messages";

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getClientMarketplaceChats();
      const items = extractArray(response)
        .map(normalizeChat)
        .filter(Boolean) as ChatItem[];

      setChats(items);
    } catch (error) {
      console.error("[ClientChat] Failed to load chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  const openConversation = (chat: ChatItem) => {
    navigation.navigate("Conversation", {
      conversationId: chat.conversationId,
      title: chat.title,
    });
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Main")}
          style={styles.logoGroup}
        >
          <View style={styles.logoBox}>
            <Image
              source={require("../../../assets/PhotoOS-brand-master.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandText, { color: theme.text }]}>
            PhotoOS
          </Text>
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
              name="contrast-outline"
              size={18}
              color={theme.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerIcon,
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
        </View>
      </View>

      {/* APPLE LARGE TITLE */}
      <View style={styles.chatHeader}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Direct chat with studios & photographers
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            chats.length === 0 ? styles.emptyList : styles.list
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => openConversation(item)}
              style={[
                styles.chatRow,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: `${theme.primary}18` },
                ]}
              >
                <Text style={[styles.avatarText, { color: theme.primary }]}>
                  {item.title.trim().charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.chatContent}>
                <View style={styles.chatTop}>
                  <Text
                    numberOfLines={1}
                    style={[styles.chatName, { color: theme.text }]}
                  >
                    {item.title}
                  </Text>

                  {item.updatedAt ? (
                    <Text
                      style={[styles.time, { color: theme.textMuted }]}
                    >
                      {new Date(item.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.previewRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.preview,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item.lastMessage}
                  </Text>

                  {item.unreadCount && item.unreadCount > 0 ? (
                    <View
                      style={[
                        styles.unread,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <Text style={styles.unreadText}>
                        {item.unreadCount}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color={theme.textMuted}
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: `${theme.primary}14` },
                ]}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color={theme.primary}
                />
              </View>

              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No conversations yet
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: theme.textSecondary },
                ]}
              >
                Find a photography studio in Explore to ask questions and discuss session packages.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.exploreButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => navigation.navigate("Main", { screen: "Marketplace" })}
              >
                <Text style={styles.exploreButtonText}>Explore Studios</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoGroup: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F589B",
  },

  logoImage: {
    width: 30,
    height: 30,
  },

  brandText: {
    marginLeft: 9,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  chatHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.6,
  },

  subtitle: {
    fontSize: 12.5,
    marginTop: 3,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  chatRow: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },

  chatContent: {
    flex: 1,
    marginLeft: 13,
  },

  chatTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  chatName: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  time: {
    fontSize: 11,
    marginLeft: 8,
  },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },

  preview: {
    flex: 1,
    fontSize: 13,
    marginRight: 6,
  },

  unread: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyList: {
    flexGrow: 1,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 20,
  },

  exploreButton: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  exploreButtonText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
