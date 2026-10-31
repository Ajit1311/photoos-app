import { Image } from "react-native";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/home/HomeScreen";
import MarketplaceNavigator from "./MarketplaceNavigator";
import CameraScreen from "../screens/camera/CameraScreen";
import ChatScreen from "../screens/chat/ChatScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

import { useAppSettings } from "../context/AppSettingsContext";
import type { MainTabParamList } from "./navigation-types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const icons: Record<
  keyof MainTabParamList,
  { active: IconName; inactive: IconName }
> = {
  Home: {
    active: "home",
    inactive: "home-outline",
  },
  Marketplace: {
    active: "compass",
    inactive: "compass-outline",
  },
  Camera: {
    active: "camera",
    inactive: "camera-outline",
  },
  Chat: {
    active: "chatbubble-ellipses",
    inactive: "chatbubble-ellipses-outline",
  },
  Profile: {
    active: "person",
    inactive: "person-outline",
  },
};

function TabIcon({
  route,
  focused,
  primaryColor,
  mutedColor,
  surfaceColor,
}: {
  route: keyof MainTabParamList;
  focused: boolean;
  primaryColor: string;
  mutedColor: string;
  surfaceColor: string;
}) {
  if (route === "Camera") {
    return (
      <View style={styles.cameraButtonWrap}>
        <View
          style={[
            styles.cameraButton,
            {
              backgroundColor: primaryColor,
              borderColor: surfaceColor,
            },
            focused && styles.cameraButtonFocused,
          ]}
        >
          <Image
            source={require("../../assets/PhotoOS-navigation-logo.png")}
            style={[
              styles.cameraBrandLogo,
              focused && styles.cameraBrandLogoFocused,
            ]}
          />
        </View>
      </View>
    );
  }

  const icon = focused ? icons[route].active : icons[route].inactive;

  return (
    <View style={styles.tabIconWrap}>
      <View
        style={[
          styles.iconPill,
          focused && { backgroundColor: `${primaryColor}15` },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={focused ? primaryColor : mutedColor}
        />
      </View>
      {focused && (
        <View
          style={[
            styles.activeDot,
            { backgroundColor: primaryColor },
          ]}
        />
      )}
    </View>
  );
}

export default function MainTabNavigator() {
  const { theme } = useAppSettings();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused }) => (
          <TabIcon
            route={route.name as keyof MainTabParamList}
            focused={focused}
            primaryColor={theme.primary}
            mutedColor={theme.textMuted}
            surfaceColor={theme.surface}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
        }}
      />

      <Tab.Screen
        name="Marketplace"
        component={MarketplaceNavigator}
        options={{
          tabBarLabel: "Explore",
        }}
      />

      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarLabel: "",
        }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: "Messages",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: Platform.OS === "ios" ? 22 : 16,
    height: 72,
    borderTopWidth: 1,
    borderWidth: 1,
    borderRadius: 36,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },

  tabBarItem: {
    height: 56,
    borderRadius: 20,
    marginHorizontal: 1,
    paddingTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },

  tabBarLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
    marginTop: 2,
  },

  tabIconWrap: {
    width: 44,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  iconPill: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  activeDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  cameraButtonWrap: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
  },

  cameraBrandLogo: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },

  cameraBrandLogoFocused: {
    transform: [{ scale: 1.06 }],
  },

  cameraButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 7,
  },

  cameraButtonFocused: {
    transform: [{ scale: 1.05 }],
  },
});
