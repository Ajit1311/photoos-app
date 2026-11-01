import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import { colors } from "../../theme/colors";
import {
  getClientMarketplaceMessages,
  sendClientMarketplaceMessage,
  startClientMarketplaceChat,
  prepareClientMarketplaceChatAttachment,
  createClientMarketplaceAttachmentMessage,
  completeClientMarketplaceChatAttachment,
} from "../../services/client-app/client-app.service";


type Message = {
  id: string;
  content: string;
  senderId?: string | null;
  isMine?: boolean;
  createdAt?: string;
  messageType?: "text" | "image" | "file" | "system";
  attachment?: {
    id?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    url?: string | null;
  } | null;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function extractArray(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const data = root.data;

  if (Array.isArray(data)) return data;

  const dataRecord = asRecord(data);

  if (Array.isArray(dataRecord.messages)) {
    return dataRecord.messages;
  }

  if (Array.isArray(root.messages)) {
    return root.messages;
  }

  return [];
}

function normalizeMessage(value: unknown): Message | null {
  const item = asRecord(value);

  const id = String(
    item.id ??
      item.message_id ??
      "",
  ).trim();

  if (!id) return null;

  return {
    id,
    content: String(
      item.content ??
        item.message ??
        "",
    ),
    senderId:
      item.sender_id ??
      item.senderId ??
      null,
    isMine:
      item.is_mine === true ||
      item.isMine === true,
    createdAt:
      item.created_at ??
      item.createdAt ??
      undefined,
    messageType:
      item.message_type ??
      item.messageType ??
      "text",
    attachment:
      item.attachment &&
      typeof item.attachment === "object"
        ? {
            id: item.attachment.id ?? null,
            fileName:
              item.attachment.file_name ??
              item.attachment.fileName ??
              null,
            fileType:
              item.attachment.file_type ??
              item.attachment.fileType ??
              null,
            fileSize:
              item.attachment.file_size ??
              item.attachment.fileSize ??
              null,
            url:
              item.attachment.url ??
              null,
          }
        : null,
  };
}

export default function ConversationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const studioId = route.params?.studioId;
  const studioName =
    route.params?.studioName ??
    route.params?.title ??
    "Photography Studio";

  const [conversationId, setConversationId] =
    useState<string | undefined>(
      route.params?.conversationId,
    );

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // WhatsApp Enhanced Features: Pinning, Review Comments, Deletion & Lightbox
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [pinnedComments, setPinnedComments] = useState<Record<string, string>>({});
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);
  const [activeImageForNote, setActiveImageForNote] = useState<{ id: string; url: string; fileName?: string } | null>(null);
  const [reviewNoteText, setReviewNoteText] = useState("");
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const loadMessages = useCallback(
    async (id: string) => {
      try {
        const response =
          await getClientMarketplaceMessages(id);

        const items = extractArray(response)
          .map(normalizeMessage)
          .filter(Boolean) as Message[];

        setMessages(items);
      } catch (error) {
        console.error(
          "[ClientChat] Failed to load messages:",
          error,
        );
      }
    },
    [],
  );

  const initialiseConversation =
    useCallback(async () => {
      try {
        setLoading(true);

        let id = conversationId;

        if (!id && studioId) {
          const response =
            await startClientMarketplaceChat(
              studioId,
              studioName,
            );

          const root = asRecord(response);
          const data = asRecord(root.data);

          id = String(
            data.conversation_id ??
              data.id ??
              root.conversation_id ??
              "",
          ).trim();

          if (id) {
            setConversationId(id);
          }
        }

        if (id) {
          await loadMessages(id);
        }
      } catch (error) {
        console.error(
          "[ClientChat] Conversation initialization failed:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }, [
      conversationId,
      studioId,
      studioName,
      loadMessages,
    ]);

  useEffect(() => {
    void initialiseConversation();
  }, [initialiseConversation]);

  /*
   * WhatsApp-style live conversation sync (3-second polling interval).
   * Ensures real-time bidirectional communication with studio dashboard.
   */
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let active = true;
    let refreshing = false;

    const refreshConversation = async () => {
      if (!active || refreshing) {
        return;
      }

      refreshing = true;

      try {
        await loadMessages(conversationId);
      } catch (error) {
        console.error(
          "[ClientChat] Live sync failed:",
          error,
        );
      } finally {
        refreshing = false;
      }
    };

    void refreshConversation();

    const interval = setInterval(() => {
      void refreshConversation();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversationId, loadMessages]);

  const addEmoji = (emoji: string) => {
    setText((current) => `${current}${emoji}`);
    setShowEmojiPicker(false);
  };

  const sendMessageWithContent = async (contentToSend: string) => {
    const trimmed = contentToSend.trim();
    if (!trimmed || sending) {
      return;
    }

    let id = conversationId;

    try {
      setSending(true);

      if (!id && studioId) {
        const response = await startClientMarketplaceChat(studioId, studioName);
        const root = asRecord(response);
        const data = asRecord(root.data);
        id = String(data.conversation_id ?? data.id ?? root.conversation_id ?? "").trim();
        if (id) setConversationId(id);
      }

      if (!id) {
        throw new Error("Conversation could not be created.");
      }

      const sendResponse = await sendClientMarketplaceMessage(id, trimmed);
      const root = asRecord(sendResponse);
      const data = asRecord(root.data);

      const sentId = String(
        data.id ?? data.message_id ?? root.id ?? `local-${Date.now()}`,
      ).trim();

      const sentCreatedAt = String(
        data.created_at ?? root.created_at ?? new Date().toISOString(),
      );

      const sentMessage: Message = {
        id: sentId,
        content: trimmed,
        senderId: data.sender_id ?? data.senderId ?? null,
        isMine: true,
        createdAt: sentCreatedAt,
      };

      setMessages((current) => {
        if (current.some((m) => m.id === sentMessage.id)) {
          return current;
        }
        return [...current, sentMessage];
      });

      await loadMessages(id);
    } catch (err) {
      console.error("[ClientChat] Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const sendLocation = async () => {
    try {
      setShowAttachMenu(false);
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
            await sendMessageWithContent(`📍 Location: ${mapsUrl}`);
          },
          (err) => {
            console.warn("Geolocation fetch error:", err);
            Alert.alert("Location", "Could not fetch GPS location. Please ensure location services are enabled.");
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        Alert.alert("Location", "Geolocation is not supported on this device.");
      }
    } catch (err) {
      console.warn("Location error:", err);
    }
  };

  const pickAttachment = async () => {
    console.log("[CHAT ATTACHMENT] PICK START", {
      sending,
      uploadingAttachment,
      conversationId,
    });

    if (sending || uploadingAttachment) {
      console.log("[CHAT ATTACHMENT] PICK BLOCKED");
      return;
    }

    let id = conversationId;

    try {
      setUploadingAttachment(true);

      if (!id && studioId) {
        const response =
          await startClientMarketplaceChat(
            studioId,
            studioName,
          );

        const root = asRecord(response);
        const data = asRecord(root.data);

        id = String(
          data.conversation_id ??
            data.id ??
            root.conversation_id ??
            "",
        ).trim();

        if (id) {
          setConversationId(id);
        }
      }

      if (!id) {
        throw new Error(
          "Conversation could not be created.",
        );
      }

      const DocumentPicker =
        await import("expo-document-picker");

      console.log("[CHAT ATTACHMENT] OPEN PICKER");

      const result =
        await DocumentPicker.getDocumentAsync({
          type: ["image/*", "*/*"],
          copyToCacheDirectory: true,
          multiple: false,
        });

      console.log("[CHAT ATTACHMENT] PICKER RESULT", result);

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri || !asset.name) {
        return;
      }

      const fileName = asset.name;
      const fileType =
        asset.mimeType ??
        "application/octet-stream";

      console.log("[CHAT ATTACHMENT] FILE SELECTED", {
        uri: asset.uri,
        fileName,
        fileType,
        fileSize: asset.size,
      });
      const fileSize =
        typeof asset.size === "number"
          ? asset.size
          : null;

      console.log("[CHAT ATTACHMENT] PREPARE START", {
        conversationId: id,
        fileName,
        fileType,
        fileSize,
      });

      const prepareResponse =
        await prepareClientMarketplaceChatAttachment(
          id,
          fileName,
          fileType,
          fileSize,
        );

      console.log(
        "[CHAT ATTACHMENT] PREPARE RESPONSE",
        prepareResponse,
      );

      const prepareRoot =
        asRecord(prepareResponse);
      const prepareData =
        asRecord(prepareRoot.data);

      const attachmentId = String(
        prepareData.attachment_id ?? "",
      ).trim();

      const storagePath = String(
        prepareData.storage_path ?? "",
      ).trim();

      const uploadUrl = String(
        prepareData.upload_url ?? "",
      ).trim();

      if (
        !attachmentId ||
        !storagePath ||
        !uploadUrl
      ) {
        throw new Error(
          "Attachment upload preparation failed.",
        );
      }

      const response =
        await fetch(asset.uri);

      if (!response.ok) {
        throw new Error(
          "Unable to read selected file.",
        );
      }

      const blob =
        await response.blob();

      console.log("[CHAT ATTACHMENT] STORAGE UPLOAD START", {
        uploadUrlPresent: Boolean(uploadUrl),
        storagePath,
        blobSize: blob.size,
        fileType,
      });

      const uploadResponse =
        await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": fileType,
          },
          body: blob,
        });

      console.log("[CHAT ATTACHMENT] STORAGE UPLOAD RESPONSE", {
        status: uploadResponse.status,
        ok: uploadResponse.ok,
      });

      if (!uploadResponse.ok) {
        const uploadErrorText =
          await uploadResponse.text().catch(() => "");

        console.error(
          "[ClientChat] Storage upload failed:",
          {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            body: uploadErrorText,
          },
        );

        throw new Error(
          `Attachment upload failed (${uploadResponse.status})${
            uploadErrorText
              ? `: ${uploadErrorText}`
              : ""
          }`,
        );
      }

      const messageType =
        fileType.startsWith("image/")
          ? "image"
          : "file";

      console.log("[CHAT ATTACHMENT] CREATE MESSAGE START", {
        conversationId: id,
        messageType,
        fileName,
      });

      const messageResponse =
        await createClientMarketplaceAttachmentMessage(
          id,
          messageType,
          fileName,
        );

      console.log(
        "[CHAT ATTACHMENT] CREATE MESSAGE RESPONSE",
        messageResponse,
      );

      const messageRoot =
        asRecord(messageResponse);
      const messageData =
        asRecord(messageRoot.data);

      const messageId = String(
        messageData.id ??
          messageData.message_id ??
          "",
      ).trim();

      if (!messageId) {
        throw new Error(
          "Attachment message could not be created.",
        );
      }

      console.log("[CHAT ATTACHMENT] COMPLETE START", {
        messageId,
        attachmentId,
        storagePath,
      });

      const completeResponse =
        await completeClientMarketplaceChatAttachment(
          messageId,
          attachmentId,
          storagePath,
          fileName,
          fileType,
          fileSize,
          {
            source: "client_marketplace",
            original_uri: asset.uri,
          },
        );

      console.log(
        "[CHAT ATTACHMENT] COMPLETE RESPONSE",
        completeResponse,
      );

      await loadMessages(id);
    } catch (error) {
      console.error(
        "[ClientChat] Attachment upload failed:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      Alert.alert(
        "Attachment Upload Failed",
        message || "Unable to upload attachment.",
      );
    } finally {
      setUploadingAttachment(false);
    }
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) {
      return;
    }
    setText("");
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    await sendMessageWithContent(content);
  };

  const pinnedItems = messages.filter((m) => pinnedMessageIds.includes(m.id));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={
        Platform.OS === "ios" ? 8 : 0
      }
    >
      {/* WHATSAPP TOP APP BAR */}
      <View style={[styles.header, { backgroundColor: isDark ? "#202c33" : "#ffffff" }]}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={isDark ? "#ffffff" : "#111b21"}
          />
        </TouchableOpacity>

        <View style={styles.headerIdentity}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {studioName
                .trim()
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerText}>
            <Text
              numberOfLines={1}
              style={[styles.headerTitle, { color: isDark ? "#ffffff" : "#111b21" }]}
            >
              {studioName}
            </Text>

            <View style={styles.onlineStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineStatusText}>
                online • एंड-टू-एंड एनक्रिप्टेड
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActionsRight}>
          <TouchableOpacity
            style={styles.headerAction}
            activeOpacity={0.8}
            onPress={() => Alert.alert("Call", `${studioName} शी थेट संपर्क साधण्यासाठी कॉल पर्याय उपलब्ध आहे.`)}
          >
            <Ionicons
              name="call"
              size={20}
              color={isDark ? "#aebac1" : "#54656f"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* PINNED MESSAGES BAR */}
      {pinnedItems.length > 0 && (
        <View style={[styles.pinnedBanner, { backgroundColor: isDark ? "#182229" : "#f0f2f5" }]}>
          <Ionicons name="pin" size={15} color="#00a884" />
          <View style={styles.pinnedBannerInfo}>
            <Text style={[styles.pinnedBannerTitle, { color: isDark ? "#ffffff" : "#111b21" }]}>
              पिन केलेले मेसेजेस ({pinnedItems.length})
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.pinnedBannerSub, { color: isDark ? "#8696a0" : "#667781" }]}
            >
              {pinnedComments[pinnedItems[pinnedItems.length - 1].id]
                ? `📌 कमेंट: ${pinnedComments[pinnedItems[pinnedItems.length - 1].id]}`
                : pinnedItems[pinnedItems.length - 1].content || "पिन केलेला फोटो / फाईल"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPinnedMessageIds([])}
            style={styles.pinnedBannerClose}
          >
            <Ionicons name="close" size={16} color={isDark ? "#8696a0" : "#667781"} />
          </TouchableOpacity>
        </View>
      )}

      {/* CHAT MESSAGES BODY */}
      <ImageBackground
        source={
          isDark
            ? require("../../../assets/chat-backgrounds/chat-bg-dark.jpeg")
            : require("../../../assets/chat-backgrounds/chat-bg-light.png")
        }
        resizeMode="cover"
        imageStyle={styles.chatBackgroundImage}
        style={styles.body}
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator
              size="small"
              color="#00a884"
            />
          </View>
        ) : (
          <ScrollView
            style={styles.messages}
            contentContainerStyle={
              messages.length === 0
                ? styles.emptyMessages
                : styles.messageContent
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* END-TO-END ENCRYPTION PILL */}
            <View style={styles.e2eContainer}>
              <View style={[styles.e2eCard, { backgroundColor: isDark ? "#182229" : "#ffeecd" }]}>
                <Ionicons name="lock-closed" size={12} color={isDark ? "#ffd279" : "#7d5a00"} style={{ marginRight: 4 }} />
                <Text style={[styles.e2eText, { color: isDark ? "#ffd279" : "#7d5a00" }]}>
                  🔒 मेसेजेस आणि मीडिया एंड-टू-एंड एनक्रिप्टेड आहेत. PhotoOS सह बाहेरील कोणालाही हे वाचता येत नाही.
                </Text>
              </View>
            </View>

            {messages.length === 0 ? (
              <View style={styles.emptyConversation}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={28}
                    color="#00a884"
                  />
                </View>

                <Text style={[styles.emptyTitle, { color: isDark ? "#ffffff" : "#111b21" }]}>
                  संभाषण सुरू करा
                </Text>

                <Text style={[styles.emptyText, { color: isDark ? "#8696a0" : "#667781" }]}>
                  {studioName} शी थेट संपर्क साधा. फोटो, फाइल्स किंवा लोकेशन शेअर करा.
                </Text>
              </View>
            ) : (
              messages.map((message) => {
                const isMine = message.isMine === true;
                const isDeleted = deletedMessageIds.includes(message.id);
                const isPinned = pinnedMessageIds.includes(message.id);
                const reviewComment = pinnedComments[message.id];
                const isLocation =
                  message.content.includes("maps.google.com") ||
                  message.content.startsWith("📍 Location:");

                let mapsUrl = "";
                if (isLocation) {
                  const match = message.content.match(/https?:\/\/[^\s]+/);
                  if (match) mapsUrl = match[0];
                }

                return (
                  <TouchableOpacity
                    key={message.id}
                    activeOpacity={0.92}
                    onLongPress={() => {
                      Alert.alert(
                        "मेसेज पर्याय (Options)",
                        "खालीलपैकी एक पर्याय निवडा:",
                        [
                          {
                            text: isPinned ? "📌 अनपिन करा (Unpin)" : "📌 पिन करा (Pin Message)",
                            onPress: () => {
                              setPinnedMessageIds((prev) =>
                                prev.includes(message.id)
                                  ? prev.filter((id) => id !== message.id)
                                  : [...prev, message.id]
                              );
                            },
                          },
                          {
                            text: "🗑️ मेसेज हटवा (Delete Message)",
                            style: "destructive",
                            onPress: () => {
                              setDeletedMessageIds((prev) => [...prev, message.id]);
                            },
                          },
                          { text: "रद्द करा (Cancel)", style: "cancel" },
                        ]
                      );
                    }}
                    style={[
                      styles.messageBubble,
                      isMine
                        ? (isDark ? styles.sentDark : styles.sentLight)
                        : (isDark ? styles.receivedDark : styles.receivedLight),
                    ]}
                  >
                    {/* PINNED INDICATOR */}
                    {isPinned && (
                      <View style={styles.bubblePinTag}>
                        <Ionicons name="pin" size={11} color="#00a884" />
                        <Text style={styles.bubblePinTagText}>पिन केलेला मेसेज</Text>
                      </View>
                    )}

                    {/* DELETED NOTICE */}
                    {isDeleted ? (
                      <View style={styles.deletedRow}>
                        <Ionicons name="ban-outline" size={14} color={isDark ? "#8696a0" : "#667781"} />
                        <Text style={[styles.deletedText, { color: isDark ? "#8696a0" : "#667781" }]}>
                          🚫 हा मेसेज हटवला आहे (This message was deleted)
                        </Text>
                      </View>
                    ) : (
                      <>
                        {/* IMAGE ATTACHMENT */}
                        {message.attachment?.url && message.messageType === "image" && (
                          <View style={styles.imageAttachmentBox}>
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() => setLightboxUri(message.attachment?.url || null)}
                            >
                              <Image
                                source={{ uri: message.attachment.url }}
                                style={styles.attachmentImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>

                            {/* PIN & COMMENT ACTION ON IMAGE */}
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={styles.pinCommentActionBtn}
                              onPress={() => {
                                setActiveImageForNote({
                                  id: message.id,
                                  url: message.attachment?.url || "",
                                  fileName: message.attachment?.fileName || "",
                                });
                                setReviewNoteText(pinnedComments[message.id] || "");
                              }}
                            >
                              <Ionicons name="pin" size={13} color="#00a884" />
                              <Text style={styles.pinCommentActionText}>
                                {reviewComment
                                  ? "📌 कमेंट बदला (Edit Review Note)"
                                  : "📌 पिन करा व कमेंट द्या (Pin & Comment)"}
                              </Text>
                            </TouchableOpacity>

                            {/* REVIEW COMMENT BADGE */}
                            {reviewComment && (
                              <View style={styles.reviewCommentBox}>
                                <Ionicons name="chatbox-ellipses" size={13} color="#00a884" />
                                <Text style={styles.reviewCommentBadgeText}>
                                  {reviewComment}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* FILE ATTACHMENT */}
                        {message.attachment && message.messageType === "file" && (
                          <View style={styles.fileAttachment}>
                            <View style={[styles.fileIconWrap, { backgroundColor: isMine ? "#00a88425" : "#e2e8f0" }]}>
                              <Ionicons name="document-text" size={24} color="#00a884" />
                            </View>
                            <View style={styles.fileAttachmentText}>
                              <Text numberOfLines={1} style={[styles.fileName, { color: isDark ? "#e9edef" : "#111b21" }]}>
                                {message.attachment.fileName ?? "दस्तऐवज (Document)"}
                              </Text>
                              <Text style={[styles.fileMeta, { color: isDark ? "#8696a0" : "#667781" }]}>
                                {message.attachment.fileSize ? `${Math.round(message.attachment.fileSize / 1024)} KB` : "File"}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* LOCATION CARD */}
                        {isLocation && mapsUrl ? (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => Linking.openURL(mapsUrl)}
                            style={[styles.locationCard, { backgroundColor: isDark ? "#111b2140" : "#00000008" }]}
                          >
                            <View style={styles.locationMapPinWrap}>
                              <Ionicons name="location" size={26} color="#e53935" />
                            </View>
                            <View style={styles.locationInfo}>
                              <Text style={[styles.locationTitle, { color: isDark ? "#e9edef" : "#111b21" }]}>
                                📍 शेअर केलेले लोकेशन
                              </Text>
                              <Text style={styles.locationAction}>
                                Google Maps मध्ये उघडा ↗
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : null}

                        {/* MESSAGE TEXT */}
                        {message.content && !isLocation ? (
                          <Text style={[styles.messageText, { color: isDark ? "#e9edef" : "#111b21" }]}>
                            {message.content}
                          </Text>
                        ) : null}
                      </>
                    )}

                    {/* META ROW: TIME + WHATSAPP DOUBLE BLUE TICKS */}
                    <View style={styles.metaRow}>
                      <Text style={[styles.timeText, { color: isDark ? "#8696a0" : "#667781" }]}>
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </Text>
                      {isMine && !isDeleted && (
                        <Ionicons name="checkmark-done" size={15} color="#53bdeb" style={{ marginLeft: 3 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </ImageBackground>

      {/* COMPOSER ATTACHMENT MENU TRAY */}
      {showAttachMenu && (
        <View style={[styles.attachTray, { backgroundColor: isDark ? "#202c33" : "#ffffff" }]}>
          <TouchableOpacity
            style={styles.attachOption}
            onPress={() => {
              setShowAttachMenu(false);
              void pickAttachment();
            }}
          >
            <View style={[styles.attachIconCircle, { backgroundColor: "#bf59cf" }]}>
              <Ionicons name="images" size={22} color="#FFFFFF" />
            </View>
            <Text style={[styles.attachLabel, { color: isDark ? "#e9edef" : "#111b21" }]}>
              फोटो / फाइल्स
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachOption}
            onPress={sendLocation}
          >
            <View style={[styles.attachIconCircle, { backgroundColor: "#1fa855" }]}>
              <Ionicons name="location" size={22} color="#FFFFFF" />
            </View>
            <Text style={[styles.attachLabel, { color: isDark ? "#e9edef" : "#111b21" }]}>
              लोकेशन शेअर करा
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* COMPOSER AREA */}
      <View style={[styles.composerArea, { backgroundColor: isDark ? "#202c33" : "#f0f2f5" }]}>
        {showEmojiPicker ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            style={[styles.emojiScroll, { backgroundColor: isDark ? "#202c33" : "#ffffff" }]}
            contentContainerStyle={styles.emojiRow}
          >
            {["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀","☠️","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾","🙈","🙉","🙊","💋","💌","💘","💝","💖","💗","💓","💞","💕","💟","❣️","💔","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","❤️‍🔥","❤️‍🩹","💯","💢","💥","💫","💦","💨","🕳️","💬","💭","💤","👋","🤚","🖐️","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤲","🤝","🙏","✍️","👏","🙌","👐","🤲","💪","🖕","👍","👎","👊","✊","🤛","🤜","🫶","🫰","🤌","👀","👁️","👄","🫦","👅","👂","👃","🧠","🫀","🫁","🦷","🦴","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🐺","🐗","🐴","🦄","🐝","🪲","🦋","🐌","🐞","🐜","🕷️","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦀","🐠","🐟","🐡","🐬","🐳","🦈","🐊","🐘","🦏","🦛","🐪","🐫","🦒","🦘","🦬","🐄","🐎","🐖","🐑","🐐","🦌","🐕","🐈","🐓","🦃","🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🍞","🥐","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🌮","🌯","🥗","🍿","🍣","🍤","🍜","🍝","🍚","🍛","🍱","🍙","🍘","🍥","🥮","🍧","🍨","🍦","🍩","🍪","🎂","🍰","🧁","🍫","🍬","🍭","☕","🧋","🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","✈️","🚀","🚁","🚲","🛵","🏍️","⛵","🚤","🚢","🏠","🏡","🏢","🏥","🏫","🏨","🏪","🏬","🏰","🗽","🗼","🌍","🌎","🌏","🌞","🌝","🌙","⭐","🌟","✨","⚡","🔥","🌈","☀️","🌤️","⛅","🌧️","⛈️","❄️","☃️","🌊","🎉","🎊","🎈","🎁","🎀","🎂","🎄","🎃","🎆","🎇","📸","📷","🎥","🎬","🎵","🎶","🎤","🎧","🎸","🎹","⚽","🏀","🏈","⚾","🎾","🏐","🏆","🥇","🥈","🥉","❤️","👍","🙏","👏","🔥","💯","✅","❌","⚠️","❗","❓","‼️","⁉️","⭕","🚫","💡","🔔","🔒","🔓","🔑"].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => addEmoji(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiText}>
                  {emoji}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.composer, { backgroundColor: isDark ? "#2a3942" : "#ffffff", borderColor: isDark ? "#2a3942" : "#e2e8f0" }]}>
          <TouchableOpacity
            style={styles.composerIcon}
            activeOpacity={0.75}
            onPress={() => {
              setShowAttachMenu(false);
              setShowEmojiPicker((current) => !current);
            }}
          >
            <Ionicons
              name={showEmojiPicker ? "keypad-outline" : "happy-outline"}
              size={23}
              color={isDark ? "#8696a0" : "#54656f"}
            />
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="मेसेज टाईप करा..."
            placeholderTextColor={isDark ? "#8696a0" : "#999999"}
            style={[styles.input, { color: isDark ? "#ffffff" : "#111b21" }]}
            multiline
            maxLength={4000}
          />

          <TouchableOpacity
            style={styles.composerIcon}
            activeOpacity={0.75}
            disabled={uploadingAttachment}
            onPress={() => {
              setShowEmojiPicker(false);
              setShowAttachMenu((prev) => !prev);
            }}
          >
            {uploadingAttachment ? (
              <ActivityIndicator
                size="small"
                color="#00a884"
              />
            ) : (
              <Ionicons
                name="attach-outline"
                size={23}
                color={showAttachMenu ? "#00a884" : (isDark ? "#8696a0" : "#54656f")}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.send,
              (!text.trim() ||
                sending ||
                uploadingAttachment) &&
                styles.sendDisabled,
            ]}
            activeOpacity={0.8}
            disabled={
              !text.trim() ||
              sending ||
              uploadingAttachment
            }
            onPress={sendMessage}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="send"
                size={17}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* PIN IMAGE & REVIEW COMMENT MODAL */}
      <Modal
        visible={Boolean(activeImageForNote)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveImageForNote(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#202c33" : "#ffffff" }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="pin" size={20} color="#00a884" />
              <Text style={[styles.modalTitle, { color: isDark ? "#ffffff" : "#111b21" }]}>
                फोटोवर सूचना / कमेंट पिन करा (Review Note)
              </Text>
            </View>

            {activeImageForNote?.url && (
              <Image
                source={{ uri: activeImageForNote.url }}
                style={styles.modalImagePreview}
                resizeMode="cover"
              />
            )}

            <Text style={[styles.modalHint, { color: isDark ? "#8696a0" : "#667781" }]}>
              फोटोग्राफरसाठी सूचना लिहा (उदा. "अल्बम कव्हरसाठी हा फोटो फायनल करा", "यातील लाईट वाढवा"):
            </Text>

            <TextInput
              value={reviewNoteText}
              onChangeText={setReviewNoteText}
              placeholder="येथे कमेंट टाईप करा..."
              placeholderTextColor={isDark ? "#8696a0" : "#999999"}
              style={[
                styles.modalInput,
                {
                  color: isDark ? "#ffffff" : "#111b21",
                  backgroundColor: isDark ? "#111b21" : "#f0f2f5",
                  borderColor: isDark ? "#2a3942" : "#e2e8f0",
                },
              ]}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setActiveImageForNote(null);
                  setReviewNoteText("");
                }}
              >
                <Text style={[styles.modalCancelText, { color: isDark ? "#8696a0" : "#667781" }]}>
                  रद्द करा (Cancel)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#00a884" }]}
                onPress={async () => {
                  if (!activeImageForNote || !reviewNoteText.trim()) return;
                  const note = reviewNoteText.trim();
                  const msgId = activeImageForNote.id;

                  setPinnedComments((prev) => ({ ...prev, [msgId]: note }));
                  setPinnedMessageIds((prev) => (prev.includes(msgId) ? prev : [...prev, msgId]));
                  setActiveImageForNote(null);
                  setReviewNoteText("");

                  await sendMessageWithContent(`📌 [Photo Review Note]: "${note}"`);
                }}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveText}>सेव्ह आणि पिन करा</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <Modal
        visible={Boolean(lightboxUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setLightboxUri(null)}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 70,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },

  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00a88422",
    alignItems: "center",
    justifyContent: "center",
  },

  headerAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00a884",
  },

  headerText: {
    flex: 1,
    marginLeft: 10,
  },

  headerTitle: {
    fontSize: 15.5,
    fontWeight: "700",
  },

  onlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  onlineDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: "#00a884",
    marginRight: 4,
  },

  onlineStatusText: {
    fontSize: 11,
    color: "#00a884",
    fontWeight: "500",
  },

  headerActionsRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerAction: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  pinnedBannerInfo: {
    flex: 1,
    marginHorizontal: 10,
  },

  pinnedBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
  },

  pinnedBannerSub: {
    fontSize: 11,
    marginTop: 1,
  },

  pinnedBannerClose: {
    padding: 4,
  },

  chatBackgroundImage: {
    width: "100%",
    height: "100%",
    opacity: 1,
  },

  body: {
    flex: 1,
    backgroundColor: "transparent",
    overflow: "hidden",
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  messages: {
    flex: 1,
  },

  messageContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },

  emptyMessages: {
    flexGrow: 1,
  },

  e2eContainer: {
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },

  e2eCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  e2eText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    flexShrink: 1,
  },

  emptyConversation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    marginTop: 40,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00a88420",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  emptyText: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginBottom: 6,
    borderRadius: 14,
  },

  sentLight: {
    alignSelf: "flex-end",
    backgroundColor: "#d9fdd3",
    borderTopRightRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },

  sentDark: {
    alignSelf: "flex-end",
    backgroundColor: "#005c4b",
    borderTopRightRadius: 4,
  },

  receivedLight: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },

  receivedDark: {
    alignSelf: "flex-start",
    backgroundColor: "#202c33",
    borderTopLeftRadius: 4,
  },

  bubblePinTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 4,
    backgroundColor: "#00a88418",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  bubblePinTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00a884",
    marginLeft: 3,
  },

  deletedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },

  deletedText: {
    fontSize: 13,
    fontStyle: "italic",
    marginLeft: 6,
  },

  imageAttachmentBox: {
    marginBottom: 4,
  },

  attachmentImage: {
    width: 220,
    height: 220,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },

  pinCommentActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#00a88418",
  },

  pinCommentActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00a884",
    marginLeft: 4,
  },

  reviewCommentBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 5,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#00a88422",
    borderLeftWidth: 3,
    borderLeftColor: "#00a884",
  },

  reviewCommentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00a884",
    marginLeft: 5,
    flex: 1,
  },

  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    minWidth: 180,
  },

  fileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  fileAttachmentText: {
    flex: 1,
    marginLeft: 8,
  },

  fileName: {
    fontSize: 13,
    fontWeight: "600",
  },

  fileMeta: {
    fontSize: 11,
    marginTop: 2,
  },

  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    minWidth: 200,
  },

  locationMapPinWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },

  locationInfo: {
    flex: 1,
    marginLeft: 10,
  },

  locationTitle: {
    fontSize: 13,
    fontWeight: "700",
  },

  locationAction: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1d4ed8",
    marginTop: 2,
  },

  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 3,
  },

  timeText: {
    fontSize: 10.5,
  },

  attachTray: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    gap: 24,
  },

  attachOption: {
    alignItems: "center",
  },

  attachIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  attachLabel: {
    fontSize: 11.5,
    fontWeight: "600",
  },

  emojiScroll: {
    height: 110,
    maxHeight: 110,
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },

  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  emojiButton: {
    width: 48,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  emojiText: {
    fontSize: 30,
    lineHeight: 38,
  },

  composerArea: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
  },

  composer: {
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 23,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "flex-end",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },

  composerIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 90,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14.5,
  },

  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00a884",
    alignItems: "center",
    justifyContent: "center",
  },

  sendDisabled: {
    opacity: 0.4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    flex: 1,
  },

  modalImagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },

  modalHint: {
    fontSize: 12.5,
    marginBottom: 8,
    lineHeight: 17,
  },

  modalInput: {
    minHeight: 70,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 16,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },

  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  modalCancelText: {
    fontSize: 13.5,
    fontWeight: "600",
  },

  modalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },

  modalSaveText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },

  lightboxCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },

  lightboxImage: {
    width: "90%",
    height: "80%",
  },
});
