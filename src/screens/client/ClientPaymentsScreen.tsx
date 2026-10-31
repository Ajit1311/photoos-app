import React, { useCallback, useMemo, useState } from "react";
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
  getClientPayments,
  type ClientPayment,
} from "../../services/client-app/client-app.service";

export default function ClientPaymentsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await getClientPayments();
      setPayments(response.payments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payments.");
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

  const totalPaid = useMemo(
    () =>
      payments.reduce(
        (sum, payment) =>
          sum + Number(payment.total_amount ?? payment.amount ?? 0),
        0,
      ),
    [payments],
  );

  const currency = payments.find((item) => item.currency)?.currency || "INR";

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
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>Your payment history</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Unable to load payments</Text>
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
          {payments.length > 0 && (
            <View style={styles.summary}>
              <View style={styles.summaryIcon}>
                <Ionicons name="card-outline" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Total recorded payments</Text>
                <Text style={styles.summaryAmount}>
                  {currency} {totalPaid.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          )}

          {payments.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="card-outline"
                size={50}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyText}>
                Your payment records will appear here.
              </Text>
            </View>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.paymentIcon}>
                    <Ionicons
                      name="receipt-outline"
                      size={23}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.details}>
                    <Text style={styles.paymentTitle}>
                      {payment.payment_number ||
                        payment.payment_type ||
                        "Payment"}
                    </Text>

                    {!!payment.payment_date && (
                      <Text style={styles.date}>
                        {new Date(payment.payment_date).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.amount}>
                    {payment.currency || "INR"}{" "}
                    {Number(
                      payment.total_amount ?? payment.amount ?? 0,
                    ).toLocaleString("en-IN")}
                  </Text>
                </View>

                <View style={styles.footer}>
                  <Text style={styles.method}>
                    {payment.method ||
                      payment.payment_mode ||
                      payment.payment_type ||
                      "Payment"}
                  </Text>

                  <Text style={styles.status}>
                    {payment.status || "Recorded"}
                  </Text>
                </View>
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
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 17,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 2,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryAmount: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "12",
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  method: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  status: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "capitalize",
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
