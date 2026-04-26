import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Vibration,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";
import { getToken } from "../../auths/authStorage";
import { useAuth } from "../../context/AuthContext";
import Toast from "react-native-toast-message";

export default function ScanBillet() {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const [billets, setBillets] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  // 🔹 PREVIEW API - URL CORRIGÉE
  const previewBillet = async (qr_data) => {
    const headers = {};
    const t = token || (await getToken());
    if (t) headers.Authorization = `Bearer ${t}`;

    const { data } = await authClient.post(
      "/api/reservations/billets/preview-entree",
      { qr_data },
      { headers }
    );
    return data;
  };

  // 🔹 SCAN
  const handleScan = async ({ data }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);
    Vibration.vibrate();

    try {
      const res = await previewBillet(data);
      const billet = res.billet;

      // Vérifier si le billet est éligible
      if (!res.embarquement?.autorise) {
        Toast.show({
          type: "error",
          text1: "Billet non éligible",
          text2: res.embarquement?.message || "Ce billet ne peut pas être validé",
        });
        return;
      }

      // Éviter les doublons
      const exists = billets.find((b) => b.id === billet.id);
      if (!exists) {
        setBillets((prev) => [{ ...billet, eligible: true }, ...prev]);
        Toast.show({
          type: "success",
          text1: "Succès",
          text2: "Billet ajouté à la liste",
        });
      } else {
        Toast.show({
          type: "info",
          text1: "Information",
          text2: "Ce billet a déjà été scanné",
        });
      }
    } catch (e) {
      console.error("Erreur scan:", e);
      Alert.alert(
        "Erreur",
        e.response?.data?.message || e.message || "Erreur lors du scan"
      );
    } finally {
      setLoading(false);
      setTimeout(() => setScanned(false), 1500);
    }
  };

  // 🔹 SELECTION
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 🔹 VALIDATION BATCH - URL CORRIGÉE (déjà correcte)
  const validateBillets = async () => {
    if (selected.length === 0) {
      return Toast.show({
        type: "info",
        text1: "Information",
        text2: "Sélectionnez au moins un billet",
      });
    }

    const sessionToken = token || (await getToken());
    if (!sessionToken) {
      return Alert.alert(
        "Connexion requise",
        "Connectez-vous avec un compte agent pour valider l’embarquement (token manquant).",
      );
    }

    try {
      setLoading(true);

      const { data } = await authClient.post(
        "/api/reservations/billets/valider-embarquement",
        { billet_ids: selected },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        },
      );

      const validated = Array.isArray(data?.billets) ? data.billets : [];
      const validatedIds = new Set(validated.map((b) => b.id));
      const errs = Array.isArray(data?.errors) ? data.errors : [];

      if (validatedIds.size > 0) {
        setBillets((prev) => prev.filter((b) => !validatedIds.has(b.id)));
        setSelected((prev) => prev.filter((id) => !validatedIds.has(id)));
        Toast.show({
          type: "success",
          text1: "Embarquement",
          text2: data?.message || `${validatedIds.size} billet(s) validé(s)`,
        });
      }

      if (errs.length > 0) {
        const detail = errs.map((e) => `#${e.billet_id}: ${e.message}`).join("\n");
        Toast.show({
          type: validatedIds.size > 0 ? "info" : "error",
          text1: validatedIds.size > 0 ? "Certains billets refusés" : "Validation impossible",
          text2: detail.length > 120 ? `${errs[0].message} (+${errs.length - 1}…)` : detail,
        });
      }
    } catch (e) {
      console.error("Erreur validation:", e);
      Alert.alert(
        "Erreur",
        e.response?.data?.message || e.message || "Erreur lors de la validation"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Permission caméra requise</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* CAMERA */}
      <View style={{ height: 300 }}>
        <CameraView
          style={{ flex: 1 }}
          onBarcodeScanned={scanned ? undefined : handleScan}
          barcodeScannerSettings={{ barcodeTypes: ["qr", "pdf417"] }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.scanArea} />
          </View>
        </CameraView>
      </View>

      {/* CHARGEMENT */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Vérification...</Text>
        </View>
      )}

      {/* LISTE DES BILLETS SCANNÉS */}
      {billets.length > 0 && (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Billets scannés ({billets.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                setBillets([]);
                setSelected([]);
              }}
            >
              <Text style={styles.clearText}>Tout effacer</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={billets}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                  ]}
                  onPress={() => toggleSelect(item.id)}
                >
                  <View style={styles.checkbox}>
                    <MaterialIcons
                      name={isSelected ? "check-box" : "check-box-outline-blank"}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.numero}>{item.numero_billet}</Text>
                    <Text style={styles.route}>
                      {item.trajet?.trajetModele?.villeDepart?.nom} →{" "}
                      {item.trajet?.trajetModele?.villeArrivee?.nom}
                    </Text>
                    <Text style={styles.passagers}>
                      {item.reservation?.passagers?.length || 0} passager(s)
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      {/* BOUTON DE VALIDATION */}
      <TouchableOpacity
        style={[styles.validateBtn, selected.length === 0 && styles.validateBtnDisabled]}
        onPress={validateBillets}
        disabled={selected.length === 0 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="how-to-reg" size={24} color="#fff" />
            <Text style={styles.validateBtnText}>
              Valider ({selected.length})
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  clearText: {
    color: COLORS.error,
    fontSize: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#E3F2FD",
  },
  checkbox: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  numero: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  route: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  passagers: {
    fontSize: 11,
    color: "#999",
  },
  validateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  validateBtnDisabled: {
    backgroundColor: "#ccc",
  },
  validateBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});