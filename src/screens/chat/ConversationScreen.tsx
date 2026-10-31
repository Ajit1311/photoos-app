import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
          KeyboardAvoidingView,
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
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

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

        if (!id && studioId) {          const response =
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
   * WhatsApp-style live conversation sync.
   *
   * Marketplace and Chat intentionally use this SAME
   * ConversationScreen and SAME conversation_id.
   *
   * No loading spinner is triggered here.
   * The conversation remains visible while messages
   * are refreshed in the background.
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

    /*
     * Initial background refresh.
     */
    void refreshConversation();
    return () => {
      active = false;
    };
  }, [conversationId, loadMessages]);

  const addEmoji = (emoji: string) => {
    setText((current) => `${current}${emoji}`);
    setShowEmojiPicker(false);
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

    let id = conversationId;

    try {
      setSending(true);

      if (!id && studioId) {        const response =
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

      const sendResponse =
        await sendClientMarketplaceMessage(
          id,
          content,
        );

      const root =
        asRecord(sendResponse);

      const data =
        asRecord(root.data);

      const sentId = String(
        data.id ??
          data.message_id ??
          root.id ??
          `local-${Date.now()}`,
      ).trim();

      const sentCreatedAt =
        String(
          data.created_at ??
            root.created_at ??
            new Date().toISOString(),
        );

      const sentMessage: Message = {
        id: sentId,
        content,
        senderId:
          data.sender_id ??
          data.senderId ??
          null,
        isMine: true,
        createdAt:
          sentCreatedAt,
      };

      setMessages((current) => {
        if (
          current.some(
            (message) =>
              message.id === sentMessage.id,
          )
        ) {
          return current;
        }

        return [
          ...current,
          sentMessage,
        ];
      });

      setText("");

      /*
       * Refresh from backend as well.
       * This confirms the optimistic message
       * against the persisted encrypted message.
       */
      await loadMessages(id);
    } catch (error) {
      console.error(
        "[ClientChat] Send failed:",
        error,
      );
    } finally {
      setSending(false);
    }
  };

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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.text}
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
              style={styles.headerTitle}
            >
              {studioName}
            </Text>

            <Text style={styles.headerSubtitle}>
              Photography Studio
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerAction}
          activeOpacity={0.8}
        >
          <Ionicons
            name="call-outline"
            size={21}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

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
              color={colors.primary}
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
            {messages.length === 0 ? (
              <View style={styles.emptyConversation}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  Start a conversation
                </Text>

                <Text style={styles.emptyText}>
                  Send a message to {studioName}.
                </Text>
              </View>
            ) : (
              messages.map((message) => {
                const isMine =
                  message.isMine === true;

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      isMine
                        ? styles.sent
                        : styles.received,
                    ]}
                  >
                    {message.attachment?.url &&
                    message.messageType === "image" ? (
                      <Image
                        source={{
                          uri:
                            message.attachment.url,
                        }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                      />
                    ) : null}

                    {message.attachment &&
                    message.messageType === "file" ? (
                      <View style={styles.fileAttachment}>
                        <Ionicons
                          name="document-outline"
                          size={26}
                          color={
                            isMine
                              ? "#FFFFFF"
                              : colors.primary
                          }
                        />

                        <View
                          style={
                            styles.fileAttachmentText
                          }
                        >
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.fileName,
                              isMine &&
                                styles.fileNameMine,
                            ]}
                          >
                            {message.attachment.fileName ??
                              "Attachment"}
                          </Text>

                          <Text
                            style={[
                              styles.fileMeta,
                              isMine &&
                                styles.fileMetaMine,
                            ]}
                          >
                            File
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {message.content ? (
                      <Text
                        style={
                          isMine
                            ? styles.sentText
                            : styles.receivedText
                        }
                      >
                        {message.content}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </ImageBackground>

      <View style={styles.composerArea}>
        {showEmojiPicker ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            style={styles.emojiScroll}
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

        <View style={styles.composer}>
          <TouchableOpacity
            style={styles.composerIcon}
            activeOpacity={0.75}
            onPress={() =>
              setShowEmojiPicker(
                (current) => !current,
              )
            }
          >
            <Ionicons
              name="happy-outline"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={4000}
          />

          <TouchableOpacity
            style={styles.composerIcon}
            activeOpacity={0.75}
            disabled={uploadingAttachment}
            onPress={pickAttachment}
          >
            {uploadingAttachment ? (
              <ActivityIndicator
                size="small"
                color={colors.textSecondary}
              />
            ) : (
              <Ionicons
                name="attach-outline"
              size={22}
                color={colors.textSecondary}
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
                name="arrow-up"
                size={20}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 5,
  },

  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  headerAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },

  headerText: {
    flex: 1,
    marginLeft: 10,
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  headerAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
  },

  emptyMessages: {
    flexGrow: 1,
  },

  emptyConversation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },

  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },

  attachmentImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
    marginBottom: 6,
  },

  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 190,
    paddingVertical: 4,
  },

  fileAttachmentText: {
    flex: 1,
    marginLeft: 10,
  },

  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  fileNameMine: {
    color: "#FFFFFF",
  },

  fileMeta: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },

  fileMetaMine: {
    color: "rgba(255,255,255,0.75)",
  },

  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 8,
    borderRadius: 17,
  },

  received: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sent: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5,
  },

  receivedText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },

  sentText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFFFF",
  },

  emojiScroll: {
    height: 112,
    maxHeight: 112,
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  emojiRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },

  emojiButton: {
    width: 52,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },

  emojiText: {
    fontSize: 34,
    lineHeight: 42,
  },

  composerArea: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom:
      Platform.OS === "ios" ? 10 : 8,
    backgroundColor: colors.background,
  },

  composer: {
    minHeight: 50,
    maxHeight: 118,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 5,
    paddingRight: 5,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  composerIcon: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 8,
    fontSize: 14,
    color: colors.text,
  },

  send: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#168A5B",
    alignItems: "center",
    justifyContent: "center",
  },

  sendDisabled: {
    opacity: 0.4,
  },
});
