// src/navigation/AgentBottomTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "../utils/COLORS";
import DashboardAgent from "../services/agents/DashboardAgent";
import EnregistrementColis from "../services/agents/EnregistrementColis";
import ScanBillet from "../services/agents/ScanBillet";
import SuiviColis from "../services/agents/SuiviColis";
import ProfileAgent from "../services/agents/ProfileAgent";

const Tabs = createBottomTabNavigator();

const iconByRoute = {
  Dashboard: "dashboard",
  Enregistrer: "add-box",
  Scanner: "qr-code-scanner",
  Suivi: "track-changes",
  Profil: "person",
};

const labelByRoute = {
  Dashboard: "Accueil",
  Enregistrer: "Enregistrer",
  Scanner: "Scanner",
  Suivi: "Suivi",
  Profil: "Profil",
};

export default function AgentBottomTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons
            name={iconByRoute[route.name] || "circle"}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted || "#999",
        tabBarStyle: {
          backgroundColor: COLORS.white,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          borderTopWidth: 1,
          borderTopColor: COLORS.border || "#E0E0E0",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      })}
    >
      <Tabs.Screen
        name="Dashboard"
        component={DashboardAgent}
        options={{ tabBarLabel: labelByRoute.Dashboard }}
      />
      <Tabs.Screen
        name="Enregistrer"
        component={EnregistrementColis}
        options={{ tabBarLabel: labelByRoute.Enregistrer }}
      />
      <Tabs.Screen
        name="Scanner"
        component={ScanBillet}
        options={{ tabBarLabel: labelByRoute.Scanner }}
      />
      <Tabs.Screen
        name="Suivi"
        component={SuiviColis}
        options={{ tabBarLabel: labelByRoute.Suivi }}
      />
      <Tabs.Screen
        name="Profil"
        component={ProfileAgent}
        options={{ tabBarLabel: labelByRoute.Profil }}
      />
    </Tabs.Navigator>
  );
}