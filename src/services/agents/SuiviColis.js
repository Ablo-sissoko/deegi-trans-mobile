import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  SectionList,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { getToken } from "../../auths/authStorage";

/** GET /api/colis/compagnie/:compagnie_id — Bearer token. Réponse: { compagnie_id, count, colis[] } */
/** PATCH /api/colis/statut/bulk — body JSON: { colis_ids: number[], statut: string } */

const statutsDisponibles = [
  "EN_ATTENTE",
  "RAMASSE",
  "EN_TRANSIT",
  "ARRIVE",
  "LIVRE",
  "ANNULE",
];

function colisDayMeta(c) {
  const raw =
    c.createdAt || c.date_enregistrement_colis || c.created_at || c.date;
  const d = raw ? new Date(raw) : new Date();
  const t = d.getTime();
  if (Number.isNaN(t)) {
    return {
      sortKey: "unknown",
      headerLabel: "Date inconnue",
      sortTs: 0,
    };
  }
  const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const headerLabel = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const sortTs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return { sortKey, headerLabel, sortTs };
}

export default function SuiviColis() {
  const { token, user, loading: authLoading } = useAuth();
  const compagnieId = user?.compagnie_id != null ? Number(user.compagnie_id) : null;

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ["40%"], []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    [],
  );

  const [colisList, setColisList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatut, setBulkStatut] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [serverCount, setServerCount] = useState(null);

  const getAuthHeaders = useCallback(async () => {
    const t = token || (await getToken());
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [token]);

  const normalizeColisItem = (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    let tracking = raw.tracking;
    if (!Array.isArray(tracking)) tracking = [];
    return { ...raw, tracking };
  };

  const extractColisList = (data) => {
    const list = Array.isArray(data?.colis) ? data.colis : [];
    return list.map(normalizeColisItem);
  };

  const chargerColis = useCallback(async () => {
    if (compagnieId == null || Number.isNaN(compagnieId)) {
      setColisList([]);
      return;
    }
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      setColisList([]);
      return;
    }
    setLoadingList(true);
    try {
      const { data } = await authClient.get(`/api/colis/compagnie/${compagnieId}`, {
        headers,
      });
      setColisList(extractColisList(data));
      setServerCount(typeof data?.count === "number" ? data.count : null);
      setSelectedIds([]);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.message === "Network Error"
          ? "Réseau: vérifiez l’URL API (pas localhost sur téléphone) et que le serveur tourne."
          : "Impossible de charger les colis");
      Alert.alert("Erreur", msg);
      setColisList([]);
      setServerCount(null);
    } finally {
      setLoadingList(false);
    }
  }, [compagnieId, getAuthHeaders]);

  const onRefresh = useCallback(async () => {
    if (compagnieId == null) return;
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    setRefreshing(true);
    try {
      const { data } = await authClient.get(`/api/colis/compagnie/${compagnieId}`, {
        headers,
      });
      setColisList(extractColisList(data));
      setServerCount(typeof data?.count === "number" ? data.count : null);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message ||
          (error.message === "Network Error" ? "Problème réseau (API injoignable)." : "Actualisation impossible"),
      );
    } finally {
      setRefreshing(false);
    }
  }, [compagnieId, getAuthHeaders]);

  useEffect(() => {
    chargerColis();
  }, [chargerColis]);

  const filteredColis = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return colisList;
    return colisList.filter((c) => {
      const idStr = String(c.id);
      const nom = String(c.nom_colis || "").toLowerCase();
      const suivi = String(c.Numero_suivi_colis || "").toLowerCase();
      return idStr.includes(q) || nom.includes(q) || suivi.includes(q);
    });
  }, [colisList, filterText]);

  const sections = useMemo(() => {
    const bucket = new Map();
    filteredColis.forEach((c) => {
      const { sortKey, headerLabel, sortTs } = colisDayMeta(c);
      if (!bucket.has(sortKey)) {
        bucket.set(sortKey, { title: headerLabel, sortTs, data: [] });
      }
      bucket.get(sortKey).data.push(c);
    });
    return [...bucket.values()]
      .sort((a, b) => b.sortTs - a.sortTs)
      .map(({ title, data }) => ({ title, data }));
  }, [filteredColis]);

  const toggleSelect = useCallback((id) => {
    const n = Number(id);
    setSelectedIds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  }, []);

  const selectAllVisible = () => {
    const ids = filteredColis.map((c) => Number(c.id));
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds([]);

  const appliquerStatutBulk = async () => {
    if (selectedIds.length === 0) {
      Alert.alert("Sélection", "Cochez au moins un colis");
      return;
    }
    if (!bulkStatut) {
      Alert.alert("Statut", "Choisissez un statut dans la liste");
      return;
    }
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      Alert.alert("Session", "Token manquant, reconnectez-vous.");
      return;
    }
    setBulkLoading(true);
    try {
      await authClient.patch(
        "/api/colis/statut/bulk",
        { colis_ids: selectedIds, statut: bulkStatut },
        { headers },
      );
      Alert.alert("Succès", `${selectedIds.length} colis mis à jour`);
      setSelectedIds([]);
      setBulkStatut("");
      bottomSheetRef.current?.close();
      await chargerColis();
    } catch (error) {
      const d = error.response?.data;
      const msg = d?.message || "Mise à jour impossible";
      if (Array.isArray(d?.invalid_ids) && d.invalid_ids.length) {
        Alert.alert("Erreur", `${msg}\nIDs: ${d.invalid_ids.join(", ")}`);
      } else {
        Alert.alert("Erreur", msg);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const renderColisRow = useCallback(
    ({ item }) => {
      const id = Number(item.id);
      const checked = selectedIds.includes(id);
      const tracking = Array.isArray(item.tracking) ? item.tracking : [];
      const dernier =
        tracking.length > 0 ? tracking[tracking.length - 1] : null;
      return (
        <TouchableOpacity
          style={[styles.row, checked && styles.rowSelected]}
          onPress={() => toggleSelect(id)}
          onLongPress={() => toggleSelect(id)}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={checked ? "check-box" : "check-box-outline-blank"}
            size={26}
            color={checked ? COLORS.primary : COLORS.muted}
          />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.rowId}>#{id}</Text>
              <View style={[styles.statusBadge, getStatusStyle(item.statut_colis)]}>
                <Text style={styles.statusText}>{item.statut_colis}</Text>
              </View>
            </View>
            <Text style={styles.rowNom} numberOfLines={1}>
              {item.nom_colis}
            </Text>
            {item.Numero_suivi_colis ? (
              <Text style={styles.rowSuivi} numberOfLines={1}>
                Suivi: {item.Numero_suivi_colis}
              </Text>
            ) : null}
            <Text style={styles.rowMeta} numberOfLines={1}>
              {item.expediteur
                ? `Exp. ${item.expediteur.prenom} ${item.expediteur.nom} · ${item.expediteur.numero_telephone || ""}`
                : ""}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {item.destinataire
                ? `Dest. ${item.destinataire.prenom} ${item.destinataire.nom} · ${item.destinataire.numero_telephone || ""}`
                : ""}
            </Text>
            {item.agent ? (
              <Text style={styles.rowMeta} numberOfLines={1}>
                Agent: {item.agent.prenom} {item.agent.nom}
              </Text>
            ) : null}
            {dernier ? (
              <Text style={styles.rowTracking} numberOfLines={2}>
                Dernière étape: {dernier.description || dernier.statut}
                {dernier.location ? ` · ${dernier.location}` : ""}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, toggleSelect],
  );

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.header}>
          <Text style={styles.title}>Suivi des colis</Text>
          <Text style={styles.subtitle}>
            Compagnie #{compagnieId} — {serverCount != null ? serverCount : colisList.length} colis
          </Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrer par ID, nom ou n° de suivi"
              value={filterText}
              onChangeText={setFilterText}
            />
            <TouchableOpacity style={styles.searchButton} onPress={chargerColis} disabled={loadingList}>
              <MaterialIcons name="refresh" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.selectActions}>
            <TouchableOpacity onPress={selectAllVisible} style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>Tout sélectionner (liste)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearSelection} style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>Effacer</Text>
            </TouchableOpacity>
          </View>
        
          {bulkStatut && selectedIds.length > 0 ? (
            <Text style={styles.statutTopHint}>
              Statut sélectionné : {bulkStatut.replace(/_/g, " ")}
            </Text>
          ) : null}
        </View>

        {loadingList && !refreshing ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : null}
      </>
    ),
    [
      compagnieId,
      serverCount,
      colisList.length,
      filterText,
      chargerColis,
      loadingList,
      refreshing,
      selectedIds.length,
      bulkStatut,
      bulkLoading,
    ],
  );

  const renderSectionHeader = useCallback(
    ({ section: { title } }) => <Text style={styles.groupHeader}>{title}</Text>,
    [],
  );

  if (authLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (compagnieId == null || Number.isNaN(compagnieId)) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.emptyWrap}>
        <MaterialIcons name="business" size={48} color={COLORS.muted} />
        <Text style={styles.emptyTitle}>Aucune compagnie</Text>
        <Text style={styles.emptyText}>
          Votre compte agent doit être rattaché à une compagnie pour voir et modifier les colis.
        </Text>
      </ScrollView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex1}>
      <View style={styles.flex1}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderColisRow}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          contentContainerStyle={
            sections.length === 0 && !loadingList ? styles.sectionListEmpty : styles.sectionListContent
          }
          ListEmptyComponent={
            !loadingList ? (
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>Aucun colis à afficher</Text>
              </View>
            ) : null
          }
        />

        {selectedIds.length > 0 ? (
          <View style={styles.floatingBar} pointerEvents="box-none">
            <View style={styles.floatingBarLeft}>
              <Text style={styles.floatingBarText}>{selectedIds.length} sélectionné(s)</Text>
            </View>
            <View style={styles.floatingBarRight}>
              <TouchableOpacity
                style={styles.floatingStatutBtn}
                onPress={() => bottomSheetRef.current?.expand()}
                disabled={bulkLoading}
              >
                <Text style={styles.floatingStatutBtnText}>Statut</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSelection} hitSlop={12}>
                <Text style={styles.floatingBarClear}>Effacer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBg}
        >
          <BottomSheetScrollView contentContainerStyle={styles.sheetScroll}>
            <Text style={styles.sheetTitle}>Choisir un statut</Text>

            {statutsDisponibles.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sheetItem, bulkStatut === s && styles.sheetItemActive]}
                onPress={() => setBulkStatut(s)}
              >
                <Text style={styles.sheetItemText}>{s.replace(/_/g, " ")}</Text>
                {bulkStatut === s ? (
                  <MaterialIcons name="check" size={22} color={COLORS.primary} />
                ) : null}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.confirmBtn, (!bulkStatut || bulkLoading) && styles.disabledButton]}
              onPress={appliquerStatutBulk}
              disabled={!bulkStatut || bulkLoading}
            >
              {bulkLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmBtnText}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

