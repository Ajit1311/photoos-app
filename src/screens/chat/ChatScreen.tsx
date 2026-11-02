import React, { useCallback, useMemo, useState } from "react";
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
import {
  detectEventFromUrlOrDeepLink,
  type ActiveEventContext,
} from "../../services/event-gallery/event-qr-detector";

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
  const [activeEvent, setActiveEvent] = useState<ActiveEventContext | null>(null);

  // Strict Event & Studio Scoping:
  // Shows event admin / event studio chat, while keeping all marketplace studio conversations accessible!
  const displayedChats = useMemo(() => {
    return chats;
  }, [chats]);

  const title =
    language === "मराठी"
      ? "मेसेजेस"
      : language === "हिन्दी"
        ? "संदेश"
        : "Messages";

  const loadActiveEvent = useCallback(async () => {
    try {
      const detected = await detectEventFromUrlOrDeepLink();
      setActiveEvent(detected);
    } catch {
      setActiveEvent(null);
    }
  }, []);

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
      loadActiveEvent();
    }, [loadChats, loadActiveEvent])
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
          data={displayedChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            displayedChats.length === 0 ? styles.emptyList : styles.list
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            activeEvent ? (
              <TouchableOpacity
                activeOpacity={0.88}
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
                style={[
                  styles.activeEventCard,
                  {
                    backgroundColor: activeEvent.type === "corporate" ? "#2563EB14" : "#00a88414",
                    borderColor: activeEvent.type === "corporate" ? "#2563EB40" : "#00a88440",
                  },
                ]}
              >
                <View
                  style={[
                    styles.activeEventIconBox,
                    {
                      backgroundColor: activeEvent.type === "corporate" ? "#2563EB20" : "#00a88420",
                    },
                  ]}
                >
                  <Ionicons
                    name={activeEvent.type === "corporate" ? "people" : "chatbubbles"}
                    size={22}
                    color={activeEvent.type === "corporate" ? "#2563EB" : "#00a884"}
                  />
                </View>

                <View style={styles.activeEventInfo}>
                  <View
                    style={[
                      styles.activeEventPill,
                      {
                        backgroundColor: activeEvent.type === "corporate" ? "#2563EB" : "#00a884",
                      },
                    ]}
                  >
                    <View style={styles.activeEventDot} />
                    <Text style={styles.activeEventPillText}>
                      {activeEvent.type === "corporate"
                        ? (language === "मराठी" ? "🏢 कॉर्पोरेट ॲडमिन (HR)" : "🏢 CORPORATE ADMIN (HR)")
                        : (language === "मराठी" ? "📸 स्कॅन केलेला इव्हेंट" : "📸 ACTIVE EVENT STUDIO")}
                    </Text>
                  </View>

                  <Text numberOfLines={1} style={[styles.activeEventTitle, { color: theme.text }]}>
                    {activeEvent.type === "corporate"
                      ? (activeEvent.studioName || activeEvent.eventName || "Office Admin (HR)")
                      : (activeEvent.studioName || activeEvent.eventName)}
                  </Text>

                  <Text numberOfLines={1} style={[styles.activeEventSub, { color: theme.textSecondary }]}>
                    {activeEvent.type === "corporate"
                      ? (language === "मराठी"
                          ? "💬 कार्यालयीन ॲडमिन / HR शी थेट चॅट करा"
                          : "💬 Chat directly with HR / Office Event Admin")
                      : (language === "मराठी"
                          ? "💬 फोटोग्राफरशी थेट चॅट करा (WhatsApp Chat)"
                          : "💬 Chat directly with photographer (WhatsApp)")}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={activeEvent.type === "corporate" ? "#2563EB" : "#00a884"}
                />
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const isCorporateChat =
              item.title.toLowerCase().includes("admin") ||
              item.title.toLowerCase().includes("corporate") ||
              item.title.toLowerCase().includes("hr") ||
              (activeEvent?.type === "corporate" &&
                (item.id.includes(activeEvent.eventId) || item.title.includes(activeEvent.eventName)));

            return (
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
                    {
                      backgroundColor: isCorporateChat ? "#2563EB18" : `${theme.primary}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      { color: isCorporateChat ? "#2563EB" : theme.primary },
                    ]}
                  >
                    {isCorporateChat ? "🏢" : item.title.trim().charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.chatContent}>
                  <View style={styles.chatTop}>
                    <View style={styles.chatNameBadgeRow}>
                      <Text
                        numberOfLines={1}
                        style={[styles.chatName, { color: theme.text }]}
                      >
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.chatTypeBadge,
                          {
                            backgroundColor: isCorporateChat ? "#2563EB15" : `${theme.primary}12`,
                            borderColor: isCorporateChat ? "#2563EB40" : `${theme.primary}35`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chatTypeBadgeText,
                            { color: isCorporateChat ? "#2563EB" : theme.primary },
                          ]}
                        >
                          {isCorporateChat ? "HR Admin" : "Studio"}
                        </Text>
                      </View>
                    </View>

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
            );
          }}
          ListFooterComponent={
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.marketplaceFooterCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              onPress={() => navigation.navigate("Main", { screen: "Marketplace" })}
            >
              <View style={[styles.marketplaceFooterIconBox, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="compass" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.marketplaceFooterTitle, { color: theme.text }]}>
                  {language === "मराठी" ? "मार्केटप्लेस मधील स्टुडिओ एक्सप्लोर करा" : "Explore Marketplace Studios"}
                </Text>
                <Text style={[styles.marketplaceFooterSub, { color: theme.textSecondary }]}>
                  {language === "मराठी"
                    ? "सर्वोत्तम फोटोग्राफी स्टुडिओशी थेट बोला किंवा बुक करा"
                    : "Find studios, check pricing & chat directly"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          }
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

  activeEventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 14,
    shadowColor: "#00a884",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  activeEventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00a88422",
    alignItems: "center",
    justifyContent: "center",
  },

  activeEventInfo: {
    flex: 1,
    marginHorizontal: 12,
  },

  activeEventPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#00a88420",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },

  activeEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00a884",
    marginRight: 5,
  },

  activeEventPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00a884",
    letterSpacing: 0.5,
  },

  activeEventTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  activeEventSub: {
    fontSize: 12,
    marginTop: 2,
  },

  chatNameBadgeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  chatTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },

  chatTypeBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },

  marketplaceFooterCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    marginBottom: 20,
    gap: 12,
  },

  marketplaceFooterIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  marketplaceFooterTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },

  marketplaceFooterSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
});
