// src/services/agents/DashboardAgent.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { authClient } from "../../api/auth";
import COLORS from "../../utils/COLORS";
import { getUserJson } from "../../auths/authStorage";

const { width } = Dimensions.get("window");

const EMPTY_STATS = {
  colisEnregistres: 0,
  colisLivres: 0,
  billetsScannes: 0,
  enAttente: 0,
  totalColis: 0,
  tauxReussite: 0,
};

function countColisByStatus(colisList) {
  const rows = Array.isArray(colisList) ? colisList : [];
  let colisEnregistres = 0;
  let colisLivres = 0;
  let enAttente = 0;

  for (const row of rows) {
    const st = String(row?.statut || row?.Statut || "").toUpperCase();
    if (st === "LIVRE" || st === "LIVRÉ") {
      colisLivres += 1;
    } else if (st === "EN_ATTENTE" || st === "EN ATTENTE" || st === "CREE" || st === "CRÉÉ") {
      enAttente += 1;
    } else {
      colisEnregistres += 1;
    }
  }

  const totalColis = rows.length;
  const tauxReussite = totalColis > 0 ? Math.round((colisLivres / totalColis) * 100) : 0;
  return { colisEnregistres, colisLivres, enAttente, totalColis, tauxReussite };
}

const DashboardAgent = ({ navigation }) => {
  const [stats, setStats] = useState({
    colisEnregistres: 0,
    colisLivres: 0,
    billetsScannes: 0,
    enAttente: 0,
    totalColis: 0,
    tauxReussite: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentPrenom, setAgentPrenom] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      let greeting = "";
      if (hours < 12) greeting = "Bon matin";
      else if (hours < 18) greeting = "Bon après-midi";
      else greeting = "Bonsoir";
      setCurrentTime(greeting);
    };
    updateTime();
  }, []);

  const fetchStats = async () => {
    try {
      const user = await getUserJson();
      setAgentName(user?.nom || "Agent");
      setAgentPrenom(user?.prenom || "");

      const compagnieId = user?.compagnie_id;
      let billetsScannes = 0;
      let colisStats = { ...EMPTY_STATS };

      try {
        const { data: todayData } = await authClient.get("/api/operations/today");
        billetsScannes = Number(todayData?.summary?.billets_total || 0);
      } catch {
        /* route absente sur certaines versions serveur */
      }

      if (compagnieId != null) {
        try {
          const { data: colisData } = await authClient.get(`/api/colis/compagnie/${compagnieId}`);
          colisStats = countColisByStatus(colisData?.colis);
        } catch (colisErr) {
          console.warn("Stats colis agent:", colisErr?.response?.status, colisErr?.message);
        }
      }

      setStats({
        ...colisStats,
        billetsScannes,
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const actionsRapides = [
    {
      id: "enregistrer",
      title: "Enregistrer un colis",
      icon: "add-box",
      gradient: ["#667eea", "#764ba2"],
      screen: "Enregistrer",
    },
    {
      id: "scanner",
      title: "Scanner un billet",
      icon: "qr-code-scanner",
      gradient: ["#f093fb", "#f5576c"],
      screen: "Scanner",
    },
    {
      id: "suivi",
      title: "Suivre un colis",
      icon: "track-changes",
      gradient: ["#4facfe", "#00f2fe"],
      screen: "Suivi",
    },
    {
      id: "statut",
      title: "Mettre à jour",
      icon: "update",
      gradient: ["#43e97b", "#38f9d7"],
      screen: "Suivi",
    },
  ];

  const statCards = [
    {
      id: "colisEnregistres",
      title: "Colis enregistrés",
      value: stats.colisEnregistres,
      icon: "inventory",
      color: "#667eea",
      bgLight: "#EEF2FF",
    },
    {
      id: "colisLivres",
      title: "Colis livrés",
      value: stats.colisLivres,
      icon: "local-shipping",
      color: "#43e97b",
      bgLight: "#E8F5E9",
    },
    {
      id: "billetsScannes",
      title: "Billets scannés",
      value: stats.billetsScannes,
      icon: "qr-code",
      color: "#f093fb",
      bgLight: "#FCE4EC",
    },
    {
      id: "enAttente",
      title: "En attente",
      value: stats.enAttente,
      icon: "pending",
      color: "#ffa726",
      bgLight: "#FFF3E0",
    },
  ];

  const handleAction = (screen) => {
    navigation.navigate(screen);
  };

  const formatDate = () => {
    const date = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("fr-FR", options);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      {/* Header avec dégradé */}
      <View style={[styles.headerGradient, { backgroundColor: COLORS.primary }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              {currentTime}, {agentPrenom} {agentName}
            </Text>
            <Text style={styles.dateText}>{formatDate()}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationIcon}
            onPress={() => navigation.navigate("Notifications")}
          >
            <MaterialIcons name="notifications-none" size={24} color={COLORS.white} />
            {stats.enAttente > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{stats.enAttente}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Carte de bienvenue */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Tableau de bord</Text>
          <Text style={styles.welcomeDesc}>
            Gérez vos colis, scannez les billets et suivez vos performances
          </Text>
        </View>
      </View>

      {/* Cartes de statistiques */}
      <View style={styles.statsWrapper}>
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <TouchableOpacity key={stat.id} style={styles.statCard} activeOpacity={0.9}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.bgLight }]}>
                <MaterialIcons name={stat.icon} size={28} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Carte de performance */}
      <View style={styles.performanceCard}>
        <View style={styles.performanceHeader}>
          <Text style={styles.performanceTitle}>Performance globale</Text>
          <MaterialIcons name="trending-up" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.performanceStats}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Taux de réussite</Text>
            <Text style={styles.performanceValue}>{stats.tauxReussite}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stats.tauxReussite}%` }]} />
            </View>
          </View>
          <View style={styles.performanceDivider} />
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Total colis traités</Text>
            <Text style={styles.performanceValue}>{stats.totalColis}</Text>
          </View>
        </View>
      </View>

      {/* Actions rapides */}
      <View style={styles.actionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsGrid}>
          {actionsRapides.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => handleAction(action.screen)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.actionGradient,
                  { backgroundColor: action.gradient?.[0] || COLORS.primary },
                ]}
              >
                <MaterialIcons name={action.icon} size={32} color={COLORS.white} />
                <Text style={styles.actionTitle}>{action.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Activités récentes */}
      <View style={styles.activitiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activités récentes</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Historique</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: "#EEF2FF" }]}>
              <MaterialIcons name="add-circle" size={20} color="#667eea" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Colis #COL-001 enregistré</Text>
              <Text style={styles.activityTime}>Il y a 5 minutes</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#ccc" />
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: "#FCE4EC" }]}>
              <MaterialIcons name="qr-code-scanner" size={20} color="#f093fb" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Billet #TK-123 scanné</Text>
              <Text style={styles.activityTime}>Il y a 15 minutes</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#ccc" />
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: "#FFF3E0" }]}>
              <MaterialIcons name="update" size={20} color="#ffa726" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Statut colis #COL-045 mis à jour</Text>
              <Text style={styles.activityTime}>Il y a 1 heure</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#ccc" />
          </View>

          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: "#E8F5E9" }]}>
              <MaterialIcons name="local-shipping" size={20} color="#43e97b" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Colis #COL-078 livré</Text>
              <Text style={styles.activityTime}>Il y a 2 heures</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#ccc" />
          </View>
        </View>
      </View>

      {/* Conseil du jour */}
      <View style={styles.tipCard}>
        <View style={[styles.tipGradient, { backgroundColor: "#667eea" }]}>
          <MaterialIcons name="lightbulb" size={24} color={COLORS.white} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Conseil du jour</Text>
            <Text style={styles.tipText}>
              Pensez à vérifier les colis en attente pour améliorer votre taux de livraison
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 50,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  dateText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  notificationIcon: {
    position: "relative",
    padding: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  welcomeCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 8,
  },
  welcomeDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
  },
  statsWrapper: {
    marginTop: -20,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: "#666",
  },
  performanceCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  performanceStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  performanceItem: {
    flex: 1,
  },
  performanceLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  performanceDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  actionsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a2e",
  },
  sectionLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: (width - 48) / 2,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    padding: 20,
    alignItems: "center",
    borderRadius: 16,
  },
  actionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  activitiesSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  activityList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: "#999",
  },
  tipCard: {
    marginHorizontal: 16,
    marginBottom: 30,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  tipGradient: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 16,
  },
});

export default DashboardAgent;