import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useAuth } from "../context/AuthContext";
import DrawerContent from "../components/DrawerContent";
import BottomTabs from "./Bottomtabs";
import AgentBottomTabs from "./AgentBottomTabs";
import HorairesPopulaires from "../screens/transport/HorairesPopulaires";
import ProchainsTrajets from "../screens/transport/ProchainsTrajets";
import SuiviColisCode from "../screens/transport/SuiviColisCode";
import CalculateurTarif from "../screens/transport/CalculateurTarif";
import AssistanceTransport from "../screens/transport/AssistanceTransport";
import OperationsDuJour from "../screens/transport/OperationsDuJour";
import PlanEmbarquement from "../screens/transport/PlanEmbarquement";
import COLORS from "../utils/COLORS";

const Drawer = createDrawerNavigator();

const TRANSPORT_SCREENS = {
  HorairesPopulaires,
  ProchainsTrajets,
  SuiviColisCode,
  CalculateurTarif,
  AssistanceTransport,
  OperationsDuJour,
  PlanEmbarquement,
};

export default function DrawerNav() {
  const { role } = useAuth();
  const TabsComponent = role === "CLIENT" ? BottomTabs : AgentBottomTabs;

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: {
          backgroundColor: COLORS.white,
          width: "75%",
          borderRightWidth: 1,
          borderRightColor: COLORS.borderLight,
        },
        sceneStyle: { backgroundColor: COLORS.background },
        swipeEnabled: true,
        overlayColor: COLORS.overlayLight,
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="MainTabs" component={TabsComponent} />
      {Object.entries(TRANSPORT_SCREENS).map(([name, Screen]) => (
        <Drawer.Screen key={name} name={name} component={Screen} />
      ))}
    </Drawer.Navigator>
  );
}
