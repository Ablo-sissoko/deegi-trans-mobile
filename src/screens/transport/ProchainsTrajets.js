import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Calendar, MapPin, Clock, Users } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import ScreenShell from "../../components/ScreenShell";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";
import { getToken } from "../../auths/authStorage";

function isUpcoming(reservation) {
  const trajet = reservation?.trajet;
  if (!trajet?.date_depart) return true;
  const d = new Date(`${trajet.date_depart}T${trajet.heure_depart || "23:59"}:00`);
  return d.getTime() >= Date.now();
}

export default function ProchainsTrajets() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState([]);

  const loadTrips = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setTrips([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authClient.get("reservations/mes-reservations");
      const list = Array.isArray(data?.reservations) ? data.reservations : [];
      const upcoming = list
        .filter(isUpcoming)
        .sort((a, b) => {
          const da = new Date(`${a?.trajet?.date_depart}T${a?.trajet?.heure_depart || "00:00"}`);
          const db = new Date(`${b?.trajet?.date_depart}T${b?.trajet?.heure_depart || "00:00"}`);
          return da - db;
        });
      setTrips(upcoming);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Trajets",
        text2: e?.response?.data?.message || "Erreur de chargement",
      });
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTrips();
    }, [loadTrips]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  return (
    <ScreenShell title="Prochains trajets" subtitle="Vos départs à venir">
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
          {trips.length === 0 ? (
            <View style={styles.empty}>
              <Calendar size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Aucun trajet à venir</Text>
              <Text style={styles.emptyText}>
                Réservez un billet depuis l'accueil pour le voir ici.
              </Text>
            </View>
          ) : (
            trips.map((item) => {
              const t = item.trajet || {};
              const places = item.passagers?.length ?? item.nombre_places ?? 1;
              return (
                <View key={String(item.id)} style={styles.card}>
                  <View style={styles.dateRow}>
                    <Calendar size={16} color={COLORS.primary} />
                    <Text style={styles.dateText}>
                      {t.date_depart || "—"} · {t.heure_depart || "—"}
                    </Text>
                  </View>
                  <View style={styles.routeRow}>
                    <MapPin size={16} color={COLORS.muted} />
                    <Text style={styles.routeText}>
                      {t.ville_depart?.nom || t.depart || "Départ"} →{" "}
                      {t.ville_arrivee?.nom || t.arrivee || "Arrivée"}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Clock size={14} color={COLORS.muted} />
                      <Text style={styles.metaText}>{item.statut || "Confirmé"}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Users size={14} color={COLORS.muted} />
                      <Text style={styles.metaText}>{places} place(s)</Text>
                    </View>
                  </View>
                  {item.billet?.numero_billet ? (
                    <Text style={styles.ticketRef}>Billet #{item.billet.numero_billet}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textStrong },
  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: "center", paddingHorizontal: 24 },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  dateText: { fontSize: 14, fontWeight: "700", color: COLORS.textStrong },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  routeText: { flex: 1, fontSize: 14, color: COLORS.textStrong, fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 16 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: COLORS.muted },
  ticketRef: { marginTop: 8, fontSize: 12, color: COLORS.primary, fontWeight: "600" },
});
