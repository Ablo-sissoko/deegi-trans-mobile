import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Search, MapPin, X } from "lucide-react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import COLORS from "../utils/COLORS";
import { authClient } from "../api/auth";
import { getToken } from "../auths/authStorage";
import { useAuth } from "../context/AuthContext";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function VilleRecherche() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [popularCities, setPopularCities] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(true);

  const type = route.params?.type === "destination" ? "destination" : "departure";
  const isSearching = search.trim().length > 0;

  const loadPopularAndHistory = useCallback(async () => {
    setSectionLoading(true);
    try {
      const popularParams = {};
      if (user?.id != null) popularParams.user_id = user.id;

      const [popularRes] = await Promise.all([
        authClient.get("/api/villes/popular", {
          params: { limit: 12, ...popularParams },
        }),
      ]);

      const raw = Array.isArray(popularRes.data) ? popularRes.data : [];
      const chips = raw.map((row, idx) => {
        const v = row.ville || row;
        const nom = v?.nom || row.texte || "—";
        const id = v?.id != null ? String(v.id) : `p-${idx}`;
        return { id, name: nom, villeId: v?.id ?? null };
      });
      setPopularCities(chips);

      const token = await getToken();
      if (token) {
        try {
          const { data } = await authClient.get("/api/historique-recherches/recent", {
            headers: authHeaders(token),
          });
          const items = [];
          (data?.trajets || []).forEach((t) => {
            const vd = t.villeDepart;
            const va = t.villeArrivee;
            if (vd?.nom && va?.nom) {
              items.push({
                id: `traj-${t.id}`,
                kind: "trajet",
                label: `${vd.nom} → ${va.nom}`,
                villeDepart: vd,
                villeArrivee: va,
              });
            }
          });
          (data?.villes || []).forEach((row, i) => {
            const tx = row.texte;
            if (tx) {
              items.push({
                id: `ville-${tx}-${i}`,
                kind: "ville",
                label: tx,
                texte: tx,
              });
            }
          });
          setHistoryItems(items.slice(0, 12));
        } catch (histErr) {
          console.warn("Historique recherches indisponible:", histErr?.response?.status);
          setHistoryItems([]);
        }
      } else {
        setHistoryItems([]);
      }
    } catch (e) {
      console.warn("VilleRecherche load:", e?.message);
      setPopularCities([]);
      setHistoryItems([]);
    } finally {
      setSectionLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPopularAndHistory();
    }, [loadPopularAndHistory]),
  );

  useEffect(() => {
    const t = search.trim();
    if (t.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const id = setTimeout(async () => {
      try {
        const params = { q: t };
        if (user?.id != null) params.user_id = user.id;
        const { data } = await authClient.get("/api/villes/search", {
          params: { ...params, limit: 15 },
        });
        const list = Array.isArray(data) ? data : [];
        setSearchResults(
          list.map((v) => ({
            id: String(v.id),
            name: v.nom,
            subtitle: "Mali",
            villeId: v.id,
          })),
        );
      } catch {
        try {
          const { data } = await authClient.get("/api/villes/search-quick", {
            params: { q: t },
          });
          const list = Array.isArray(data) ? data : [];
          setSearchResults(
            list.map((v) => ({
              id: String(v.id),
              name: v.nom,
              subtitle: "Mali",
              villeId: v.id,
            })),
          );
        } catch {
          setSearchResults([]);
          Toast.show({ type: "error", text1: "Recherche indisponible" });
        }
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [search, user?.id]);

  const pickVille = useCallback((ville) => {
    const onSelect = route.params?.onSelect;
    if (onSelect) onSelect(ville);
    navigation.goBack();
  }, [navigation, route.params?.onSelect]);

  const selectCity = async (ville) => {
    const nom = ville?.nom != null ? String(ville.nom).trim() : "";
    if (!nom) return;
    const id = ville?.id ?? null;
    try {
      const token = await getToken();
      if (token) {
        await authClient.post(
          "/api/historique-recherches/save",
          { type_recherche: "ville", texte: nom },
          { headers: authHeaders(token) },
        );
      }
    } catch {
      /* historique optionnel */
    }
    pickVille({ id, nom });
  };

  const clearHistory = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await authClient.delete("/api/historique-recherches/clear/all", {
        headers: authHeaders(token),
      });
      setHistoryItems([]);
      Toast.show({ type: "success", text1: "Historique effacé" });
    } catch {
      Toast.show({ type: "error", text1: "Impossible d'effacer l'historique" });
    }
  };

  const confirmClearHistory = () => {
    Alert.alert("Effacer l'historique", "Supprimer toutes vos recherches enregistrées ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: clearHistory },
    ]);
  };

  const onHistoryPress = (item) => {
    if (item.kind === "trajet") {
      if (type === "destination") {
        selectCity({
          id: item.villeArrivee?.id,
          nom: item.villeArrivee?.nom,
        });
      } else {
        selectCity({
          id: item.villeDepart?.id,
          nom: item.villeDepart?.nom,
        });
      }
      return;
    }
    selectCity({ id: null, nom: item.texte });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Search size={16} color={COLORS.muted} />
          <TextInput
            placeholder="Rechercher une ville..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            autoCorrect={false}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.locationRow}
        onPress={() => selectCity({ id: null, nom: "Bamako" })}
      >
        <MapPin size={18} color={COLORS.secondary} />
        <View>
          <Text style={styles.locationTitle}>Raccourci</Text>
          <Text style={styles.locationSub}>Bamako</Text>
        </View>
      </TouchableOpacity>

      {!isSearching && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Historique de recherche</Text>
            {historyItems.length > 0 ? (
              <TouchableOpacity onPress={confirmClearHistory}>
                <Text style={styles.sectionAction}>Effacer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {sectionLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
          ) : historyItems.length === 0 ? (
            <Text style={styles.emptyHint}>
              {user ? "Aucun historique pour l'instant." : "Connectez-vous pour enregistrer vos recherches."}
            </Text>
          ) : (
            historyItems.map((item, index) => (
              <TouchableOpacity
                key={String(item.id ?? `hist-${item.label || index}`)}
                style={styles.historyItem}
                onPress={() => onHistoryPress(item)}
              >
                <Text style={styles.itemTitle}>{item.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {!isSearching && (
        <>
          <Text style={styles.sectionTitle}>
            {type === "departure" ? "Départs populaires" : "Destinations populaires"}
          </Text>
          {sectionLoading ? null : (
            <View style={styles.chipsRow}>
              {popularCities.map((item, index) => (
                <TouchableOpacity
                  key={String(item.id ?? `pop-${item.name || index}`)}
                  style={styles.chip}
                  onPress={() =>
                    selectCity({ id: item.villeId, nom: item.name })
                  }
                >
                  <Text style={styles.itemTitle}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {isSearching && (
        <View style={styles.searchListWrap}>
          <Text style={styles.sectionTitle}>Ville / Zone</Text>
          {searchLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              style={styles.searchList}
              data={searchResults}
              keyExtractor={(item, index) => String(item.id ?? `search-${item.nom || index}`)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyHint}>Aucune ville trouvée.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locationRow}
                  onPress={() =>
                    selectCity({ id: item.villeId, nom: item.name })
                  }
                >
                  <MapPin size={18} color={COLORS.secondary} />
                  <View>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    <Text style={styles.itemSub}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 45,
  },
  input: {
    marginLeft: 8,
    flex: 1,
    color: COLORS.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  locationTitle: {
    color: COLORS.secondary,
    fontWeight: "600",
  },
  locationSub: {
    color: COLORS.muted,
    fontSize: 12,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 10,
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
    marginBottom: 6,
  },
  sectionAction: {
    color: COLORS.muted,
    fontWeight: "600",
    fontSize: 12,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  emptyHint: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  itemTitle: {
    color: COLORS.secondary,
    fontWeight: "600",
  },
  itemSub: {
    color: COLORS.muted,
    fontSize: 12,
  },
  searchListWrap: {
    flex: 1,
    minHeight: 200,
  },
  searchList: {
    flex: 1,
  },
});
