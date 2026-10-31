import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackActions,
  useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { neumorphicRaised } from "../../theme/shadows";
import { getClientBookings,
  getMarketplaceStudioProfile } from "../../services/client-app/client-app.service";

type StudioDetailsRoute = {
  studioId?: string;
  studioName?: string;
};

type StudioDetailsData = {
  id?: string;
  studio_id?: string;
  name?: string | null;
  studio_name?: string | null;
  description?: string | null;

  owner_name?: string | null;

  phone?: string | null;
  contact_phone?: string | null;

  email?: string | null;
  contact_email?: string | null;

  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;

  website?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  cover_url?: string | null;

  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;

  rating?: number | null;
  average_rating?: number | null;
  review_count?: number | null;
  reviews_count?: number | null;

  verified?: boolean | null;
  is_verified?: boolean | null;

  services?: unknown;
  portfolio?: unknown;
  google_business_url?: string | null;
  portfolio_url?: string | null;

  social?: {
    website?: string | null;
    instagram_url?: string | null;
    facebook_url?: string | null;
    youtube_url?: string | null;
    google_business_url?: string | null;
    portfolio_url?: string | null;
  } | null;
  reviews?: unknown;
  packages?: unknown;
  offers?: unknown;
};

type NormalizedService = {
  id: string;
  name: string;
};

type NormalizedPortfolioItem = {
  id: string;
  imageUrl: string | null;
  title: string | null;
};

type NormalizedReview = {
  id: string;
  name: string;
  rating: number | null;
  comment: string | null;
  title: string | null;
  verified: boolean;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of [
      "items",
      "data",
      "results",
      "rows",
      "services",
      "portfolio",
      "reviews",
      "packages",
    ]) {
      if (Array.isArray(record[key])) {
        return record[key] as unknown[];
      }
    }
  }

  return [];
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function maskPhone(value: string | null | undefined): string | null {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");

  if (digits.length <= 4) {
    return digits;
  }

  return `******${digits.slice(-4)}`;
}

