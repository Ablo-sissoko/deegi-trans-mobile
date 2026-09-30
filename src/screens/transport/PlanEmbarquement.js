import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Bus, MapPin, Clock, Users } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import ScreenShell from "../../components/ScreenShell";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";

function isTodayReservation(r) {
  const date = r?.trajet?.date_depart;
  if (!date) return false;
  const today = new Date().toISOString().split("T")[0];
  return String(date).slice(0, 10) === today;
}

export default function PlanEmbarquement() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [boardings, setBoardings] = useState([]);

  const loadBoardings = useCallback(async () => {
    try {
      const { data } = await authClient.get("reservations/mes-reservations");
      const list = Array.isArray(data?.reservations) ? data.reservations : [];
      const todayList = list.filter(isTodayReservation);
      setBoardings(todayList);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Embarquement",
        text2: e?.response?.data?.message || "Erreur de chargement",
      });
      setBoardings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBoardings();
    }, [loadBoardings]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBoardings();
    setRefreshing(false);
  };

  const grouped = boardings.reduce((acc, item) => {
    const key = `${item?.trajet?.heure_depart || "?"}-${item?.trajet?.ville_depart?.nom || "?"}`;
    if (!acc[key]) acc[key] = { trajet: item.trajet, passengers: [] };
    acc[key].passengers.push(item);
    return acc;
  }, {});

  const groups = Object.values(grouped);

  return (
    <ScreenShell title="Plan d'embarquement" subtitle="Passagers attendus aujourd'hui">
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
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Bus size={40} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Aucun embarquement prévu</Text>
              <Text style={styles.emptyText}>Les réservations du jour apparaîtront ici.</Text>
            </View>
          ) : (
            groups.map((group, index) => {
              const t = group.trajet || {};
              const totalPlaces = group.passengers.reduce(
                (sum, p) => sum + (p.passagers?.length ?? p.nombre_places ?? 1),
                0,
              );
              return (
                <View key={`${t.heure_depart}-${index}`} style={styles.card}>
                  <View style={styles.timeRow}>
                    <Clock size={16} color={COLORS.primary} />
                    <Text style={styles.timeText}>{t.heure_depart || "—"}</Text>
                  </View>
                  <View style={styles.routeRow}>
                    <MapPin size={16} color={COLORS.muted} />
                    <Text style={styles.routeText}>
                      {t.ville_depart?.nom || "Départ"} → {t.ville_arrivee?.nom || "Arrivée"}
                    </Text>
                  </View>
                  <View style={styles.countRow}>
                    <Users size={16} color={COLORS.muted} />
                    <Text style={styles.countText}>
                      {group.passengers.length} réservation(s) · {totalPlaces} passager(s)
                    </Text>
                  </View>
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
  emptyText: { fontSize: 13, color: COLORS.muted },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  timeText: { fontSize: 16, fontWeight: "800", color: COLORS.textStrong },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  routeText: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.textStrong },
  countRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  countText: { fontSize: 13, color: COLORS.muted },
});
