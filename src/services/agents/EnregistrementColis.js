import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "../../utils/COLORS";
import { authClient } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import { getToken } from "../../auths/authStorage";

function normalizePhone(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/^\+223/, "");
}

async function fetchUserByNumeroTelephone(numero) {
  const n = normalizePhone(numero);
  if (!n) return { user: null, error: "Numéro vide" };
  try {
    const { data } = await authClient.get(
      `/api/users/numero-telephone/${encodeURIComponent(n)}`,
    );
    const user = data?.user;
    if (!user?.id) {
      return { user: null, error: "Aucun utilisateur avec ce numéro" };
    }
    return { user, error: null };
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || "Erreur réseau";
    return { user: null, error: msg };
  }
}

function isRemoteImageUrl(uri) {
  return /^https?:\/\//i.test(String(uri || ""));
}

function guessMimeAndName(uri) {
  const lower = String(uri || "").toLowerCase();
  if (lower.endsWith(".png")) return { type: "image/png", name: "photo.png" };
  if (lower.endsWith(".webp")) return { type: "image/webp", name: "photo.webp" };
  if (lower.endsWith(".gif")) return { type: "image/gif", name: "photo.gif" };
  return { type: "image/jpeg", name: "photo.jpg" };
}

/** Poids saisi avec virgule française (ex. 2,5) → nombre */
function parsePoidsKg(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** AAAA-MM-JJ ou JJ/MM/AAAA (ou - . comme séparateurs) */
function parseDeliveryDateInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

function formatAxiosErrorMessage(error) {
  const d = error?.response?.data;
  if (typeof d === "string" && d.trim()) return d;
  if (d?.message) return String(d.message);
  if (d?.msg) return String(d.msg);
  if (d && typeof d === "object") {
    try {
      const s = JSON.stringify(d);
      if (s && s !== "{}") return s;
    } catch {
      /* ignore */
    }
  }
  if (error?.message) return String(error.message);
  return "Erreur lors de l'enregistrement";
}

/** fetch évite les soucis axios + FormData / Content-Type sous React Native */
async function uploadColisPhotoToServer(localUri, compagnieId, authToken) {
  const token = authToken || (await getToken());
  if (!token) {
    throw new Error("Session expirée : reconnectez-vous.");
  }
  const { type, name } = guessMimeAndName(localUri);
  const formData = new FormData();
  formData.append("image", { uri: localUri, type, name });

  const base = String(API_BASE_URL || "").replace(/\/+$/, "");
  const url = `${base}/api/colis/upload-photo?compagnie_id=${encodeURIComponent(compagnieId)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  let data = {};
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.message || data.msg || `Échec envoi photo (${res.status})`);
  }
  const out = data.url;
  if (!out) {
    throw new Error(data.message || "Réponse serveur invalide (pas d'URL photo)");
  }
  return out;
}

export default function EnregistrementColis() {
  const { token, user } = useAuth();
  const [expediteurPhone, setExpediteurPhone] = useState("");
  const [destinatairePhone, setDestinatairePhone] = useState("");
  const [expediteurUser, setExpediteurUser] = useState(null);
  const [destinataireUser, setDestinataireUser] = useState(null);
  const [loadingExp, setLoadingExp] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);

  const [formData, setFormData] = useState({
    nom_colis: "",
    description_colis: "",
    poids_colis: "",
    dimensions_colis: "",
    valeur_declaree_colis: "",
    date_livraison_colis: "",
  });
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);

  const compagnieId = useMemo(
    () => (user?.compagnie_id != null ? String(user.compagnie_id) : ""),
    [user?.compagnie_id],
  );

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setImages(selectedImages);
    }
  };

  const resetForm = () => {
    setExpediteurPhone("");
    setDestinatairePhone("");
    setExpediteurUser(null);
    setDestinataireUser(null);
    setFormData({
      nom_colis: "",
      description_colis: "",
      poids_colis: "",
      dimensions_colis: "",
      valeur_declaree_colis: "",
      date_livraison_colis: "",
    });
    setImages([]);
  };

  const handleLookupExpediteur = useCallback(async () => {
    setLoadingExp(true);
    try {
      const { user: u, error } = await fetchUserByNumeroTelephone(expediteurPhone);
      if (error || !u) {
        setExpediteurUser(null);
        Alert.alert("Expéditeur", error || "Utilisateur introuvable");
        return;
      }
      setExpediteurUser(u);
    } finally {
      setLoadingExp(false);
    }
  }, [expediteurPhone]);

  const handleLookupDestinataire = useCallback(async () => {
    setLoadingDest(true);
    try {
      const { user: u, error } = await fetchUserByNumeroTelephone(destinatairePhone);
      if (error || !u) {
        setDestinataireUser(null);
        Alert.alert("Destinataire", error || "Utilisateur introuvable");
        return;
      }
      setDestinataireUser(u);
    } finally {
      setLoadingDest(false);
    }
  }, [destinatairePhone]);

  const handleSubmit = async () => {
    if (!compagnieId) {
      Alert.alert("Erreur", "Aucune compagnie associée à cet agent");
      return;
    }
    if (!expediteurUser?.id || !destinataireUser?.id) {
      Alert.alert(
        "Erreur",
        "Recherchez et validez l'expéditeur et le destinataire par numéro de téléphone.",
      );
      return;
    }
    if (Number(expediteurUser.id) === Number(destinataireUser.id)) {
      Alert.alert("Erreur", "L'expéditeur et le destinataire doivent être distincts");
      return;
    }
    if (
      !formData.nom_colis ||
      !formData.description_colis ||
      !formData.poids_colis ||
      !formData.dimensions_colis ||
      !formData.date_livraison_colis
    ) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires du colis");
      return;
    }

    const poids = parsePoidsKg(formData.poids_colis);
    if (!Number.isFinite(poids) || poids < 0) {
      Alert.alert("Erreur", "Poids invalide (ex. 2 ou 2,5 en kg)");
      return;
    }

    const dateLivraison = parseDeliveryDateInput(formData.date_livraison_colis);
    if (!dateLivraison) {
      Alert.alert(
        "Erreur",
        "Date de livraison invalide. Utilisez AAAA-MM-JJ ou JJ/MM/AAAA.",
      );
      return;
    }

    const valeur = parsePoidsKg(formData.valeur_declaree_colis || "0");
    const valeurFinale = Number.isFinite(valeur) && valeur >= 0 ? valeur : 0;

    const sessionToken = token || (await getToken());
    if (!sessionToken) {
      Alert.alert("Session", "Reconnectez-vous pour enregistrer un colis.");
      return;
    }

    setLoading(true);
    try {
      const images_colis = [];
      for (const uri of images) {
        if (isRemoteImageUrl(uri)) {
          images_colis.push(String(uri).trim());
        } else {
          const serverUrl = await uploadColisPhotoToServer(uri, compagnieId, sessionToken);
          images_colis.push(serverUrl);
        }
      }

      const payload = {
        expediteur_id: Number(expediteurUser.id),
        destinataire_id: Number(destinataireUser.id),
        compagnie_id: Number(compagnieId),
        nom_colis: String(formData.nom_colis).trim(),
        description_colis: String(formData.description_colis).trim(),
        poids_colis: poids,
        dimensions_colis: String(formData.dimensions_colis).trim(),
        valeur_declaree_colis: valeurFinale,
        date_livraison_colis: dateLivraison,
        images_colis,
      };
      await authClient.post("/api/colis/", payload, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      Alert.alert("Succès", "Colis enregistré avec succès");
      resetForm();
    } catch (error) {
      Alert.alert("Erreur", formatAxiosErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const UserSummaryCard = ({ title, u }) =>
    u ? (
      <View style={styles.userCard}>
        <Text style={styles.userCardTitle}>{title}</Text>
        <Text style={styles.userLine}>
          <Text style={styles.userLabel}>Nom : </Text>
          {u.nom || "—"}
        </Text>
        <Text style={styles.userLine}>
          <Text style={styles.userLabel}>Prénom : </Text>
          {u.prenom || "—"}
        </Text>
        <Text style={styles.userLine}>
          <Text style={styles.userLabel}>Téléphone : </Text>
          {u.numero_telephone || "—"}
        </Text>
      </View>
    ) : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enregistrement Colis</Text>
        <Text style={styles.subtitle}>Compagnie #{compagnieId || "-"}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Expéditeur</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            placeholder="Numéro (ex: 68248590)"
            keyboardType="phone-pad"
            value={expediteurPhone}
            onChangeText={(t) => {
              setExpediteurPhone(t);
              setExpediteurUser(null);
            }}
          />
          <TouchableOpacity
            style={styles.lookupBtn}
            onPress={handleLookupExpediteur}
            disabled={loadingExp}
          >
            {loadingExp ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.lookupBtnText}>Rechercher</Text>
            )}
          </TouchableOpacity>
        </View>
        <UserSummaryCard title="Expéditeur identifié" u={expediteurUser} />

        <Text style={styles.sectionTitle}>Destinataire</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            placeholder="Numéro du destinataire"
            keyboardType="phone-pad"
            value={destinatairePhone}
            onChangeText={(t) => {
              setDestinatairePhone(t);
              setDestinataireUser(null);
            }}
          />
          <TouchableOpacity
            style={styles.lookupBtn}
            onPress={handleLookupDestinataire}
            disabled={loadingDest}
          >
            {loadingDest ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.lookupBtnText}>Rechercher</Text>
            )}
          </TouchableOpacity>
        </View>
        <UserSummaryCard title="Destinataire identifié" u={destinataireUser} />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du Colis *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Ordinateur portable"
            value={formData.nom_colis}
            onChangeText={(text) => setFormData((p) => ({ ...p, nom_colis: text }))}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description détaillée"
            multiline
            numberOfLines={3}
            value={formData.description_colis}
            onChangeText={(text) => setFormData((p) => ({ ...p, description_colis: text }))}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Poids (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="2.5"
              keyboardType="numeric"
              value={formData.poids_colis}
              onChangeText={(text) => setFormData((p) => ({ ...p, poids_colis: text }))}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Dimensions *</Text>
            <TextInput
              style={styles.input}
              placeholder="30x20x10 cm"
              value={formData.dimensions_colis}
              onChangeText={(text) => setFormData((p) => ({ ...p, dimensions_colis: text }))}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Valeur déclarée (FCFA)</Text>
            <TextInput
              style={styles.input}
              placeholder="234500"
              keyboardType="numeric"
              value={formData.valeur_declaree_colis}
              onChangeText={(text) =>
                setFormData((p) => ({ ...p, valeur_declaree_colis: text }))
              }
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date livraison *</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-04-10"
              value={formData.date_livraison_colis}
              onChangeText={(text) =>
                setFormData((p) => ({ ...p, date_livraison_colis: text }))
              }
            />
          </View>
        </View>

        <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
          <MaterialIcons name="photo-camera" size={24} color={COLORS.primary} />
          <Text style={styles.imageButtonText}>Ajouter des photos</Text>
        </TouchableOpacity>
        <Text style={styles.hintImages}>
          Les photos choisies sont envoyées sur le serveur avant la création du colis (formats
          image courants, taille max. 5 Mo par fichier).
        </Text>

        {images.length > 0 && (
          <ScrollView horizontal style={styles.imagePreviewContainer}>
            {images.map((img, index) => (
              <Image key={`${img}-${index}`} source={{ uri: img }} style={styles.previewImage} />
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Enregistrer le colis</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSoft,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textStrong,
    marginTop: 8,
    marginBottom: 8,
  },
  form: {
    padding: 20,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  lookupBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  lookupBtnText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  userLine: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  userLabel: {
    fontWeight: "600",
    color: COLORS.textStrong,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textStrong,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 0,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hintImages: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
    lineHeight: 18,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  imageButtonText: {
    color: COLORS.primary,
    marginLeft: 10,
    fontSize: 16,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
