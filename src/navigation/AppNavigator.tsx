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
import {
  ClientLegalAcceptanceScreen,
} from "../features/legal/ClientLegalAcceptanceScreen";

import {
  getClientLegalComplianceStatus,
} from "../services/legal/legal-compliance.service";

import {
  detectEventFromUrlOrDeepLink,
} from "../services/event-gallery/event-qr-detector";

import {
  completeClientStudioConnection,
} from "../services/client/client-studio-flow.service";

import { colors } from "../theme/colors";
import { useAuth } from "../services/auth/auth-context";
import LoginScreen from "../screens/auth/LoginScreen";

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

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [legalCompliant, setLegalCompliant] = useState<boolean | null>(null);

  const checkCompliance = useCallback(async () => {
    try {
      // 1. Detect any event/gallery QR parameters from URL or deep link
      void detectEventFromUrlOrDeepLink();

      // 2. Check local/remote legal compliance
      const res = await getClientLegalComplianceStatus();
      setLegalCompliant(res.compliant);
    } catch (err) {
      console.log("[AppNavigator] Compliance check fallback:", err);
      setLegalCompliant(false);
    }
  }, []);

  useEffect(() => {
    void checkCompliance();
  }, [checkCompliance]);

  if (authLoading || (user && legalCompliant === null)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  // 1. If not authenticated, show the Google & OTP Login Screen
  if (!user) {
    return (
      <LoginScreen
        onSuccess={() => {
          void checkCompliance();
        }}
      />
    );
  }

  // 2. After login/OTP, if legal agreement has not been accepted yet, require strict acceptance
  if (!legalCompliant) {
    return (
      <ClientLegalAcceptanceScreen
        onAccepted={() => {
          setLegalCompliant(true);
        }}
      />
    );
  }

  // 3. Once authenticated and legally compliant, enter the premium Home experience
  return <AuthenticatedNavigator />;
}
