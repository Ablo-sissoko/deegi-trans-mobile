import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ticket, Package, TrendingUp, Users } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenShell from "../../components/ScreenShell";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";
import { getUserJson } from "../../auths/authStorage";

export default function OperationsDuJour() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [colisCount, setColisCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const user = await getUserJson();
      const compagnieId = user?.compagnie_id;
      let ops = null;
      try {
        const { data } = await authClient.get("/api/operations/today");
        ops = data?.summary || data;
      } catch {
        ops = null;
      }
      setSummary(ops);

      if (compagnieId != null) {
        try {
          const { data } = await authClient.get(`/api/colis/compagnie/${compagnieId}`);
          setColisCount(Number(data?.count) || (Array.isArray(data?.colis) ? data.colis.length : 0));
        } catch {
          setColisCount(0);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const cards = [
    {
      label: "Billets validés",
      value: summary?.billets_total ?? summary?.billets_scannes ?? 0,
      icon: Ticket,
      color: COLORS.primary,
    },
    {
      label: "Embarquements",
      value: summary?.embarquements ?? summary?.passagers ?? 0,
      icon: Users,
      color: COLORS.info,
    },
    {
      label: "Colis du jour",
      value: colisCount,
      icon: Package,
      color: COLORS.success,
    },
    {
      label: "Taux occupation",
      value: summary?.taux_occupation != null ? `${summary.taux_occupation}%` : "—",
      icon: TrendingUp,
      color: COLORS.warning,
    },
  ];

  return (
    <ScreenShell title="Opérations du jour" subtitle="Activité en gare aujourd'hui">
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
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
          <View style={styles.grid}>
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <View key={card.label} style={styles.statCard}>
                  <View style={[styles.iconWrap, { backgroundColor: `${card.color}18` }]}>
                    <Icon size={22} color={card.color} />
                  </View>
                  <Text style={styles.statValue}>{card.value}</Text>
                  <Text style={styles.statLabel}>{card.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Rappel agent</Text>
            <Text style={styles.noteText}>
              Vérifiez les billets avant embarquement, enregistrez les colis avec photo et mettez à jour
              les statuts en fin de shift.
            </Text>
          </View>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 32 },
  dateText: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 16,
    textTransform: "capitalize",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: COLORS.textStrong },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  noteCard: {
    backgroundColor: COLORS.lightOrange || "#FFF3E0",
    borderRadius: 14,
    padding: 14,
  },
  noteTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textStrong, marginBottom: 6 },
  noteText: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
});
