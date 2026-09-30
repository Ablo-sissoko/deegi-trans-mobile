import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import {
  Bell,
  Bus,
  Calculator,
  Calendar,
  ClipboardList,
  Clock,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  PackageSearch,
  QrCode,
  Ticket,
  User,
  Activity,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import COLORS from "../utils/COLORS";

const CLIENT_SECTIONS = [
  {
    title: "Voyage",
    items: [
      { label: "Accueil", icon: Home, tab: "Accueil" },
      { label: "Billets", icon: Ticket, tab: "Tickets" },
      { label: "Colis", icon: Package, tab: "Colis" },
      { label: "Compagnies", icon: Bus, tab: "Compagnies" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Horaires populaires", icon: Clock, screen: "HorairesPopulaires" },
      { label: "Prochains trajets", icon: Calendar, screen: "ProchainsTrajets" },
      { label: "Suivi colis", icon: PackageSearch, screen: "SuiviColisCode" },
      { label: "Calculateur tarif", icon: Calculator, screen: "CalculateurTarif" },
      { label: "Assistance voyage", icon: HelpCircle, screen: "AssistanceTransport" },
    ],
  },
  {
    title: "Compte",
    items: [
      { label: "Profil", icon: User, tab: "Profile" },
      { label: "Notifications", icon: Bell, stack: "Notifications" },
      { label: "Déconnexion", icon: LogOut, action: "logout" },
    ],
  },
];

const AGENT_SECTIONS = [
  {
    title: "Gare",
    items: [
      { label: "Tableau de bord", icon: LayoutDashboard, tab: "Dashboard" },
      { label: "Opérations du jour", icon: Activity, screen: "OperationsDuJour" },
      { label: "Plan d'embarquement", icon: ClipboardList, screen: "PlanEmbarquement" },
      { label: "Enregistrer un colis", icon: Package, tab: "Enregistrer" },
      { label: "Scanner un billet", icon: QrCode, tab: "Scanner" },
      { label: "Suivi colis", icon: PackageSearch, tab: "Suivi" },
      { label: "Assistance", icon: HelpCircle, screen: "AssistanceTransport" },
    ],
  },
  {
    title: "Compte",
    items: [
      { label: "Profil", icon: User, tab: "Profil" },
      { label: "Notifications", icon: Bell, stack: "Notifications" },
      { label: "Déconnexion", icon: LogOut, action: "logout" },
    ],
  },
];

function roleLabel(role) {
  if (role === "CLIENT") return "Client";
  if (role === "AGENT") return "Agent";
  return role || "Utilisateur";
}

function getActiveRouteName(state) {
  if (!state?.routes?.length) return "";
  const route = state.routes[state.index];
  return getFocusedRouteNameFromRoute(route) ?? route.name;
}

function itemRouteName(item) {
  return item.screen || item.tab || item.stack || item.action || item.label;
}

export default function DrawerContent(props) {
  const { navigation, state } = props;
  const { user, role, signOut } = useAuth();
  const sections = role === "CLIENT" ? CLIENT_SECTIONS : AGENT_SECTIONS;
  const activeRouteName = getActiveRouteName(state);
  const displayName = [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Utilisateur";

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel", onPress: () => navigation.closeDrawer() },
      {
        text: "Déconnecter",
        style: "destructive",
        onPress: async () => {
          navigation.closeDrawer();
          await signOut();
          Toast.show({ type: "success", text1: "Déconnecté" });
        },
      },
    ]);
  };

  const onItemPress = (item) => {
    if (item.action === "logout") {
      handleLogout();
      return;
    }
    if (item.stack) {
      navigation.getParent()?.navigate(item.stack);
    } else if (item.tab) {
      navigation.navigate("MainTabs", { screen: item.tab });
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
    navigation.closeDrawer();
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>DEEGITRANS</Text>
        <Text style={styles.brandSub}>Tickets & voyages</Text>
        <Text style={styles.userName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.role}>{roleLabel(role)}</Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item) => {
            const routeName = itemRouteName(item);
            const isLogout = item.action === "logout";
            const isActive = !isLogout && activeRouteName === routeName;
            const Icon = item.icon;
            const color = isLogout ? COLORS.error : isActive ? COLORS.primary : COLORS.text;

            return (
              <Pressable
                key={routeName}
                onPress={() => onItemPress(item)}
                style={[
                  styles.item,
                  isActive ? styles.itemActive : null,
                  isLogout ? styles.itemLogout : null,
                ]}
              >
                <Icon size={18} color={color} />
                <Text style={[styles.itemLabel, { color }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  header: {
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: COLORS.primary,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  userName: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textStrong,
  },
  role: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.mutedStrong,
    marginBottom: 8,
    marginLeft: 16,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemActive: {
    backgroundColor: COLORS.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  itemLogout: {
    marginTop: 8,
    borderColor: COLORS.errorSoft,
    backgroundColor: COLORS.errorSoft,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