function maskEmail(value: string | null): string {
  if (!value) return "";

  const email = value.trim();
  const atIndex = email.indexOf("@");

  if (atIndex <= 0) {
    return email.length > 3
      ? `${email.slice(0, 3)}${"*".repeat(email.length - 3)}`
      : email;
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  if (localPart.length <= 3) {
    return `${localPart}${domain}`;
  }

  return `${localPart.slice(0, 3)}${"*".repeat(localPart.length - 3)}${domain}`;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function extractProfile(payload: unknown): StudioDetailsData {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const profileCandidates = [
    data.profile,
    data.studio_profile,
    data.studio,
    data.vendor,
    data,
    root.profile,
    root.studio_profile,
    root.studio,
    root.data,
    root,
  ];

  for (const candidate of profileCandidates) {
    const record = asRecord(candidate);

    if (
      record.name ||
      record.studio_name ||
      record.studio_id ||
      record.description ||
      record.contact_phone ||
      record.phone ||
      record.address
    ) {
      return record as StudioDetailsData;
    }
  }

  return data as StudioDetailsData;
}

function extractCollection(
  profile: StudioDetailsData,
  payload: unknown,
  key: "services" | "portfolio" | "reviews" | "packages",
): unknown[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    profile[key],
    data[key],
    data[`${key}_items`],
    data[`${key}_list`],
    root[key],
  ];

  for (const candidate of candidates) {
    const result = asArray(candidate);
    if (result.length) return result;
  }

  return [];
}

function normalizeServices(items: unknown[]): NormalizedService[] {
  return items
    .map((item, index) => {
      const record = asRecord(item);

      const name = firstString(
        record.name,
        record.service_name,
        record.title,
        record.label,
      );

      if (!name) return null;

      return {
        id: String(record.id ?? record.service_id ?? index),
        name,
      };
    })
    .filter(Boolean) as NormalizedService[];
}

function normalizePortfolio(value: unknown): NormalizedPortfolioItem[] {
  return asArray(value)
    .map((item, index) => {
      const record = asRecord(item);
      const cover = asRecord(record.cover);

      const imageUrl = firstString(
        record.image_url,
        record.cover_url,
        record.thumbnail_url,
        record.asset_url,
        record.public_url,
        record.url,
        cover.image_url,
        cover.public_url,
        cover.preview_url,
        cover.thumbnail_url,
      );

      const title = firstString(
        record.title,
        record.name,
        record.album_title,
        record.description,
      );

      const id =
        firstString(
          record.id,
          record.album_id,
          cover.id,
        ) ?? `portfolio-${index}`;

      return {
        id,
        imageUrl,
        title,
      };
    })
    .filter((item) => item.imageUrl || item.title);
}

function normalizeReviews(items: unknown[]): NormalizedReview[] {
  return items
    .map((item, index) => {
      const record = asRecord(item);

      return {
        id: String(record.id ?? record.review_id ?? index),
        name:
          firstString(
            record.customer_name,
            record.client_name,
            record.user_name,
            record.name,
          ) ?? "Client",
        rating: firstNumber(
          record.rating,
          record.review_rating,
          record.stars,
        ),
        comment: firstString(
          record.comment,
          record.review,
          record.review_text,
          record.content,
          record.message,
        ),
        title: firstString(
          record.title,
          record.review_title,
        ),
        verified:
          record.is_verified_purchase === true ||
          record.verified_purchase === true ||
          record.verified === true,
      };
    })
    .filter((item) => item.comment || item.rating !== null);
}

function buildAddress(profile: StudioDetailsData) {
  return [
    profile.address,
    profile.city,
    profile.state,
    profile.country,
    profile.postal_code,
  ]
    .filter((item): item is string => Boolean(item?.trim()))
    .join(", ");
}

function ensureUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function StudioDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const params = (route.params ?? {}) as StudioDetailsRoute;
  const studioId = params.studioId;

  const handleBackToMarketplace = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.pop(1));
      return;
    }

    navigation.navigate("MarketplaceHome");
  }, [navigation]);

  const [completedBookingForReview, setCompletedBookingForReview] =
    useState<{
      id: string;
      title: string;
    } | null>(null);

  const loadCompletedBookingForReviewRobust = useCallback(async () => {
    try {
      const response = await getClientBookings();

      const root =
        response && typeof response === "object"
          ? (response as any)
          : null;

      const bookings = Array.isArray(response)
        ? response
        : Array.isArray(root?.data)
          ? root.data
          : Array.isArray(root?.bookings)
            ? root.bookings
            : Array.isArray(root?.data?.bookings)
              ? root.data.bookings
              : [];

      const completed = bookings.find((booking: any) => {
        const status = String(
          booking?.status ??
          booking?.booking_status ??
          booking?.bookingStatus ??
          ""
        )
          .trim()
          .toLowerCase()
          .replace(/[ _-]+/g, "");

        const bookingStudioId = String(
          booking?.studio_id ??
          booking?.studioId ??
          booking?.studio?.id ??
          ""
        ).trim();

        const targetStudioId = String(studioId ?? "").trim();

        const isCompleted =
          status === "completed" ||
          status === "complete" ||
          status === "closed" ||
          status === "delivered";

        const studioMatches =
          !bookingStudioId ||
          !targetStudioId ||
          bookingStudioId === targetStudioId;

        return isCompleted && studioMatches;
      });

      if (completed?.id) {
        setCompletedBookingForReview({
          id: String(completed.id),
          title: String(
            completed.title ??
            completed.booking_title ??
            completed.event_type ??
            completed.booking_number ??
            "Completed Booking"
          ),
        });
      } else {
        setCompletedBookingForReview(null);
      }
    } catch (error) {
      console.warn(
        "[StudioDetails] completed booking lookup failed:",
        error
      );
      setCompletedBookingForReview(null);
    }
  }, [studioId]);

  useEffect(() => {
    void loadCompletedBookingForReviewRobust();
  }, [loadCompletedBookingForReviewRobust]);

  const [profile, setProfile] = useState<StudioDetailsData | null>(null);
  const [rawPayload, setRawPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!studioId) {
      setError("Studio information is missing.");
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const response = await getMarketplaceStudioProfile(studioId);
      const nextProfile = extractProfile(response);

      setRawPayload(response);
      setProfile(nextProfile);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load studio profile.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studioId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const services = useMemo(
    () =>
      profile
        ? normalizeServices(
            extractCollection(profile, rawPayload, "services"),
          )
        : [],
    [profile, rawPayload],
  );

  const portfolio = useMemo(
    () =>
      profile
        ? normalizePortfolio(
            extractCollection(profile, rawPayload, "portfolio"),
          )
        : [],
    [profile, rawPayload],
  );

  const reviews = useMemo(
    () =>
      profile
        ? normalizeReviews(
            extractCollection(profile, rawPayload, "reviews"),
          )
        : [],
    [profile, rawPayload],
  );

  const studioName =
    firstString(profile?.name, profile?.studio_name) ??
    params.studioName ??
    "Photography Studio";

  const phone = firstString(profile?.phone, profile?.contact_phone);
  const maskedPhone = maskPhone(phone);
  const email = firstString(profile?.email, profile?.contact_email);
  const maskedEmail = maskEmail(email);

  const rootPayload = asRecord(rawPayload);
  const payloadData = asRecord(rootPayload.data);
  const payloadSocial = asRecord(payloadData.social);

  const social = {
    ...asRecord(profile?.social),
    ...payloadSocial,
  };

  const website = firstString(
    profile?.website,
    social.website,
  );

  const instagram = firstString(
    profile?.instagram_url,
    social?.instagram_url,
  );

  const facebook = firstString(
    profile?.facebook_url,
    social?.facebook_url,
  );

  const youtube = firstString(
    profile?.youtube_url,
    social?.youtube_url,
  );

  const googleBusiness = firstString(
    profile?.google_business_url,
    social?.google_business_url,
  );

  const portfolioUrl = firstString(
    profile?.portfolio_url,
    social?.portfolio_url,
    profile?.website,
    social?.website,
  );

  const logoUrl = firstString(
    profile?.logo_url,
    profile?.image_url,
  );

  const coverUrl = firstString(
    profile?.cover_url,
    profile?.image_url,
    profile?.logo_url,
  );

  const address = profile ? buildAddress(profile) : "";

  const ratingSummary = asRecord(
    asRecord(rawPayload).rating,
  );

  const rating = firstNumber(
    ratingSummary.average_rating,
    profile?.rating,
    profile?.average_rating,
  );

  const carouselReviews = useMemo<NormalizedReview[]>(() => {
    return [
      {
        id: "demo-review-1",
        name: "Aarav Patil",
        rating: 5,
        title: "Amazing photography experience",
        comment:
          "The studio team was very professional and friendly. The photos were beautiful and the complete experience was smooth from booking to final delivery. We loved the complete experience and the quality of the final photographs.",
        verified: true,
      },
      {
        id: "demo-review-2",
        name: "Sneha Kulkarni",
        rating: 4.8,
        title: "Beautiful photos and great service",
        comment:
          "Loved the quality of the photographs. The team understood exactly what we wanted and made the entire session comfortable and enjoyable. The communication was excellent and the final photos looked beautiful.",
        verified: true,
      },
      {
        id: "demo-review-3",
        name: "Rohan Deshmukh",
        rating: 5,
        title: "Highly professional team",
        comment:
          "Excellent experience with the studio. Communication, photography quality and final delivery were all very good. Would definitely recommend the service to anyone looking for a professional photography studio.",
        verified: true,
      },
    ];
  }, []);

  const reviewCount = firstNumber(
    ratingSummary.total_reviews,
    profile?.review_count,
    profile?.reviews_count,
  );

  const verified =
    profile?.verified === true ||
    profile?.is_verified === true;

  useEffect(() => {
    let cancelled = false;

    async function loadCompletedBookingForReview() {
      if (!studioId) {
        setCompletedBookingForReview(null);
        return;
      }

      try {
        const response = await getClientBookings();

        const root =
          response && typeof response === "object"
            ? response as Record<string, unknown>
            : {};

        const data =
          root.data && typeof root.data === "object"
            ? root.data as Record<string, unknown>
            : {};

        const candidates = [
          root.items,
          root.bookings,
          data.items,
          data.bookings,
        ];

        let bookings: unknown[] = [];

        for (const candidate of candidates) {
          if (Array.isArray(candidate)) {
            bookings = candidate;
            break;
          }
        }

        const completed = bookings.find((item) => {
          if (!item || typeof item !== "object") {
            return false;
          }

          const booking =
            item as Record<string, unknown>;

          const bookingStudioId =
            String(
              booking.studio_id ??
              booking.studioId ??
              "",
            );

          const status =
            String(
              booking.status ??
              booking.booking_status ??
              "",
            ).toLowerCase();

          return (
            bookingStudioId === studioId &&
            (
              status === "completed" ||
              status === "complete" ||
              status === "closed"
            )
          );
        });

        if (cancelled) {
          return;
        }

        if (!completed || typeof completed !== "object") {
          setCompletedBookingForReview(null);
          return;
        }

        const booking =
          completed as Record<string, unknown>;

        const bookingId = String(
          booking.id ??
          booking.booking_id ??
          "",
        );

        if (!bookingId) {
          setCompletedBookingForReview(null);
          return;
        }

        setCompletedBookingForReview({
          id: bookingId,
          title: String(
            booking.title ??
            booking.booking_number ??
            booking.event_type ??
            "Photography Session",
          ),
        });
      } catch (error) {
        console.warn(
          "[StudioDetails] Review booking lookup failed:",
          error,
        );

        if (!cancelled) {
          setCompletedBookingForReview(null);
        }
      }
    }

    void loadCompletedBookingForReview();

    return () => {
      cancelled = true;
    };
  }, [studioId]);

  const handleCall = async () => {
    if (!phone) {
      Alert.alert("Phone unavailable", "This studio has not added a phone number.");
      return;
    }

    const url = `tel:${phone.replace(/[^\d+]/g, "")}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to call", "Phone calling is not available on this device.");
    }
  };

  const handleChat = () => {
    navigation.getParent()?.navigate("Chat");
  };

  const openExternal = async (value: string, label: string) => {
    try {
      await Linking.openURL(ensureUrl(value));
    } catch {
      Alert.alert("Unable to open", `${label} could not be opened.`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading studio profile…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={34}
            color={colors.primary}
          />
        </View>

        <Text style={styles.errorTitle}>Unable to load studio</Text>

        <Text style={styles.errorText}>
          {error ?? "Studio profile was not found."}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadProfile}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={handleBackToMarketplace}
        >
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.roundButton}
            onPress={handleBackToMarketplace}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.roundButton}>
            <Ionicons
              name="heart-outline"
              size={21}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cover}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="camera-outline"
              size={52}
              color={colors.primary}
            />
          )}
        </View>

        <View style={styles.identity}>
          <View style={styles.nameLine}>
            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {studioName}
                </Text>

                {verified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.primary}
                  />
                ) : null}
              </View>

              {profile.owner_name ? (
                <Text style={styles.owner}>
                  {profile.owner_name}
                </Text>
              ) : null}
            </View>
          </View>

          {address ? (
            <View style={styles.metaRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color={colors.textSecondary}
              />
              <Text style={styles.location}>{address}</Text>
            </View>
          ) : null}

          {rating !== null || reviewCount !== null ? (
            <View style={styles.rating}>
              {rating !== null ? (
                <>
                  <Ionicons
                    name="star"
                    size={15}
                    color={colors.warning}
                  />
                  <Text style={styles.ratingText}>
                    {rating.toFixed(1)}
                  </Text>
                  <Text style={styles.ratingStars}>
                    ★★★★★
                  </Text>
                </>
              ) : null}

              {reviewCount !== null ? (
                <Text style={styles.reviews}>
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <ActionButton
            icon="call-outline"
            title="Call"
            onPress={handleCall}
          />

          <ActionButton
            icon="chatbubble-outline"
            title="Chat"
            onPress={handleChat}
          />

          <ActionButton
            icon="calendar-outline"
            title="Book Now"
            primary
            onPress={() =>
              navigation.navigate("MarketplaceBooking", {
                studioId: profile.studio_id || profile.id || "",
                studioName:
                  profile.studio_name ||
                  profile.name ||
                  "Studio",
              })
            }
          />
        </View>

        {profile.description ? (
          <InfoSection title="About">
            <Text style={styles.body}>
              {profile.description}
            </Text>
          </InfoSection>
        ) : null}

        {services.length > 0 ? (
          <InfoSection title="Services">
            <View style={styles.serviceGrid}>
              {services.map((service) => (
                <View key={service.id} style={styles.service}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={styles.serviceText}>
                    {service.name}
                  </Text>
                </View>
              ))}
            </View>
          </InfoSection>
        ) : null}

        {portfolio.length > 0 ? (
          <InfoSection title="Portfolio">
            <View style={styles.portfolioHeader}>
              <Text style={styles.portfolioCount}>
                {portfolio.length} {portfolio.length === 1 ? "album" : "albums"}
              </Text>
            </View>

            <View style={styles.portfolio}>
              {portfolio.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.portfolioTile}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (item.imageUrl) {
                      openExternal(item.imageUrl, item.title ?? "Portfolio");
                    }
                  }}
                >
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.portfolioImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.portfolioPlaceholder}>
                      <Ionicons
                        name="images-outline"
                        size={27}
                        color={colors.textMuted}
                      />
                    </View>
                  )}

                  {item.title ? (
                    <View style={styles.portfolioCaption}>
                      <Text
                        style={styles.portfolioCaptionText}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </InfoSection>
        ) : null}

        

        {phone ||
        email ||
        address ||
        googleBusiness ||
        portfolioUrl ? (
          <InfoSection title="Contact & Social">
            {phone ? (
              <ContactRow
                icon="call-outline"
                label="Phone"
                value={maskedPhone ?? "Phone unavailable"}
                onPress={handleCall}
              />
            ) : null}

            {email ? (
              <ContactRow
                icon="mail-outline"
                label="Email"
                value={maskedEmail}
                onPress={() => openExternal(`mailto:${email}`, "Email")}
              />
            ) : null}

            {address ? (
              <ContactRow
                icon="location-outline"
                label="Address"
                value={address}
              />
            ) : null}

            {googleBusiness ? (
              <ContactRow
                icon="location-outline"
                label="Google Business"
                value={googleBusiness}
                onPress={() =>
                  openExternal(googleBusiness, "Google Business")
                }
              />
            ) : null}

            {portfolioUrl ? (
              <ContactRow
                icon="images-outline"
                label="Portfolio"
                value={portfolioUrl}
                onPress={() =>
                  openExternal(portfolioUrl, "Portfolio")
                }
              />
            ) : null}
          </InfoSection>
        ) : null}

        <InfoSection title="Social Media">
          <View style={styles.socialGrid}>
            <SocialButton
              icon="logo-instagram"
              label={instagram ? "Instagram" : "Instagram · Not added"}
              disabled={!instagram}
              onPress={() => {
                if (instagram) {
                  openExternal(instagram, "Instagram");
                }
              }}
            />

            <SocialButton
              icon="logo-facebook"
              label={facebook ? "Facebook" : "Facebook · Not added"}
              disabled={!facebook}
              onPress={() => {
                if (facebook) {
                  openExternal(facebook, "Facebook");
                }
              }}
            />

            <SocialButton
              icon="logo-youtube"
              label={youtube ? "YouTube" : "YouTube · Not added"}
              disabled={!youtube}
              onPress={() => {
                if (youtube) {
                  openExternal(youtube, "YouTube");
                }
              }}
            />

            <SocialButton
              icon="images-outline"
              label={portfolioUrl ? "Portfolio" : "Portfolio · Not added"}
              disabled={!portfolioUrl}
              onPress={() => {
                if (portfolioUrl) {
                  openExternal(portfolioUrl, "Portfolio");
                }
              }}
            />
          </View>
        </InfoSection>

        <InfoSection title="Ratings & Reviews">
          <View style={styles.ratingSummaryCard}>
            <View style={styles.ratingSummaryMain}>
              <Text style={styles.ratingSummaryValue}>
                {rating !== null ? rating.toFixed(1) : "—"}
              </Text>

              <View style={styles.ratingStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      rating !== null && star <= Math.round(rating)
                        ? "star"
                        : "star-outline"
                    }
                    size={16}
                    color={colors.warning}
                  />
                ))}
              </View>

              <Text style={styles.ratingSummaryCount}>
                {reviewCount !== null
                  ? `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`
                  : "No reviews yet"}
              </Text>
            </View>

            <View style={styles.ratingSummaryDivider} />

            <View style={styles.ratingSummarySide}>
              <Text style={styles.ratingSummaryLabel}>
                Studio rating
              </Text>

              <Text style={styles.ratingSummarySubtext}>
                Based on published client reviews
              </Text>
            </View>
          </View>

          <StudioReviewCarousel reviews={carouselReviews} />
        </InfoSection>

        <TouchableOpacity
          style={styles.writeReviewButton}
          activeOpacity={0.82}
          onPress={() => {
            navigation.navigate("Bookings");
          }}
        >
          <View style={styles.writeReviewIcon}>
            <Ionicons
              name="create-outline"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.writeReviewContent}>
            <Text style={styles.writeReviewTitle}>
              Write a Review
            </Text>

            <Text style={styles.writeReviewText}>
              Share your experience with this studio
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function StudioReviewCarousel({
  reviews,
}: {
  reviews: NormalizedReview[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reviews.length <= 1) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveIndex((current) => (current + 1) % reviews.length);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [reviews.length]);

  const review = reviews[activeIndex] ?? reviews[0];

  if (!review) {
    return null;
  }

  return (
    <View style={styles.reviewCarousel}>
      <View style={styles.reviewCarouselTop}>
        <View style={styles.reviewerAvatar}>
          <Text style={styles.reviewerAvatarText}>
            {review.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.reviewCarouselIdentity}>
          <Text style={styles.reviewer}>
            {review.name}
          </Text>

          {review.verified ? (
            <View style={styles.reviewVerified}>
              <Ionicons
                name="checkmark-circle"
                size={12}
                color={colors.success}
              />
              <Text style={styles.reviewVerifiedText}>
                Verified booking
              </Text>
            </View>
          ) : null}
        </View>

        {review.rating !== null ? (
          <View style={styles.reviewRating}>
            <Ionicons
              name="star"
              size={13}
              color={colors.warning}
            />
            <Text style={styles.reviewRatingText}>
              {review.rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>

      {review.title ? (
        <Text style={styles.reviewTitle}>
          {review.title}
        </Text>
      ) : null}

      {review.comment ? (
        <View style={styles.reviewCommentScrollArea}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.reviewCommentScroll}
            contentContainerStyle={styles.reviewCommentScrollContent}
          >
            <Text style={styles.reviewComment}>
              {review.comment}
            </Text>
          </ScrollView>
        </View>
      ) : null}

      {reviews.length > 1 ? (
        <View style={styles.reviewCarouselDots}>
          {reviews.slice(0, 5).map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.reviewCarouselDot,
                index === activeIndex &&
                  styles.reviewCarouselDotActive,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  icon,
  title,
  primary,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.action,
        primary && styles.actionPrimary,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={19}
        color={primary ? colors.white : colors.primary}
      />

      <Text
        style={[
          styles.actionText,
          primary && styles.actionTextPrimary,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.contactRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.contactIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.primary}
        />
      </View>

      <View style={styles.contactContent}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>

      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={17}
          color={colors.textMuted}
        />
      ) : null}
    </TouchableOpacity>
  );
}

function SocialButton({
  icon,
  label,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.socialButton,
        disabled && styles.socialButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={19}
        color={disabled ? colors.textMuted : colors.primary}
      />
      <Text
        style={[
          styles.socialText,
          disabled && styles.socialTextDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.xl,
  },

  topBar: {
    marginTop: 35,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...neumorphicRaised,
  },

  cover: {
    height: 190,
    borderRadius: 27,
    overflow: "hidden",
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    ...neumorphicRaised,
  },

  coverImage: {
    width: "100%",
    height: "100%",
  },

  identity: {
    marginTop: 20,
  },

  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
  },

  nameBlock: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  name: {
    flexShrink: 1,
    fontSize: 25,
    fontWeight: "700",
    color: colors.text,
  },

  owner: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  location: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  rating: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  reviews: {
    fontSize: 12,
    color: colors.textMuted,
  },

  actions: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },

  action: {
    flex: 1,
    height: 50,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    ...neumorphicRaised,
  },

  actionPrimary: {
    backgroundColor: colors.primary,
  },

  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },

  actionTextPrimary: {
    color: colors.white,
  },

  section: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },

  sectionCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.surface,
    ...neumorphicRaised,
  },

  body: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
  },

  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  service: {
    width: "44%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  serviceText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },

  portfolioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 12,
  },

  portfolioCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  portfolio: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  portfolioTile: {
    width: "31.8%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.primarySoft,
    position: "relative",
  },

  portfolioImage: {
    width: "100%",
    height: "100%",
  },

  portfolioPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },

  portfolioCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: "rgba(0,0,0,0.48)",
  },

  portfolioCaptionText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.white,
  },

  review: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reviewer: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  reviewRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },

  ratingStars: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.warning,
  },

  reviewVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
  },

  reviewVerifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
  },

  reviewTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  reviewComment: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },

  ratingSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },

  ratingSummaryMain: {
    minWidth: 92,
    alignItems: "center",
  },

  ratingSummaryValue: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "800",
    color: colors.text,
  },

  ratingStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },

  ratingSummaryCount: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  ratingSummaryDivider: {
    width: 1,
    alignSelf: "stretch",
    marginHorizontal: 15,
    backgroundColor: colors.border,
  },

  ratingSummarySide: {
    flex: 1,
  },

  ratingSummaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  ratingSummarySubtext: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  bottomReviewCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 17,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  bottomReviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  bottomReviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },

  bottomReviewerAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },

  bottomReviewerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  bottomReviewerName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  bottomReviewTitle: {
    marginTop: 11,
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },

  bottomReviewComment: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  bottomReviewEmpty: {
    alignItems: "center",
    paddingVertical: 22,
  },

  bottomReviewEmptyTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },

  bottomReviewEmptyText: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textSecondary,
  },

  reviewCommentScrollArea: {
    marginTop: 8,
    maxHeight: 92,
    borderRadius: 10,
    overflow: "hidden",
  },

  reviewCommentScroll: {
    maxHeight: 92,
  },

  reviewCommentScrollContent: {
    paddingRight: 8,
  },

  reviewCarousel: {
    marginTop: 12,
    padding: 15,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  reviewCarouselTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },

  reviewerAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },

  reviewCarouselIdentity: {
    flex: 1,
    marginLeft: 10,
  },

  reviewCarouselDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 12,
  },

  reviewCarouselDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },

  reviewCarouselDotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },

  writeReviewButton: {
    marginTop: 12,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },

  writeReviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  writeReviewContent: {
    flex: 1,
    marginLeft: 10,
  },

  writeReviewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },

  writeReviewText: {
    marginTop: 3,
    fontSize: 10,
    color: colors.textSecondary,
  },

  contactRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  contactContent: {
    flex: 1,
  },

  studioName: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  contactLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },

  contactValue: {
    marginTop: 2,
    fontSize: 13,
    color: colors.text,
  },

  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  socialButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  socialText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  socialButtonDisabled: {
    opacity: 0.65,
  },

  socialTextDisabled: {
    color: colors.textMuted,
  },

  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: colors.textSecondary,
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },

  errorText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  retryButton: {
    marginTop: 22,
    minWidth: 130,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },

  backLink: {
    marginTop: 15,
    padding: 10,
  },

  backLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
});
