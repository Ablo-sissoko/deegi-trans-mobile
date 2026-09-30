import React, { useState, useEffect } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { Phone, Lock } from "lucide-react-native";   
import Toast from "react-native-toast-message";
import COLORS from "../utils/COLORS";
import { loginRequest } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const { signIn } = useAuth();
  const presetPhone = route.params?.numero_telephone ?? "";

  const [numero_telephone, setNumeroTelephone] = useState(presetPhone);
  useEffect(() => {
    if (route.params?.numero_telephone) {
      setNumeroTelephone(route.params.numero_telephone);
    }
  }, [route.params?.numero_telephone]);
  const [mot_de_passe, setMotDePasse] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const phone = String(numero_telephone).trim();
    if (!phone || !mot_de_passe) {
      Toast.show({
        text1: "Champs requis",
        text2: "Téléphone et mot de passe sont obligatoires",
        type: "error",
      });
      return;
    }
    setLoading(true);
    try {
      const data = await loginRequest({ numero_telephone: phone, mot_de_passe });
      if (data.token && data.user) {
        await signIn(data.token, data.user);
        Toast.show({
          text1: "Connexion réussie",
          text2: `Bonjour ${data.user.prenom}`,
          type: "success",
        });
      } else {
        Toast.show({
          text1: "Réponse inattendue",
          text2: "Réessayez plus tard",
          type: "error",
        });
      }
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.msg ||
        e.message ||
        "Erreur réseau";
      Toast.show({ text1: "Connexion impossible", text2: String(msg), type: "error" });
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
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>
            Connectez-vous avec votre numéro de téléphone
          </Text>

          <View style={styles.card}>
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
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.footerLink}>S&apos;inscrire</Text>
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
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: COLORS.white,
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    color: COLORS.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
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
