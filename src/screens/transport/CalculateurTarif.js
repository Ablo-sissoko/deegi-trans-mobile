import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MapPin, ArrowRight, Banknote, Calculator } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import ScreenShell from "../../components/ScreenShell";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";

export default function CalculateurTarif() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [modeles, setModeles] = useState([]);
  const [departure, setDeparture] = useState(null);
  const [destination, setDestination] = useState(null);
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await authClient.get("/api/trajet-modeles");
        const list = Array.isArray(data?.trajetModeles) ? data.trajetModeles : [];
        setModeles(list);
      } catch {
        Toast.show({ type: "error", text1: "Tarifs", text2: "Impossible de charger les lignes" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cityMap = new Map();
  modeles.forEach((m) => {
    if (m?.villeDepart?.id) cityMap.set(m.villeDepart.id, m.villeDepart);
    if (m?.villeArrivee?.id) cityMap.set(m.villeArrivee.id, m.villeArrivee);
  });
  const cities = Array.from(cityMap.values());

  const computeEstimate = () => {
    if (!departure || !destination) {
      Toast.show({ type: "error", text1: "Sélection", text2: "Choisissez départ et destination" });
      return;
    }
    if (departure.id === destination.id) {
      Toast.show({ type: "error", text1: "Erreur", text2: "Départ et arrivée identiques" });
      return;
    }
    const match = modeles.find(
      (m) =>
        (m.ville_depart_id === departure.id && m.ville_arrivee_id === destination.id) ||
        (m.ville_depart_id === destination.id && m.ville_arrivee_id === departure.id),
    );
    if (!match) {
      setEstimate({ found: false });
      return;
    }
    setEstimate({
      found: true,
      price: match.prix,
      duree: match.duree_estimee,
      compagnie: match.compagnie?.nom_compagnie,
    });
  };

  const bookTrip = () => {
    if (!departure || !destination) return;
    const today = new Date().toISOString().split("T")[0];
    navigation.getParent()?.navigate("ListeTrajets", {
      departure: departure.nom,
      destination: destination.nom,
      departureId: departure.id,
      destinationId: destination.id,
      date: today,
      tripType: "aller simple",
      tripTypeApi: "ALLER_SIMPLE",
    });
  };

  return (
    <ScreenShell title="Calculateur tarif" subtitle="Estimez le prix d'un trajet">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Sélectionnez votre trajet pour obtenir une estimation tarifaire indicative.
          </Text>

          <Text style={styles.label}>Ville de départ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {cities.map((city) => (
              <TouchableOpacity
                key={`dep-${city.id}`}
                style={[styles.chip, departure?.id === city.id && styles.chipActive]}
                onPress={() => setDeparture(city)}
              >
                <Text style={[styles.chipText, departure?.id === city.id && styles.chipTextActive]}>
                  {city.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Ville d'arrivée</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {cities.map((city) => (
              <TouchableOpacity
                key={`arr-${city.id}`}
                style={[styles.chip, destination?.id === city.id && styles.chipActive]}
                onPress={() => setDestination(city)}
              >
                <Text style={[styles.chipText, destination?.id === city.id && styles.chipTextActive]}>
                  {city.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.btn} onPress={computeEstimate} activeOpacity={0.85}>
            <Calculator size={18} color="#fff" />
            <Text style={styles.btnText}>Calculer</Text>
          </TouchableOpacity>

          {estimate ? (
            <View style={styles.resultCard}>
              {estimate.found ? (
                <>
                  <View style={styles.routeRow}>
                    <MapPin size={16} color={COLORS.primary} />
                    <Text style={styles.routeText}>{departure?.nom}</Text>
                    <ArrowRight size={16} color={COLORS.muted} />
                    <Text style={styles.routeText}>{destination?.nom}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Banknote size={20} color={COLORS.primary} />
                    <Text style={styles.price}>
                      {Number(estimate.price || 0).toLocaleString("fr-FR")} FCFA
                    </Text>
                    <Text style={styles.priceHint}> / place (estimation)</Text>
                  </View>
                  {estimate.duree ? (
                    <Text style={styles.meta}>Durée estimée : {estimate.duree}</Text>
                  ) : null}
                  {estimate.compagnie ? (
                    <Text style={styles.meta}>Compagnie : {estimate.compagnie}</Text>
                  ) : null}
                  <TouchableOpacity style={styles.bookBtn} onPress={bookTrip} activeOpacity={0.85}>
                    <Text style={styles.bookBtnText}>Voir les trajets disponibles</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.notFound}>
                  Aucun tarif trouvé pour cette liaison. Essayez une autre combinaison.
                </Text>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 32 },
  intro: { fontSize: 14, color: COLORS.muted, lineHeight: 20, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.textStrong, marginBottom: 8, marginTop: 8 },
  chipsScroll: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textStrong, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  resultCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  routeText: { fontSize: 15, fontWeight: "700", color: COLORS.textStrong },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  price: { fontSize: 22, fontWeight: "800", color: COLORS.primary },
  priceHint: { fontSize: 12, color: COLORS.muted },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  bookBtn: {
    marginTop: 14,
    backgroundColor: COLORS.bgSoft,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  bookBtnText: { color: COLORS.primary, fontWeight: "700" },
  notFound: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
});
