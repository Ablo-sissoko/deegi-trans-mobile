import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Search, Package, MapPin, Truck } from "lucide-react-native";
import Toast from "react-native-toast-message";
import ScreenShell from "../../components/ScreenShell";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";
import { transformParcelData } from "../../utils/parcelApi";

const STATUS_LABELS = {
  EN_ATTENTE: "En attente de prise en charge",
  RAMASSE: "Colis ramassé",
  EN_TRANSIT: "En transit",
  ARRIVE: "Arrivé en gare",
  LIVRE: "Livré au destinataire",
  ANNULE: "Annulé",
};

export default function SuiviColisCode() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async () => {
    const query = code.trim().toUpperCase();
    if (!query) {
      Toast.show({ type: "error", text1: "Code requis", text2: "Saisissez un numéro de suivi" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await authClient.get("/api/colis/mes-colis");
      const list = Array.isArray(data?.colis) ? data.colis : Array.isArray(data) ? data : [];
      const match = list.find((c) => {
        const num = String(c.Numero_suivi_colis || c.numero_suivi || c.id || "").toUpperCase();
        return num === query || num.includes(query) || String(c.id) === query;
      });
      if (!match) {
        Toast.show({
          type: "info",
          text1: "Introuvable",
          text2: "Aucun colis correspondant à ce code dans votre compte",
        });
        setResult(null);
      } else {
        setResult(transformParcelData(match, "sent"));
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: e?.response?.data?.message || "Impossible de rechercher le colis",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell title="Suivi colis" subtitle="Recherche par numéro de suivi">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Entrez le code reçu lors de l'envoi pour suivre l'état de votre colis en temps réel.
        </Text>
        <View style={styles.searchRow}>
          <Search size={18} color={COLORS.muted} />
          <TextInput
            style={styles.input}
            placeholder="Ex : COLIS-12345"
            placeholderTextColor={COLORS.muted}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSearch}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Rechercher</Text>
          )}
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Package size={20} color={COLORS.primary} />
              <Text style={styles.resultTitle}>{result.description}</Text>
            </View>
            <Text style={styles.tracking}>#{result.trackingNumber}</Text>
            <View style={styles.statusBadge}>
              <Truck size={14} color={COLORS.primary} />
              <Text style={styles.statusText}>
                {STATUS_LABELS[result.status] || result.status}
              </Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Expéditeur</Text>
              <Text style={styles.infoValue}>{result.sender?.name}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Destinataire</Text>
              <Text style={styles.infoValue}>{result.receiver?.name}</Text>
            </View>
            {result.timeline?.length ? (
              <View style={styles.timeline}>
                <Text style={styles.timelineTitle}>Historique</Text>
                {result.timeline.map((step, i) => (
                  <View key={`${step.status}-${i}`} style={styles.timelineItem}>
                    <MapPin size={14} color={COLORS.muted} />
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineStatus}>{step.description || step.status}</Text>
                      {step.location ? (
                        <Text style={styles.timelineLoc}>{step.location}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  intro: { fontSize: 14, color: COLORS.muted, lineHeight: 20, marginBottom: 16 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 15, color: COLORS.textStrong },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  resultCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textStrong, flex: 1 },
  tracking: { fontSize: 13, color: COLORS.muted, marginTop: 6, marginBottom: 10 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: COLORS.lightOrange || "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
  },
  statusText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  infoBlock: { marginBottom: 10 },
  infoLabel: { fontSize: 11, color: COLORS.muted, textTransform: "uppercase" },
  infoValue: { fontSize: 14, fontWeight: "600", color: COLORS.textStrong, marginTop: 2 },
  timeline: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  timelineTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textStrong, marginBottom: 8 },
  timelineItem: { flexDirection: "row", gap: 8, marginBottom: 10 },
  timelineBody: { flex: 1 },
  timelineStatus: { fontSize: 13, color: COLORS.textStrong },
  timelineLoc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
