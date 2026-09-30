import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MapPin, ArrowRight, Clock, Banknote } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import ScreenShell from "../../components/ScreenShell";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

function formatRoute(item) {
  const from =
    item.from ||
    item.ville_depart?.nom ||
    item.villeDepart?.nom ||
    item.depart ||
    "Départ";
  const to =
    item.to ||
    item.ville_arrivee?.nom ||
    item.villeArrivee?.nom ||
    item.arrivee ||
    "Arrivée";
  return {
    from,
    to,
    departureId: item.departureId ?? item.ville_depart_id ?? item.villeDepart?.id,
    arrivalId: item.arrivalId ?? item.ville_arrivee_id ?? item.villeArrivee?.id,
    price: item.price ?? item.prix ?? item.prix_min,
    duration: item.duree || item.duration || item.temps_moyen,
    frequency: item.frequency || item.frequence,
  };
}

export default function HorairesPopulaires() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState([]);

  const loadRoutes = useCallback(async () => {
    try {
      const params = { limit: 20 };
      if (user?.id != null) params.user_id = user.id;
      let list = [];
      try {
        const { data } = await authClient.get("/api/routes/popular", { params });
        list = Array.isArray(data) ? data : [];
      } catch {
        const { data } = await authClient.get("/api/trajet-modeles");
        const modeles = Array.isArray(data?.trajetModeles) ? data.trajetModeles : [];
        list = modeles.map((m) => ({
          from: m?.villeDepart?.nom,
          to: m?.villeArrivee?.nom,
          departureId: m?.ville_depart_id,
          arrivalId: m?.ville_arrivee_id,
          price: m?.prix,
          duree: m?.duree_estimee,
        }));
      }
      setRoutes(list.map(formatRoute));
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Horaires",
        text2: e?.response?.data?.message || "Impossible de charger les lignes",
      });
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  const openSearch = (route) => {
    if (!route.departureId || !route.arrivalId) {
      Toast.show({
        type: "info",
        text1: "Recherche",
        text2: "Sélectionnez cette ligne depuis l'accueil pour lancer une recherche.",
      });
      navigation.navigate("MainTabs", { screen: "Accueil" });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    navigation.getParent()?.navigate("ListeTrajets", {
      departure: route.from,
      destination: route.to,
      departureId: route.departureId,
      destinationId: route.arrivalId,
      date: today,
      tripType: "aller simple",
      tripTypeApi: "ALLER_SIMPLE",
    });
  };

  return (
    <ScreenShell title="Horaires populaires" subtitle="Lignes les plus demandées">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          <Text style={styles.intro}>
            Consultez les trajets fréquents et réservez en un clic.
          </Text>
          {routes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune ligne disponible pour le moment.</Text>
            </View>
          ) : (
            routes.map((route, index) => (
              <TouchableOpacity
                key={`${route.from}-${route.to}-${index}`}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openSearch(route)}
              >
                <View style={styles.routeRow}>
                  <MapPin size={16} color={COLORS.primary} />
                  <Text style={styles.city}>{route.from}</Text>
                  <ArrowRight size={16} color={COLORS.muted} />
                  <Text style={styles.city}>{route.to}</Text>
                </View>
                <View style={styles.metaRow}>
                  {route.duration ? (
                    <View style={styles.metaChip}>
                      <Clock size={14} color={COLORS.muted} />
                      <Text style={styles.metaText}>{route.duration}</Text>
                    </View>
                  ) : null}
                  {route.price != null ? (
                    <View style={styles.metaChip}>
                      <Banknote size={14} color={COLORS.primary} />
                      <Text style={styles.priceText}>
                        {Number(route.price).toLocaleString("fr-FR")} FCFA
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 32 },
  intro: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  city: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textStrong,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: 12, color: COLORS.muted },
  priceText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  empty: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: { color: COLORS.muted, fontSize: 14 },
});
