import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from 'expo-status-bar';
import React from "react";
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";


import DrawerNav from "./src/navigation/DrawerNav";
import VilleRecherche from "./src/services/VilleRecherche";
import Notifications from "./src/services/Notifications";
import Toast from "react-native-toast-message";
import Compagnies from "./src/services/Compagnies"; 
import CompagnieProfile from "./src/services/CompagneProfile";
import ListeTrajets from "./src/services/ListeTrajets";
import RechercheTrajet from "./src/services/RechercheTrajet";
import Reservation from "./src/screens/Reservation";
import PaymentScreen from "./src/screens/PaymentScreen";
import Login from "./src/auths/Login";
import Register from "./src/auths/Register";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import COLORS from "./src/utils/COLORS";

const Stack = createNativeStackNavigator();

function focusedRouteName(state) {
  if (!state?.routes?.length) return "";
  const route = state.routes[state.index ?? 0];
  if (route?.state) return focusedRouteName(route.state);
  return route?.name || "";
}

function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [routeName, setRouteName] = React.useState(isAuthenticated ? "Accueil" : "Login");
  const homeStatus = routeName === "Accueil";
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgSoft }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const MainApp = DrawerNav;

  return (
    <NavigationContainer
      onStateChange={(state) => setRouteName(focusedRouteName(state))}
    >
      <View
        style={{
          flex: 1,
          paddingTop: homeStatus ? 0 : insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: homeStatus ? COLORS.primary : COLORS.background,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator initialRouteName="AppRoot">
            <Stack.Screen name="AppRoot" component={MainApp} options={{ headerShown: false }} />
            <Stack.Screen name="VilleRecherche" component={VilleRecherche} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={Notifications} options={{ headerShown: false }} />
            <Stack.Screen name="Compagnies" component={Compagnies} options={{ headerShown: false }} />
            <Stack.Screen name="CompagnieProfile" component={CompagnieProfile} options={{ headerShown: false }} />
            <Stack.Screen name="RechercheTrajet" component={RechercheTrajet} options={{ headerShown: false }} />
            <Stack.Screen name="ListeTrajets" component={ListeTrajets} options={{ headerShown: false }} />
            <Stack.Screen name="Reservation" component={Reservation} options={{ headerShown: false }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        )}
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

