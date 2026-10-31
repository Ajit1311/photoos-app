import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  View,
} from "react-native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import MainTabNavigator from "./MainTabNavigator";

import SelfiePreviewScreen from "../screens/camera/SelfiePreviewScreen";
import FaceMatchResultsScreen from "../screens/camera/FaceMatchResultsScreen";
import ConversationScreen from "../screens/chat/ConversationScreen";
import LanguageScreen from "../screens/profile/LanguageScreen";
import AppearanceScreen from "../screens/profile/AppearanceScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import ClientBookingsScreen from "../screens/client/ClientBookingsScreen";
import ClientBookingReviewScreen from "../screens/client/ClientBookingReviewScreen";
import ClientAlbumsScreen from "../screens/client/ClientAlbumsScreen";
import ClientPaymentsScreen from "../screens/client/ClientPaymentsScreen";
import FavoriteStudiosScreen from "../screens/client/FavoriteStudiosScreen";
import LoginScreen from "../screens/auth/LoginScreen";

import { EmailOtpScreen } from "../features/auth/EmailOtpScreen";
import {
  ClientLegalAcceptanceScreen,
} from "../features/legal/ClientLegalAcceptanceScreen";

import { useAuth } from "../services/auth/auth-context";

import {
  getClientLegalComplianceStatus,
} from "../services/legal/legal-compliance.service";

import {
  completeClientStudioConnection,
} from "../services/client/client-studio-flow.service";

import { colors } from "../theme/colors";

import type {
  RootStackParamList,
} from "./navigation-types";

const Stack =
  createNativeStackNavigator<
    RootStackParamList
  >();

function AuthenticatedNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
      />

      <Stack.Screen
        name="SelfiePreview"
        component={SelfiePreviewScreen}
      />

      <Stack.Screen
        name="FaceMatchResults"
        component={FaceMatchResultsScreen}
      />

      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
      />

      <Stack.Screen
        name="Language"
        component={LanguageScreen}
      />

      <Stack.Screen
        name="Appearance"
        component={AppearanceScreen}
      />

      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />

      <Stack.Screen
        name="Bookings"
        component={ClientBookingsScreen}
      />

      <Stack.Screen
        name="ClientBookingReview"
        component={ClientBookingReviewScreen}
      />

      <Stack.Screen
        name="Albums"
        component={ClientAlbumsScreen}
      />

      <Stack.Screen
        name="Payments"
        component={ClientPaymentsScreen}
      />
      <Stack.Screen
        name="FavoriteStudios"
        component={FavoriteStudiosScreen}
      />
    </Stack.Navigator>
  );
}

type GateState =
  | "loading"
  | "otp"
  | "legal"
  | "connecting"
  | "ready"
  | "error";

function ClientAuthGate() {
  const {
    user,
    emailOtpVerified,
    pendingOtpEmail,
    pendingStudioToken,
    setPendingStudioToken,
  } = useAuth();

  const [state, setState] =
    useState<GateState>("loading");

  const [error, setError] =
    useState<string | null>(null);

  const checkGate =
    useCallback(async () => {
      if (!user) {
        setState("loading");
        return;
      }

      try {
        setError(null);

        /*
         * STEP 1 — Email OTP
         */
        if (!emailOtpVerified) {
          setState("otp");
          return;
        }

        /*
         * STEP 2 — Standalone client legal compliance
         */
        setState("loading");

        const compliance =
          await getClientLegalComplianceStatus();

        if (!compliance.compliant) {
          setState("legal");
          return;
        }

        /*
         * STEP 3 — Redeem QR studio connection
         *
         * QR token is intentionally held through the
         * authentication and legal gates.
         */
        if (pendingStudioToken) {
          setState("connecting");

          await completeClientStudioConnection(
            pendingStudioToken,
          );

          setPendingStudioToken(null);
        }

        /*
         * STEP 4 — Client app ready
         */
        setState("ready");
      } catch (gateError) {
        console.error(
          "[ClientAuthGate]",
          gateError,
        );

        setError(
          gateError instanceof Error
            ? gateError.message
            : "Unable to continue.",
        );

        setState("error");
      }
    }, [
      user,
      emailOtpVerified,
      pendingStudioToken,
      setPendingStudioToken,
    ]);

  useEffect(() => {
    void checkGate();
  }, [checkGate]);

  if (!user) {
    return null;
  }

  if (state === "otp") {
    if (!pendingOtpEmail) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor:
              colors.background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
        </View>
      );
    }

    return (
      <EmailOtpScreen
        email={pendingOtpEmail}
        onVerified={() => {
          void checkGate();
        }}
        onBack={() => {
          /*
           * Login remains the Firebase session owner.
           * User can sign out from the auth layer if needed.
           */
        }}
      />
    );
  }

  if (state === "legal") {
    return (
      <ClientLegalAcceptanceScreen
        onAccepted={() => {
          void checkGate();
        }}
      />
    );
  }

  if (state === "connecting") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor:
            colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <View
          style={{
            marginTop: 16,
          }}
        >
          {/* Intentionally minimal; no new screen required. */}
        </View>
      </View>
    );
  }

  if (state === "error") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor:
            colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor:
              colors.surface,
            borderRadius: 22,
            padding: 24,
          }}
        >
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <View
            style={{
              marginTop: 18,
            }}
          />

          {error ? null : null}
        </View>
      </View>
    );
  }

  if (state === "ready") {
    return (
      <AuthenticatedNavigator />
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          colors.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator
        size="small"
        color={colors.primary}
      />
    </View>
  );
}

export default function AppNavigator() {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor:
            colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          size="small"
          color={colors.primary}
        />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
      </Stack.Navigator>
    );
  }

  return <ClientAuthGate />;
}
