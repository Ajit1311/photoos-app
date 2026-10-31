import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/navigation-types";
import {
  submitClientBookingReview,
} from "../../services/client-app/client-app.service";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "ClientBookingReview"
>;

export default function ClientBookingReviewScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const route = useRoute<Props["route"]>();
  const { bookingId, bookingTitle } = route.params;

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await submitClientBookingReview({
        booking_id: bookingId,
        rating,
        title: title.trim() || null,
        review: review.trim() || null,
      });

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your review.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.text}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Review</Text>
            <Text style={styles.headerSubtitle}>
              Your feedback has been submitted
            </Text>
          </View>
        </View>

        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark"
              size={34}
              color={colors.primary}
            />
          </View>

          <Text style={styles.successTitle}>
            Thank you for your review
          </Text>

          <Text style={styles.successText}>
            Your review has been sent to the studio for approval.
            It will appear publicly after the studio approves it.
          </Text>

          <View style={styles.pendingCard}>
            <Ionicons
              name="time-outline"
              size={19}
              color={colors.primary}
            />

            <View style={styles.pendingTextWrap}>
              <Text style={styles.pendingTitle}>
                Waiting for studio approval
              </Text>

              <Text style={styles.pendingText}>
                Your review is currently pending.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.82}
          >
            <Text style={styles.doneButtonText}>
              Back to Bookings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <Text style={styles.headerSubtitle}>
            Share your experience
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bookingCard}>
          <View style={styles.bookingIcon}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={styles.bookingText}>
            <Text style={styles.bookingLabel}>
              Completed Booking
            </Text>

            <Text
              style={styles.bookingTitle}
              numberOfLines={2}
            >
              {bookingTitle || "Photography Booking"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            How was your experience?
          </Text>

          <Text style={styles.sectionHint}>
            Tap a star to rate your experience
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  setRating(value);
                  setError("");
                }}
                style={styles.starButton}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${value} star rating`}
              >
                <Ionicons
                  name={value <= rating ? "star" : "star-outline"}
                  size={38}
                  color={
                    value <= rating
                      ? colors.warning
                      : colors.border
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating} / 5
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>
            Review title
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Give your review a title"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            maxLength={120}
          />

          <Text style={styles.inputLabel}>
            Your review
          </Text>

          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="Tell us about your experience..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, styles.reviewInput]}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color="#DC2626"
            />

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (submitting || rating === 0) &&
              styles.submitButtonDisabled,
          ]}
          onPress={() => void handleSubmit()}
          disabled={submitting || rating === 0}
          activeOpacity={0.82}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="paper-plane-outline"
                size={18}
                color="#fff"
              />

              <Text style={styles.submitButtonText}>
                Submit Review
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.approvalNote}>
          Your review will be sent to the studio for approval
          before it is published.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.text,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  bookingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  bookingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },

  bookingText: {
    flex: 1,
    marginLeft: 13,
  },

  bookingLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  bookingTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },

  sectionHint: {
    marginTop: 5,
    fontSize: 12,
    color: colors.textSecondary,
  },

  stars: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
  },

  starButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  ratingText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },

  inputLabel: {
    marginTop: 17,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
  },

  reviewInput: {
    minHeight: 130,
    paddingTop: 14,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#DC262612",
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#DC2626",
  },

  submitButton: {
    minHeight: 54,
    marginTop: 22,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
  },

  submitButtonDisabled: {
    opacity: 0.45,
  },

  submitButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  approvalNote: {
    marginTop: 13,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 70,
  },

  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },

  successTitle: {
    marginTop: 20,
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
    color: colors.text,
  },

  successText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: colors.textSecondary,
  },

  pendingCard: {
    width: "100%",
    marginTop: 24,
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
  },

  pendingTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  pendingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },

  pendingText: {
    marginTop: 3,
    fontSize: 11,
    color: colors.textSecondary,
  },

  doneButton: {
    width: "100%",
    minHeight: 52,
    marginTop: 22,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },

  doneButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
});
