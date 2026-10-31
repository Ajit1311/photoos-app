import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  createMarketplaceBookingRequest,
  getClientProfile,
  getMarketplaceStudioAvailability,
  type MarketplaceStudioAvailabilityDay,
  type MarketplaceStudioAvailabilityStatus,
} from "../../services/client-app/client-app.service";
import type { MarketplaceStackParamList } from "../../navigation/MarketplaceNavigator";

type Props = NativeStackScreenProps<
  MarketplaceStackParamList,
  "MarketplaceBooking"
>;

type DayCell = {
  date: Date;
  iso: string;
  day: number;
  currentMonth: boolean;
};

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getMonthDays(month: Date): DayCell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDay = first.getDay();

  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - startDay,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );

    return {
      date,
      iso: toIsoDate(date),
      day: date.getDate(),
      currentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function normalizeProfile(value: unknown) {
  const root = value as Record<string, any> | null;
  const data =
    (root?.profile as Record<string, any> | null) ??
    (root?.data as Record<string, any> | null) ??
    root ??
    {};

  return {
    name:
      data.full_name ??
      data.name ??
      root?.full_name ??
      root?.name ??
      "",
    phone: data.phone ?? root?.phone ?? "",
    email: data.email ?? root?.email ?? "",
  };
}

export default function MarketplaceBookingScreen({
  navigation,
  route,
}: Props) {
  const { studioId, studioName } = route.params;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availabilityByDate, setAvailabilityByDate] =
    useState<Map<string, MarketplaceStudioAvailabilityDay>>(
      new Map(),
    );

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [eventType, setEventType] = useState("");
  const [venue, setVenue] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventTimePickerOpen, setEventTimePickerOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [specialRequestOpen, setSpecialRequestOpen] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingDates, setLoadingDates] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const response = await getClientProfile();
      const profile = normalizeProfile(response);

      setClientName(profile.name);
      setClientPhone(profile.phone);
      setClientEmail(profile.email);
    } catch (error) {
      console.warn("[MarketplaceBooking] profile load failed", error);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    try {
      setLoadingDates(true);

      const from = new Date(
        month.getFullYear(),
        month.getMonth(),
        1,
      );

      const to = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
      );

      const rows =
        await getMarketplaceStudioAvailability(
          studioId,
          toIsoDate(from),
          toIsoDate(to),
        );

      const next = new Map<
        string,
        MarketplaceStudioAvailabilityDay
      >();

      for (const row of rows) {
        if (row?.availability_date) {
          next.set(
            row.availability_date,
            row,
          );
        }
      }

      setAvailabilityByDate(next);
    } catch (error) {
      console.warn(
        "[MarketplaceBooking] availability load failed",
        error,
      );

      // Never treat an availability API failure as "full day available".
      setAvailabilityByDate(new Map());
    } finally {
      setLoadingDates(false);
    }
  }, [month, studioId]);
  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const days = useMemo(() => getMonthDays(month), [month]);

  const canSelectDate = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    return date >= today;
  };

  const selectedAvailability =
    selectedDate
      ? availabilityByDate.get(selectedDate)
      : undefined;

  const selectedDateStatus =
    loadingDates
      ? null
      : selectedAvailability?.availability_status ?? null;

  const selectedDateIsBooked =
    selectedDateStatus === "unavailable";

