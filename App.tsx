import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import AppNavigator from "./src/navigation/AppNavigator";
import { AppSettingsProvider } from "./src/context/AppSettingsContext";
import { AuthProvider } from "./src/services/auth/auth-context";

export default function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>

        <StatusBar style="auto" />
      </AppSettingsProvider>
    </AuthProvider>
  );
}
