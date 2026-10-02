import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DrawerActions, useIsFocused, useNavigation } from "@react-navigation/native";
import {
  MapPin,
  Bell,
  Ticket,
  Calendar,
  Heart,
  User,
  ArrowRight,
  ChevronRight,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { authClient } from "../api/auth";
import COLORS from "../utils/COLORS";

const BUS_IMAGE =
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900&q=80";

const FALLBACK_ROUTES = [
  {
    id: "bamako-sikasso",
    from: "Bamako",
    to: "Sikasso",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
  },
  {
    id: "bamako-kayes",
    from: "Bamako",
    to: "Kayes",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  },
  {
    id: "bamako-segou",
    from: "Bamako",
    to: "Ségou",
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  },
];

function normalizePopular(rows) {
  return (Array.isArray(rows) ? rows : []).map((r, index) => ({
    ...r,
    id: r?.id ?? `route-${index}`,
    from: r?.from || r?.villeDepart?.nom || "Départ",
    to: r?.to || r?.villeArrivee?.nom || "Arrivée",
    departureId: r?.ville_depart_id ?? r?.departureId ?? null,
    destinationId: r?.ville_arrivee_id ?? r?.arrivalId ?? null,
    image: r?.image || FALLBACK_ROUTES[index % FALLBACK_ROUTES.length].image,
  }));
}

export default function Accueil() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [routes, setRoutes] = useState(FALLBACK_ROUTES);
  const [activeDot, setActiveDot] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.prenom?.trim() || "";
  const initials = `${user?.prenom?.[0] || ""}${user?.nom?.[0] || ""}`.toUpperCase() || "D";

  const loadRoutes = useCallback(async () => {
    try {
      const params = { limit: 8 };
      if (user?.id != null) params.user_id = user.id;
      try {
        const { data } = await authClient.get("/api/routes/popular", { params });
        const list = normalizePopular(data);
        if (list.length) setRoutes(list);
      } catch {
        const { data: modelesData } = await authClient.get("/api/trajet-modeles");
        const modeles = Array.isArray(modelesData?.trajetModeles) ? modelesData.trajetModeles : [];
        const list = normalizePopular(
          modeles.slice(0, 8).map((m) => ({
            id: m?.id,
            from: m?.villeDepart?.nom,
            to: m?.villeArrivee?.nom,
            ville_depart_id: m?.ville_depart_id,
            ville_arrivee_id: m?.ville_arrivee_id,
          })),
        );
        if (list.length) setRoutes(list);
      }
    } catch {
      /* les destinations de démonstration restent affichées */
    }
  }, [user?.id]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRoutes();
    } finally {
      setRefreshing(false);
    }
  }, [loadRoutes]);

  const openSearch = (route) => {
    navigation.navigate("RechercheTrajet", route
      ? {
          from: route.from,
          to: route.to,
          departureId: route.departureId ?? route.ville_depart_id ?? null,
          destinationId: route.destinationId ?? route.ville_arrivee_id ?? null,
        }
      : undefined);
  };

  const shortcuts = [
    { label: "Réserver un billet", Icon: Ticket, onPress: () => openSearch() },
    { label: "Mes réservations", Icon: Calendar, onPress: () => navigation.navigate("Tickets") },
    { label: "Mes favoris", Icon: Heart, onPress: () => navigation.navigate("Compagnies") },
    { label: "Profil", Icon: User, onPress: () => navigation.navigate("Profile") },
  ];

  return (
    <View style={styles.root}>
      {isFocused ? (
        <StatusBar style="light" translucent backgroundColor="transparent" />
      ) : null}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.pinButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le menu"
        >
          <MapPin size={18} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.greeting}>
          <Text style={styles.hello}>Bonjour{firstName ? `, ${firstName}` : ","}</Text>
          <Text style={styles.welcome}>
            Bienvenue sur DeegiTrans <Text style={styles.wave}>👋</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bell}
          onPress={() => navigation.navigate("Notifications")}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Bell size={18} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate("Profile")}
          accessibilityRole="button"
          accessibilityLabel="Profil"
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.white}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Réservez vos billets{"\n"}de transport{"\n"}en toute simplicité</Text>
            <TouchableOpacity style={styles.heroCta} onPress={() => openSearch()} activeOpacity={0.88}>
              <Text style={styles.heroCtaText}>Rechercher un trajet</Text>
              <ArrowRight size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Image source={{ uri: BUS_IMAGE }} style={styles.heroBus} />
        </View>

        <View style={styles.grid}>
          {shortcuts.map(({ label, Icon, onPress }) => (
            <TouchableOpacity key={label} style={styles.shortcut} onPress={onPress} activeOpacity={0.85}>
              <View style={styles.shortcutIcon}>
                <Icon size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.shortcutLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Destinations populaires</Text>
          <TouchableOpacity onPress={() => openSearch()} style={styles.seeAll}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <ChevronRight size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.destList}
          onScroll={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / 188);
            setActiveDot(Math.min(Math.max(index, 0), routes.length - 1));
          }}
          scrollEventThrottle={16}
        >
          {routes.map((route) => (
            <TouchableOpacity
              key={String(route.id)}
              style={styles.destCard}
              activeOpacity={0.9}
              onPress={() => openSearch(route)}
            >
              <Image source={{ uri: route.image }} style={styles.destImage} />
              <View style={styles.destBody}>
                <Text style={styles.destFrom}>{route.from}</Text>
                <View style={styles.destToRow}>
                  <Text style={styles.destTo}>{route.to}</Text>
                  <ArrowRight size={14} color={COLORS.muted} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {routes.slice(0, 5).map((route, index) => (
            <View
              key={String(route.id)}
              style={[styles.dot, index === activeDot && styles.dotOn]}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 28,
    backgroundColor: COLORS.primary,
  },
  pinButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  greeting: {
    flex: 1,
  },
  hello: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: "600",
  },
  welcome: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 1,
  },
  wave: {
    fontSize: 14,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 28,
  },
  hero: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    minHeight: 168,
    overflow: "hidden",
    marginBottom: 16,
  },
  heroCopy: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    zIndex: 1,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  heroCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  heroCtaText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  heroBus: {
    width: 150,
    height: "100%",
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  shortcut: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    minHeight: 108,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  shortcutLabel: {
    color: COLORS.textStrong,
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textStrong,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  destList: {
    gap: 12,
    paddingRight: 4,
  },
  destCard: {
    width: 176,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  destImage: {
    width: "100%",
    height: 112,
    backgroundColor: COLORS.bgSoft,
  },
  destBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  destFrom: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textStrong,
  },
  destToRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  destTo: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotOn: {
    width: 16,
    backgroundColor: COLORS.primary,
  },
});