const selectedDateIsHalfDay =
    selectedDateStatus === "half_day";

  const submit = async () => {
    if (!selectedDate) {
      Alert.alert("Select date", "Please select your event date.");
      return;
    }

    if (!eventType.trim()) {
      Alert.alert("Event type", "Please enter your event type.");
      return;
    }

    if (!venue.trim()) {
      Alert.alert("Venue", "Please enter the event venue.");
      return;
    }

    if (selectedDateIsBooked && !specialRequestOpen) {
      Alert.alert(
        "Date unavailable",
        "This date is already booked. Please use Special Request if you want to ask the studio for this particular date.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await createMarketplaceBookingRequest({
        studio_id: studioId,
        requested_date: selectedDate,
        requested_start_time: eventTime.trim() || null,
        event_type: eventType.trim(),
        venue: venue.trim(),
        budget: budget.trim()
          ? Number(budget)
          : null,
        customer_message:
          specialRequestOpen && selectedDateIsBooked
            ? `Special request for unavailable date ${selectedDate}. ${message.trim() || "Please let me know if this date can be accommodated."}`
            : message.trim() || null,
      });

      Alert.alert(
        "Booking request sent",
        `Your request has been sent to ${studioName || "the studio"}.`,
        [
          {
            text: "Done",
            style: "cancel",
            onPress: () => navigation.goBack(),
          },
        ],
      );

      console.log("[MarketplaceBooking] created", result);
    } catch (error) {
      Alert.alert(
        "Booking request failed",
        error instanceof Error
          ? error.message
          : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={21} color="#0A3F61" />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Book Now</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {studioName || "Studio"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Details</Text>

          {loadingProfile ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>
                Loading your profile...
              </Text>
            </View>
          ) : (
            <>
              <Field
                label="Full Name"
                value={clientName}
                onChangeText={setClientName}
                placeholder="Your name"
              />

              <Field
                label="Phone"
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />

              <Field
                label="Email"
                value={clientEmail}
                onChangeText={setClientEmail}
                placeholder="Email address"
                keyboardType="email-address"
              />
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Event Date</Text>
              <Text style={styles.sectionHint}>
                Available dates can be selected.
              </Text>
            </View>

            {loadingDates && <ActivityIndicator size="small" />}
          </View>

          <View style={styles.calendar}>
            <View style={styles.calendarTop}>
              <Pressable
                onPress={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() - 1,
                      1,
                    ),
                  )
                }
                style={styles.monthButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color="#0A3F61"
                />
              </Pressable>

              <Text style={styles.monthTitle}>
                {monthLabel(month)}
              </Text>

              <Pressable
                onPress={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() + 1,
                      1,
                    ),
                  )
                }
                style={styles.monthButton}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#0A3F61"
                />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {["S", "M", "T", "W", "T", "F", "S"].map(
                (day, index) => (
                  <Text key={`${day}-${index}`} style={styles.weekDay}>
                    {day}
                  </Text>
                ),
              )}
            </View>

            <View style={styles.daysGrid}>
              {days.map((item) => {
                const selected = selectedDate === item.iso;

                const availability =
                  availabilityByDate.get(item.iso) ??
                  availabilityByDate.get(item.iso.slice(0, 10)) ??
                  Array.from(availabilityByDate.values()).find(
                    (row) =>
                      row?.availability_date?.slice(0, 10) ===
                      item.iso.slice(0, 10),
                  ) ??
                  null;

                const availabilityStatus =
                  availability?.availability_status ?? null;

                if (
                  item.iso === "2026-09-23" ||
                  item.iso === "2026-09-24"
                ) {
                  console.log(
                    "[MarketplaceCalendarCell]",
                    item.iso,
                    availabilityStatus,
                    availability,
                  );
                }

                const unavailable =
                  availabilityStatus === "unavailable";

                const halfDay =
                  availabilityStatus === "half_day";

                const available =
                  availabilityStatus === "available";

                const dayBackground =
                  unavailable
                    ? "#FEE2E2"
                    : halfDay
                      ? "#DBEAFE"
                      : available
                        ? "#DCFCE7"
                        : "#F8FAFC";

                const dayBorder =
                  unavailable
                    ? "#EF4444"
                    : halfDay
                      ? "#3B82F6"
                      : available
                        ? "#22C55E"
                        : "#E2E8F0";

                const dayTextColor =
                  unavailable
                    ? "#B91C1C"
                    : halfDay
                      ? "#1D4ED8"
                      : available
                        ? "#15803D"
                        : "#64748B";

                const pastDate =
                  new Date(`${item.iso}T00:00:00`) < today;

                return (
                  <Pressable
                    key={item.iso}
                    disabled={
                      !item.currentMonth ||
                      pastDate
                    }
                    onPress={() => {
                      if (pastDate) {
                        return;
                      }

                      setSelectedDate(item.iso);

                      if (!unavailable) {
                        setSpecialRequestOpen(false);
                      }
                    }}
                    style={[
                      styles.dayCell,
                      !item.currentMonth &&
                        styles.dayCellOutside,
                      {
                        backgroundColor: dayBackground,
                        borderColor: dayBorder,
                      },
                      pastDate && {
                        opacity: 0.35,
                      },
                      selected && styles.dayCellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !item.currentMonth &&
                          styles.dayTextOutside,
                        {
                          color: dayTextColor,
                        },
                        pastDate && {
                          color: "#9CA3AF",
                        },
                        selected &&
                          styles.dayTextSelected,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: "#16A34A" },
                  ]}
                />
                <Text style={styles.legendText}>
                  Available
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: "#2563EB" },
                  ]}
                />
                <Text style={styles.legendText}>
                  Half Day
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: "#DC2626" },
                  ]}
                />
                <Text style={styles.legendText}>
                  Booked
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: "#0A3F61" },
                  ]}
                />
                <Text style={styles.legendText}>
                  Selected
                </Text>
              </View>
            </View>
          </View>

          {selectedDate ? (
            <View style={styles.selectedDateBox}>
              <Ionicons
                name="calendar"
                size={18}
                color={
  selectedDateIsBooked
    ? "#DC2626"
    : selectedDateIsHalfDay
      ? "#2563EB"
      : "#168A5B"
}
              />

              <View style={styles.selectedDateCopy}>
                <Text
                  style={[
                    styles.selectedDateText,
                    selectedDateIsBooked
                      ? styles.selectedBookedText
                      : selectedDateIsHalfDay
                        ? styles.selectedHalfDayText
                        : styles.selectedAvailableText,
                  ]}
                >
                  Selected: {selectedDate}
                </Text>

                {selectedDateIsBooked ? (
                  <Text style={styles.unavailableText}>
                    This date is already booked.
                  </Text>
                ) : selectedDateIsHalfDay ? (
                  <Text style={styles.halfDayText}>
                    Half day available.
                  </Text>
                ) : (
                  <Text style={styles.availableText}>
                    Full day available.
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {selectedDateIsBooked ? (
            <View style={styles.specialRequestArea}>
              <Pressable
                onPress={() =>
                  setSpecialRequestOpen((current) => !current)
                }
                style={({ pressed }) => [
                  styles.specialRequestButton,
                  pressed && styles.specialRequestPressed,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color="#0A3F61"
                />

                <Text style={styles.specialRequestButtonText}>
                  Need this particular date?
                </Text>

                <Ionicons
                  name={
                    specialRequestOpen
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={18}
                  color="#0A3F61"
                />
              </Pressable>

              {specialRequestOpen ? (
                <View style={styles.specialRequestBox}>
                  <Text style={styles.specialRequestTitle}>
                    Special Request
                  </Text>

                  <Text style={styles.specialRequestHint}>
                    Tell the studio why you need this particular date.
                  </Text>

                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Example: This is our wedding date. Please let us know if you can accommodate us."
                    placeholderTextColor="#94A3B8"
                    multiline
                    textAlignVertical="top"
                    style={styles.specialRequestInput}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>

          <Field
            label="Event Type"
            value={eventType}
            onChangeText={setEventType}
            placeholder="Wedding, Birthday, Pre-wedding..."
          />

          <Field
            label="Venue"
            value={venue}
            onChangeText={setVenue}
            placeholder="Venue / location"
          />

          <View style={styles.field}>
            <Text style={styles.label}>Event Time</Text>

            <Pressable
              onPress={() =>
                setEventTimePickerOpen((current) => !current)
              }
              style={styles.simpleTimeButton}
            >
              <Ionicons
                name="time-outline"
                size={21}
                color="#0A3F61"
              />

              <Text
                style={[
                  styles.simpleTimeValue,
                  !eventTime && styles.simpleTimePlaceholder,
                ]}
              >
                {eventTime
                  ? (() => {
                      const [h, m] = eventTime
                        .split(":")
                        .map(Number);
                      const period = h >= 12 ? "PM" : "AM";
                      const hour = h % 12 || 12;

                      return `${String(hour).padStart(
                        2,
                        "0",
                      )}:${String(m).padStart(2, "0")} ${period}`;
                    })()
                  : "Select time"}
              </Text>

              <Ionicons
                name={
                  eventTimePickerOpen
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={18}
                color="#64748B"
              />
            </Pressable>

            {eventTimePickerOpen ? (
              <View style={styles.simpleTimePicker}>
                <TimeColumn
                  values={Array.from(
                    { length: 12 },
                    (_, index) => index + 1,
                  )}
                  selected={
                    eventTime
                      ? Number(eventTime.split(":")[0]) % 12 || 12
                      : 10
                  }
                  format={(value) =>
                    String(value).padStart(2, "0")
                  }
                  onSelect={(value) => {
                    const currentMinutes = eventTime
                      ? Number(eventTime.split(":")[1])
                      : 0;

                    const currentHours24 = eventTime
                      ? Number(eventTime.split(":")[0])
                      : 10;

                    const isPm = currentHours24 >= 12;
                    const hours24 = isPm
                      ? value === 12
                        ? 12
                        : value + 12
                      : value === 12
                        ? 0
                        : value;

                    setEventTime(
                      `${String(hours24).padStart(
                        2,
                        "0",
                      )}:${String(currentMinutes).padStart(
                        2,
                        "0",
                      )}`,
                    );
                    setEventTimePickerOpen(false);
                  }}
                />

                <Text style={styles.timeSeparator}>:</Text>

                <TimeColumn
                  values={Array.from(
                    { length: 60 },
                    (_, index) => index,
                  )}
                  selected={
                    eventTime
                      ? Number(eventTime.split(":")[1])
                      : 0
                  }
                  format={(value) =>
                    String(value).padStart(2, "0")
                  }
                  onSelect={(value) => {
                    const currentHours = eventTime
                      ? Number(eventTime.split(":")[0])
                      : 10;

                    setEventTime(
                      `${String(currentHours).padStart(
                        2,
                        "0",
                      )}:${String(value).padStart(2, "0")}`,
                    );
                    setEventTimePickerOpen(false);
                  }}
                />

                <View style={styles.amPmColumn}>
                  <Pressable
                    onPress={() => {
                      const [hours, minutes] = eventTime
                        ? eventTime.split(":").map(Number)
                        : [10, 0];

                      const hour12 = hours % 12 || 12;
                      const next =
                        `${String(hour12).padStart(2, "0")}:${String(
                          minutes,
                        ).padStart(2, "0")}`;

                      setEventTime(
                        hours >= 12
                          ? next
                          : `${String(
                              hour12 === 12 ? 12 : hour12,
                            ).padStart(2, "0")}:${String(
                              minutes,
                            ).padStart(2, "0")}`,
                      );
                    }}
                    style={[
                      styles.amPmButton,
                      eventTime &&
                        Number(eventTime.split(":")[0]) >=
                          12 &&
                        styles.amPmButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.amPmText,
                        eventTime &&
                          Number(eventTime.split(":")[0]) >=
                            12 &&
                          styles.amPmTextSelected,
                      ]}
                    >
                      PM
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const [hours, minutes] = eventTime
                        ? eventTime.split(":").map(Number)
                        : [10, 0];

                      const hour12 = hours % 12 || 12;

                      setEventTime(
                        `${String(
                          hour12 === 12 ? 0 : hour12,
                        ).padStart(2, "0")}:${String(
                          minutes,
                        ).padStart(2, "0")}`,
                      );
                    }}
                    style={[
                      styles.amPmButton,
                      (!eventTime ||
                        Number(eventTime.split(":")[0]) <
                          12) &&
                        styles.amPmButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.amPmText,
                        (!eventTime ||
                          Number(eventTime.split(":")[0]) <
                            12) &&
                          styles.amPmTextSelected,
                      ]}
                    >
                      AM
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          <Field
            label="Budget"
            value={budget}
            onChangeText={setBudget}
            placeholder="Approx. budget"
            keyboardType="numeric"
          />

          {!selectedDateIsBooked && (
            <Field
              label="Message"
              value={message}
              onChangeText={setMessage}
              placeholder="Tell the studio about your requirements..."
              multiline
            />
          )}
        </View>

        <View style={styles.contactCard}>
          <View style={styles.contactIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={21}
              color="#0A3F61"
            />
          </View>

          <View style={styles.contactCopy}>
            <Text style={styles.contactTitle}>
              Studio confirmation
            </Text>
            <Text style={styles.contactText}>
              The studio will review your request and confirm
              availability and commercial terms.
            </Text>
          </View>
        </View>

        <Pressable
          disabled={submitting}
          onPress={submit}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitPressed,
            submitting && styles.submitDisabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitText}>
                SEND BOOKING REQUEST
              </Text>
              <Ionicons
                name="arrow-forward"
                size={19}
                color="#fff"
              />
            </>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          Final commercial terms, confirmation and payment are handled
          with the studio after the booking request.
        </Text>
      </ScrollView>
    </View>
  );
}

function TimeColumn({
  values,
  selected,
  format,
  onSelect,
}: {
  values: number[];
  selected: number;
  format: (value: number) => string;
  onSelect: (value: number) => void;
}) {
  return (
    <ScrollView
      style={styles.timeColumn}
      contentContainerStyle={styles.timeColumnContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {values.map((value) => {
        const active = value === selected;

        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={[
              styles.timeOption,
              active && styles.timeOptionSelected,
            ]}
          >
            <Text
              style={[
                styles.timeOptionText,
                active && styles.timeOptionTextSelected,
              ]}
            >
              {format(value)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
      />
    </View>
  );
}

function LegendDot({
  type,
  label,
}: {
  type: "available" | "booked" | "selected";
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          type === "booked" && styles.legendBooked,
          type === "selected" && styles.legendSelected,
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F6FA",
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A3F61",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
  },
  content: {
    padding: 16,
    paddingBottom: 34,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8EDF3",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 5,
  },
  sectionHint: {
    fontSize: 12,
    color: "#64748B",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 10,
    color: "#64748B",
  },
  simpleTimeButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCE4EC",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },

  simpleTimeValue: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },

  simpleTimePlaceholder: {
    color: "#94A3B8",
    fontWeight: "500",
  },

  simpleTimePicker: {
    marginTop: 8,
    minHeight: 190,
    maxHeight: 190,
    borderWidth: 1,
    borderColor: "#DCE4EC",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },

  timeColumn: {
    flex: 1,
    maxHeight: 174,
  },

  timeColumnContent: {
    paddingVertical: 2,
  },

  timeOption: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    marginVertical: 2,
  },

  timeOptionSelected: {
    backgroundColor: "#EAF3F8",
  },

  timeOptionText: {
    fontSize: 14,
    color: "#64748B",
  },

  timeOptionTextSelected: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A3F61",
  },

  timeSeparator: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A3F61",
    paddingHorizontal: 2,
  },

  amPmColumn: {
    width: 58,
    marginLeft: 4,
  },

  amPmButton: {
    height: 48,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 3,
    backgroundColor: "#F8FAFC",
  },

  amPmButtonSelected: {
    backgroundColor: "#0A3F61",
  },

  amPmText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  amPmTextSelected: {
    color: "#FFFFFF",
  },

  field: {
    marginTop: 13,
  },
  timePickerButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCE4EC",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  timePickerButtonPressed: {
    opacity: 0.75,
  },
  timePickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3F8",
    marginRight: 10,
  },
  timePickerCopy: {
    flex: 1,
  },
  timePickerValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  timePickerPlaceholder: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  timePickerHint: {
    marginTop: 2,
    fontSize: 10,
    color: "#94A3B8",
  },





  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCE4EC",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#0F172A",
    backgroundColor: "#FBFCFE",
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 96,
    paddingTop: 13,
  },
  calendar: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginTop: 10,
  },
  calendarTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A3F61",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekDay: {
    width: "14.2857%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    paddingVertical: 7,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    maxHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  dayCellOutside: {
    opacity: 0.2,
  },
  dayCellBooked: {
    backgroundColor: "#FEE2E2",
  },
  dayCellSelected: {
    backgroundColor: "#0A3F61",
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  dayTextOutside: {
    color: "#94A3B8",
  },
  dayTextBooked: {
    color: "#DC2626",
    textDecorationLine: "line-through",
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 13,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
    marginRight: 5,
  },
  legendBooked: {
    backgroundColor: "#EF4444",
  },
  legendSelected: {
    backgroundColor: "#0A3F61",
  },
  legendText: {
    fontSize: 10,
    color: "#64748B",
  },
  selectedDateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 13,
    padding: 12,
    marginTop: 10,
  },
  selectedDateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0A3F61",
  },
  selectedDateCopy: {
    flex: 1,
    marginLeft: 8,
  },
  selectedBookedText: {
    color: "#DC2626",
  },
  availableText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "#168A5B",
  },
  halfDayText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "#2563EB",
  },
  selectedAvailableText: {
    color: "#168A5B",
  },
  selectedHalfDayText: {
    color: "#2563EB",
  },
  unavailableText: {
    marginTop: 2,
    fontSize: 11,
    color: "#DC2626",
  },
  specialRequestArea: {
    marginTop: 10,
  },
  specialRequestButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFD2E0",
    backgroundColor: "#F4F9FC",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  specialRequestPressed: {
    transform: [{ scale: 0.985 }],
  },
  specialRequestButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#0A3F61",
  },
  specialRequestBox: {
    marginTop: 10,
    padding: 13,
    borderRadius: 15,
    backgroundColor: "#FFF8ED",
    borderWidth: 1,
    borderColor: "#F4D9A8",
  },
  specialRequestTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  specialRequestHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
  },
  specialRequestInput: {
    marginTop: 10,
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2D5C1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 11,
    fontSize: 13,
    color: "#0F172A",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF7FA",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  contactCopy: {
    flex: 1,
    marginLeft: 11,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0A3F61",
  },
  contactText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: "#0A3F61",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitPressed: {
    transform: [{ scale: 0.985 }],
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#FFFFFF",
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: "#94A3B8",
    marginTop: 12,
    paddingHorizontal: 12,
  },
});
