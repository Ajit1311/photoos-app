import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MarketplaceScreen from "../screens/marketplace/MarketplaceScreen";
import MarketplaceFiltersScreen from "../screens/marketplace/MarketplaceFiltersScreen";
import StudioDetailsScreen from "../screens/marketplace/StudioDetailsScreen";
import MarketplaceBookingScreen from "../screens/marketplace/MarketplaceBookingScreen";

export type MarketplaceStackParamList = {
  MarketplaceHome: {
    filters?: {
      location?: string;
      area?: string;
      priceRange?: string;
      rating?: string;
      services?: string[];
    };
  } | undefined;

  StudioDetails: {
    studioId?: string;
    studioName?: string;
  };

  MarketplaceBooking: {
    studioId: string;
    studioName?: string;
  };

  MarketplaceFilters: undefined;
};

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

export default function MarketplaceNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="MarketplaceHome"
        component={MarketplaceScreen}
      />


      <Stack.Screen
        name="StudioDetails"
        component={StudioDetailsScreen}
      />

      <Stack.Screen
        name="MarketplaceBooking"
        component={MarketplaceBookingScreen}
      />

      <Stack.Screen
        name="MarketplaceFilters"
        component={MarketplaceFiltersScreen}
      />
    </Stack.Navigator>
  );
}
