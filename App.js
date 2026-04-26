import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";


import BottomTabs from './src/navigation/Bottomtabs';
import AgentBottomTabs from "./src/navigation/AgentBottomTabs";
import VilleRecherche from "./src/services/VilleRecherche";
import Notifications from "./src/services/Notifications";
import Toast from "react-native-toast-message";
import Compagnies from "./src/services/Compagnies";
import CompagnieProfile from "./src/services/CompagneProfile";
import ListeTrajets from "./src/services/ListeTrajets";
import PaymentScreen from "./src/screens/PaymentScreen";
import Login from "./src/auths/Login";
import Register from "./src/auths/Register";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import COLORS from "./src/utils/COLORS";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { loading, isAuthenticated, role } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgSoft }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const TabsComponent = role == "CLIENT" ? BottomTabs : AgentBottomTabs;

  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1 }}>
        {!isAuthenticated ? (
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator initialRouteName="MainTabs">
            <Stack.Screen name="MainTabs" component={TabsComponent} options={{ headerShown: false }} />
            <Stack.Screen name="VilleRecherche" component={VilleRecherche} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={Notifications} options={{ headerShown: false }} />
            <Stack.Screen name="Compagnies" component={Compagnies} options={{ headerShown: false }} />
            <Stack.Screen name="CompagnieProfile" component={CompagnieProfile} options={{ headerShown: false }} />
            <Stack.Screen name="ListeTrajets" component={ListeTrajets} options={{ headerShown: false }} />
            <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
          </Stack.Navigator>
        )}
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="tra" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}

