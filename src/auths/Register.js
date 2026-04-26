import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { User, Phone, Lock } from "lucide-react-native";
import Toast from "react-native-toast-message";
import COLORS from "../utils/COLORS";
import { registerRequest } from "../api/auth";

export default function Register() {
  const navigation = useNavigation();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [numero_telephone, setNumeroTelephone] = useState("");
  const [mot_de_passe, setMotDePasse] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const n = String(nom).trim();
    const p = String(prenom).trim();
    const phone = String(numero_telephone).trim();
    if (!n || !p || !phone || !mot_de_passe) {
      Toast.show({
        text1: "Champs requis",
        text2: "Remplissez tous les champs",
        type: "error",
      });
      return;
    }
    if (mot_de_passe.length < 6) {
      Toast.show({
        text1: "Mot de passe trop court",
        text2: "Au moins 6 caractères",
        type: "error",
      });
      return;
    }
    setLoading(true);
    try {
      await registerRequest({
        nom: n,
        prenom: p,
        numero_telephone: phone,
        mot_de_passe,
      });
      Toast.show({
        text1: "Compte créé",
        text2: "Connectez-vous avec votre téléphone",
        type: "success",
      });
      navigation.navigate("Login", { numero_telephone: phone });
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.msg ||
        e.message ||
        "Erreur réseau";
      Toast.show({ text1: "Inscription impossible", text2: String(msg), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}

    >
      <View style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Réservez vos billets et suivez vos trajets en un clic
          </Text>

          <View style={styles.card}>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.half]}>
                <Text style={styles.label}>Nom</Text>
                <View style={styles.input}>
                  <User size={18} color={COLORS.muted} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nom"
                    placeholderTextColor={COLORS.muted}
                    value={nom}
                    onChangeText={setNom}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, styles.half]}>
                <Text style={styles.label}>Prénom</Text>
                <View style={styles.input}>
                  <User size={18} color={COLORS.muted} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Prénom"
                    placeholderTextColor={COLORS.muted}
                    value={prenom}
                    onChangeText={setPrenom}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <View style={styles.input}>
                <Phone size={18} color={COLORS.muted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="+223 70 12 34 56"
                  placeholderTextColor={COLORS.muted}
                  value={numero_telephone}
                  onChangeText={setNumeroTelephone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.input}>
                <Lock size={18} color={COLORS.muted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.muted}
                  value={mot_de_passe}
                  onChangeText={setMotDePasse}
                  secureTextEntry
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>S&apos;inscrire</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSoft,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.muted,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 0,
  },
  half: {
    flex: 1,
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: COLORS.muted,
    marginBottom: 5,
    fontSize: 14,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 50,
    backgroundColor: COLORS.white,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 20,
    flexWrap: "wrap",
  },
  footerMuted: {
    color: COLORS.muted,
    fontSize: 15,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 15,
  },
});
