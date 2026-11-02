import React, { useEffect, useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { colors } from "../../theme/colors";
import { useAppSettings } from "../../context/AppSettingsContext";
import { getActiveEventContextSync } from "../../services/event-gallery/event-qr-detector";

interface AppNotification {
  id: string;
  type: "event" | "chat" | "booking" | "ai" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
  actionScreen?: string;
  actionParams?: any;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { theme, language } = useAppSettings();
  const activeEvent = getActiveEventContextSync();

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const isCorp = activeEvent?.type === "corporate";
    const evTitle = activeEvent?.eventName || "राजुज वेडिंग (Raju's Wedding)";
    const studioTitle = isCorp
      ? (activeEvent?.studioName ? `${activeEvent.studioName} (HR Admin)` : "Office Admin (HR)")
      : (activeEvent?.studioName || "Parashuram S. Naik Studio");

    return [
      {
        id: "notif-1",
        type: "ai",
        title:
          language === "मराठी"
            ? "✨ AI फेस मॅचिंग अल्बम तयार आहे"
            : "✨ AI Face Matched Album Ready",
        body:
          language === "मराठी"
            ? `${evTitle} मधील तुमचे वैयक्तिक फोटो AI द्वारे शोधले गेले आहेत.`
            : `Your personalized photos from ${evTitle} have been matched.`,
        time: "Just now",
        read: false,
        actionScreen: "FaceMatchResults",
      },
      {
        id: "notif-2",
        type: "chat",
        title:
          language === "मराठी"
            ? `💬 ${studioTitle} कडून संदेश`
            : `💬 New Message from ${studioTitle}`,
        body:
          language === "मराठी"
            ? "तुमच्या फोटो संदर्भातील नोट/चॅट अपडेट प्राप्त झाले आहे."
            : "You have a new response regarding your event photo note.",
        time: "10m ago",
        read: false,
        actionScreen: "Conversation",
        actionParams: {
          studioId: activeEvent?.studioId || activeEvent?.eventId || "studio-1",
          studioName: studioTitle,
          title: studioTitle,
          isCorporate: isCorp,
        },
      },
      {
        id: "notif-3",
        type: "event",
        title:
          language === "मराठी"
            ? `📸 ${evTitle} - नवीन फोटो लाइव्ह`
            : `📸 ${evTitle} - Photos Live`,
        body:
          language === "मराठी"
            ? "इव्हेंट गॅलरीमध्ये नवीन हाय-डेफिनिशन फोटो अपलोड करण्यात आले आहेत."
            : "High-definition event photos have been uploaded to the live gallery.",
        time: "1h ago",
        read: true,
        actionScreen: "FaceMatchResults",
      },
      {
        id: "notif-4",
        type: "booking",
        title:
          language === "मराठी"
            ? "🎉 बुकिंग कन्फर्मेशन"
            : "🎉 Booking Confirmed",
        body:
          language === "मराठी"
            ? "तुमचे फोटोग्राफी पॅकेज सुरक्षित करण्यात आले आहे."
            : "Your photography package booking is confirmed.",
        time: "Yesterday",
        read: true,
        actionScreen: "Bookings",
      },
    ];
  });

  // Enable web push / browser notifications on mount
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            try {
              new Notification("PhotoOS Notifications Active", {
                body: "तुम्हाला नवीन फोटो आणि संदेशांचे थेट नोटिफिकेशन्स मिळतील.",
                icon: "/favicon.ico",
              });
            } catch {}
          }
        });
      }
    }
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationPress = (notif: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.actionScreen) {
      navigation.navigate(notif.actionScreen, notif.actionParams || {});
    }
  };

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "ai":
        return { name: "sparkles" as const, color: "#8B5CF6", bg: "#8B5CF618" };
      case "chat":
        return { name: "chatbubble-ellipses" as const, color: "#00a884", bg: "#00a88418" };
      case "event":
        return { name: "images" as const, color: colors.primary, bg: `${colors.primary}18` };
      case "booking":
        return { name: "calendar" as const, color: "#3B82F6", bg: "#3B82F618" };
      default:
        return { name: "notifications" as const, color: colors.primary, bg: `${colors.primary}18` };
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {language === "मराठी" ? "सूचना (Notifications)" : "Notifications"}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.markReadBtn, { backgroundColor: `${theme.primary}15` }]}
            onPress={markAllRead}
          >
            <Ionicons name="checkmark-done" size={16} color={theme.primary} />
            <Text style={[styles.markReadText, { color: theme.primary }]}>
              {language === "मराठी" ? "सर्व वाचा" : "Mark read"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* NOTIFICATION FEED */}
        <View style={styles.listContainer}>
          {notifications.map((notif) => {
            const icon = getIcon(notif.type);
            return (
              <TouchableOpacity
                key={notif.id}
                activeOpacity={0.85}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: notif.read ? theme.surface : `${theme.primary}08`,
                    borderColor: notif.read ? theme.border : `${theme.primary}35`,
                  },
                ]}
                onPress={() => handleNotificationPress(notif)}
              >
                <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>

                <View style={styles.textWrap}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.notifTitle, { color: theme.text }]} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                      {notif.time}
                    </Text>
                  </View>

                  <Text style={[styles.notifBody, { color: theme.textSecondary }]} numberOfLines={2}>
                    {notif.body}
                  </Text>
                </View>

                {!notif.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    gap: 12,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  notifBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
});