function getStatusStyle(statut) {
  switch (String(statut || "").toUpperCase()) {
    case "LIVRE":
      return { backgroundColor: COLORS.success };
    case "EN_TRANSIT":
    case "RAMASSE":
      return { backgroundColor: COLORS.warning };
    case "ARRIVE":
      return { backgroundColor: "#2563eb" };
    case "ANNULE":
      return { backgroundColor: COLORS.error };
    default:
      return { backgroundColor: COLORS.muted };
  }
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSoft,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textStrong,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  emptyList: {
    padding: 20,
    alignItems: "center",
  },
  sectionListContent: {
    paddingBottom: 100,
  },
  sectionListEmpty: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textStrong,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 5,
  },
  searchSection: {
    padding: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.bgSoft,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
  },
  selectActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  linkBtn: {
    paddingVertical: 6,
  },
  linkBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  statutTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 14,
  },
  statutTopBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  statutTopHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
  },
  loader: {
    marginTop: 24,
    marginBottom: 16,
  },
  groupHeader: {
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 16,
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.muted,
    textTransform: "capitalize",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  rowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  rowId: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textStrong,
  },
  rowNom: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textStrong,
    marginBottom: 4,
  },
  rowSuivi: {
    fontSize: 11,
    color: COLORS.primary,
    marginBottom: 6,
  },
  rowMeta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  rowTracking: {
    fontSize: 11,
    color: COLORS.textStrong,
    marginTop: 6,
    fontStyle: "italic",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.55,
  },
  floatingBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: COLORS.textStrong,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  floatingBarLeft: {
    flexShrink: 1,
  },
  floatingBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  floatingStatutBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  floatingStatutBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  floatingBarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  floatingBarClear: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  sheetBg: {
    backgroundColor: COLORS.white,
  },
  sheetScroll: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.textStrong,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sheetItemActive: {
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  sheetItemText: {
    fontSize: 16,
    color: COLORS.textStrong,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
