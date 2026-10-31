import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/navigation-types";
import { colors } from "../../theme/colors";
import {
  cancelClientBooking,
  getClientBookings,
  getClientBookingReviews,
  type ClientBooking,
  type ClientBookingReview,
} from "../../services/client-app/client-app.service";

const getStatusColors = (status?: string | null) => {
  const value = (status || "pending").toLowerCase();

  if (
    value.includes("confirm") ||
    value.includes("complete") ||
    value.includes("paid")
  ) {
    return {
      bg: "#16A34A18",
      text: "#16A34A",
    };
  }

  if (value.includes("cancel") || value.includes("reject")) {
    return {
      bg: "#DC262618",
      text: "#DC2626",
    };
  }

  return {
    bg: colors.primary + "12",
    text: colors.primary,
  };
};

export default function ClientBookingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [reviews, setReviews] = useState<ClientBookingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [cancelBooking, setCancelBooking] =
    useState<ClientBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const cancellationReasons = [
    {
      value: "client_cancelled",
      label: "I no longer need this booking",
    },
    {
      value: "duplicate_booking",
      label: "Duplicate booking",
    },
    {
      value: "event_postponed",
      label: "Event postponed",
    },
    {
      value: "event_cancelled",
      label: "Event cancelled",
    },
    {
      value: "payment_failed",
      label: "Payment issue",
    },
    {
      value: "schedule_conflict",
      label: "Schedule conflict",
    },
    {
      value: "other",
      label: "Other",
    },
  ];

  const openCancelModal = (booking: ClientBooking) => {
    setCancelBooking(booking);
    setCancelReason("");
    setCancelNote("");
    setCancelError("");
  };

  const closeCancelModal = () => {
    if (cancelling) return;

    setCancelBooking(null);
    setCancelReason("");
    setCancelNote("");
    setCancelError("");
  };

  const handleCancelBooking = async () => {
    if (!cancelBooking?.id) {
      setCancelError("Booking information is missing.");
      return;
    }

    if (!cancelReason) {
      setCancelError("Please select a cancellation reason.");
      return;
    }

    if (cancelReason === "other" && !cancelNote.trim()) {
      setCancelError("Please enter a cancellation note.");
      return;
    }

    try {
      setCancelling(true);
      setCancelError("");

      await cancelClientBooking({
        booking_id: cancelBooking.id,
        reason_code: cancelReason,
        reason_note: cancelNote.trim() || null,
        is_genuine: true,
      });

      setCancelBooking(null);
      setCancelReason("");
      setCancelNote("");
      setCancelError("");

      setRefreshing(true);
      await load();
    } catch (err) {
      setCancelError(
        err instanceof Error
          ? err.message
          : "Unable to cancel this booking.",
      );
    } finally {
      setCancelling(false);
    }
  };

  const load = useCallback(async () => {
    try {
      setError("");

      const [response, reviewResponse] = await Promise.all([
        getClientBookings(),
        getClientBookingReviews(),
      ]);

      setBookings(response.bookings ?? []);
      setReviews(reviewResponse.data?.reviews ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load bookings.",
      );
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

  const formatDate = (value?: string | null) => {
    if (!value) return "Date not scheduled";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (
    amount?: number | null,
    currency?: string | null,
  ) => {
    if (amount == null) return null;

    return `${currency || "INR"} ${Number(amount).toLocaleString("en-IN")}`;
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.75}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Bookings</Text>

          <Text style={styles.subtitle}>
            {bookings.length > 0
              ? `${bookings.length} booking${
                  bookings.length === 1 ? "" : "s"
                }`
              : "Your photography bookings"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            setRefreshing(true);
            void load();
          }}
          accessibilityRole="button"
          accessibilityLabel="Refresh bookings"
          activeOpacity={0.75}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* LOADING */}
      {loading ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.skeletonCard}>
              <View style={styles.skeletonTop}>
                <View style={styles.skeletonIcon} />

                <View style={styles.skeletonTextWrap}>
                  <View style={styles.skeletonLineWide} />
                  <View style={styles.skeletonLineSmall} />
                </View>

                <View style={styles.skeletonStatus} />
              </View>

              <View style={styles.skeletonLineMedium} />
              <View style={styles.skeletonLineWide} />

              <View style={styles.skeletonFooter} />
            </View>
          ))}
        </ScrollView>
      ) : error ? (
        /* ERROR */
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Unable to load bookings
          </Text>

          <Text style={styles.emptyText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retry}
            onPress={() => void load()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color="#fff"
            />

            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* DATA */
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
          showsVerticalScrollIndicator={false}
        >
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No bookings yet
              </Text>

              <Text style={styles.emptyText}>
                Your confirmed photography bookings will appear here.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Your Bookings
                  </Text>

                  <Text style={styles.sectionHint}>
                    Latest updates from your studio
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {bookings.length}
                  </Text>
                </View>
              </View>

              {bookings.map((booking) => {
                const statusColors = getStatusColors(
                  booking.status,
                );

                return (
                  <View
                    key={booking.id}
                    style={styles.card}
                  >
                    {/* CARD TOP */}
                    <View style={styles.cardTop}>
                      <View style={styles.iconBox}>
                        <Ionicons
                          name="calendar-outline"
                          size={21}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.cardHeading}>
                        <Text
                          style={styles.bookingTitle}
                          numberOfLines={1}
                        >
                          {booking.title ||
                            booking.event_type ||
                            "Photography Booking"}
                        </Text>

                        {!!booking.booking_number && (
                          <Text style={styles.bookingNumber}>
                            #{booking.booking_number}
                          </Text>
                        )}
                      </View>

                      <View
                        style={[
                          styles.status,
                          {
                            backgroundColor:
                              statusColors.bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: statusColors.text,
                            },
                          ]}
                        >
                          {booking.status || "Pending"}
                        </Text>
                      </View>
                    </View>

                    {/* DATE */}
                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={colors.primary}
                        />
                      </View>

                      <Text style={styles.infoText}>
                        {formatDate(booking.event_date)}

                        {booking.event_time
                          ? ` • ${booking.event_time}`
                          : ""}
                      </Text>
                    </View>

                    {/* VENUE */}
                    {!!booking.venue_name && (
                      <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color={colors.primary}
                          />
                        </View>

                        <Text
                          style={styles.infoText}
                          numberOfLines={2}
                        >
                          {booking.venue_name}

                          {booking.city
                            ? `, ${booking.city}`
                            : ""}
                        </Text>
                      </View>
                    )}

                    {/* CANCEL BOOKING */}
                    {!["cancelled", "completed"].includes(
                      booking.status?.toLowerCase() || "",
                    ) && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => openCancelModal(booking)}
                        activeOpacity={0.82}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={17}
                          color="#DC2626"
                        />

                        <Text style={styles.cancelButtonText}>
                          Cancel Booking
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* REVIEW ACTION */}
                    {booking.status?.toLowerCase() === "completed" && (() => {
                      const bookingReview = reviews.find(
                        (item) => item.booking_id === booking.id,
                      );

                      if (!bookingReview) {
                        return (
                          <TouchableOpacity
                            style={styles.reviewButton}
                            onPress={() =>
                              navigation.navigate("ClientBookingReview", {
                                bookingId: booking.id || "",
                                bookingTitle:
                                  booking.title ||
                                  booking.event_type ||
                                  "Photography Booking",
                              })
                            }
                            activeOpacity={0.82}
                          >
                            <Ionicons
                              name="star-outline"
                              size={17}
                              color="#fff"
                            />

                            <Text style={styles.reviewButtonText}>
                              Write a Review
                            </Text>
                          </TouchableOpacity>
                        );
                      }

                      if (bookingReview.status === "pending") {
                        return (
                          <View style={styles.reviewStatusPending}>
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={colors.primary}
                            />

                            <Text style={styles.reviewStatusPendingText}>
                              Review waiting for studio approval
                            </Text>
                          </View>
                        );
                      }

                      if (bookingReview.status === "published") {
                        return (
                          <View style={styles.reviewStatusPublished}>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={16}
                              color="#16A34A"
                            />

                            <Text style={styles.reviewStatusPublishedText}>
                              Review published
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <View style={styles.reviewStatusRejected}>
                          <Ionicons
                            name="close-circle-outline"
                            size={16}
                            color="#DC2626"
                          />

                          <Text style={styles.reviewStatusRejectedText}>
                            Review was not approved
                          </Text>
                        </View>
                      );
                    })()}

                    {/* FOOTER */}
                    <View style={styles.footer}>
                      <View style={styles.paymentWrap}>
                        <Ionicons
                          name="card-outline"
                          size={15}
                          color={colors.textSecondary}
                        />

                        <Text
                          style={styles.payment}
                          numberOfLines={1}
                        >
                          {booking.payment_status ||
                            "Payment not available"}
                        </Text>
                      </View>

                      {booking.total_amount != null && (
                        <Text style={styles.amount}>
                          {formatAmount(
                            booking.total_amount,
                            booking.currency,
                          )}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
      <Modal
        visible={!!cancelBooking}
        transparent
        animationType="slide"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalCard}>
            <View style={styles.cancelModalHeader}>
              <View style={styles.cancelModalIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={25}
                  color="#DC2626"
                />
              </View>

              <View style={styles.cancelModalHeaderText}>
                <Text style={styles.cancelModalTitle}>
                  Cancel Booking
                </Text>

                <Text style={styles.cancelModalSubtitle}>
                  {cancelBooking?.title ||
                    cancelBooking?.event_type ||
                    "Photography Booking"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeCancelModal}
                disabled={cancelling}
                style={styles.cancelModalClose}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelSectionTitle}>
              Why are you cancelling?
            </Text>

            <Text style={styles.cancelSectionHint}>
              Please select a valid reason.
            </Text>

            <ScrollView
              style={styles.cancelReasons}
              showsVerticalScrollIndicator={false}
            >
              {cancellationReasons.map((reason) => {
                const selected = cancelReason === reason.value;

                return (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.cancelReasonRow,
                      selected && styles.cancelReasonRowSelected,
                    ]}
                    onPress={() => {
                      setCancelReason(reason.value);
                      setCancelError("");
                    }}
                    disabled={cancelling}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.cancelRadio,
                        selected && styles.cancelRadioSelected,
                      ]}
                    >
                      {selected && (
                        <View style={styles.cancelRadioDot} />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.cancelReasonText,
                        selected && styles.cancelReasonTextSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.cancelInputLabel}>
              Additional note
              {cancelReason === "other" ? " *" : ""}
            </Text>

            <TextInput
              value={cancelNote}
              onChangeText={(value) => {
                setCancelNote(value);
                setCancelError("");
              }}
              placeholder={
                cancelReason === "other"
                  ? "Please explain the reason..."
                  : "Add any additional details (optional)"
              }
              placeholderTextColor={colors.textSecondary}
              style={styles.cancelNoteInput}
              multiline
              maxLength={500}
              textAlignVertical="top"
              editable={!cancelling}
            />

            {!!cancelError && (
              <View style={styles.cancelErrorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color="#DC2626"
                />

                <Text style={styles.cancelErrorText}>
                  {cancelError}
                </Text>
              </View>
            )}

            <View style={styles.cancelActions}>
              <TouchableOpacity
                style={styles.cancelKeepButton}
                onPress={closeCancelModal}
                disabled={cancelling}
                activeOpacity={0.82}
              >
                <Text style={styles.cancelKeepButtonText}>
                  Keep Booking
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelConfirmButton,
                  cancelling && styles.cancelConfirmButtonDisabled,
                ]}
                onPress={() => void handleCancelBooking()}
                disabled={cancelling}
                activeOpacity={0.82}
              >
                {cancelling ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle-outline"
                      size={17}
                      color="#fff"
                    />

                    <Text style={styles.cancelConfirmButtonText}>
                      Confirm Cancellation
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  cancelButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DC262655",
    backgroundColor: "#DC262610",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },

  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },

  cancelModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: "88%",
  },

  cancelModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  cancelModalIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DC262612",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelModalHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  cancelModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },

  cancelModalSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textSecondary,
  },

  cancelModalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  cancelSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },

  cancelSectionHint: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
    color: colors.textSecondary,
  },

  cancelReasons: {
    maxHeight: 250,
  },

  cancelReasonRow: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 8,
  },

  cancelReasonRowSelected: {
    borderColor: "#DC262655",
    backgroundColor: "#DC262610",
  },

  cancelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  cancelRadioSelected: {
    borderColor: "#DC2626",
  },

  cancelRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
  },

  cancelReasonText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  cancelReasonTextSelected: {
    fontWeight: "700",
    color: "#DC2626",
  },

  cancelInputLabel: {
    marginTop: 10,
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  cancelNoteInput: {
    minHeight: 82,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14,
    color: colors.text,
  },

  cancelErrorBox: {
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#DC262612",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  cancelErrorText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },

  cancelActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  cancelKeepButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelKeepButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },

  cancelConfirmButton: {
    flex: 1.25,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  cancelConfirmButtonDisabled: {
    opacity: 0.65,
  },

  cancelConfirmButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  headerText: {
    flex: 1,
    marginHorizontal: 13,
  },

  title: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 14,
    flexGrow: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },

  sectionHint: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },

  cardHeading: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  bookingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },

  bookingNumber: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textSecondary,
  },

  status: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "10",
    marginRight: 9,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  reviewButton: {
    minHeight: 44,
    marginTop: 14,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.primary,
  },

  reviewButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  reviewStatusPending: {
    minHeight: 42,
    marginTop: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
  },

  reviewStatusPendingText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },

  reviewStatusPublished: {
    minHeight: 42,
    marginTop: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A12",
  },

  reviewStatusPublishedText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },

  reviewStatusRejected: {
    minHeight: 42,
    marginTop: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC262612",
  },

  reviewStatusRejectedText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  paymentWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 10,
  },

  payment: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },

  amount: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },

  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  skeletonTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.border,
  },

  skeletonTextWrap: {
    flex: 1,
    marginLeft: 12,
  },

  skeletonLineWide: {
    width: "72%",
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.border,
  },

  skeletonLineSmall: {
    width: "42%",
    height: 8,
    borderRadius: 5,
    marginTop: 8,
    backgroundColor: colors.border,
  },

  skeletonStatus: {
    width: 62,
    height: 24,
    borderRadius: 10,
    backgroundColor: colors.border,
  },

  skeletonLineMedium: {
    width: "68%",
    height: 9,
    borderRadius: 5,
    marginTop: 18,
    backgroundColor: colors.border,
  },

  skeletonFooter: {
    height: 1,
    marginTop: 18,
    backgroundColor: colors.border,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },

  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: colors.primary,
  },

  retryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
