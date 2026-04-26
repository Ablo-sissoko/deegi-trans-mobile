import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LogOut, Phone } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import COLORS from "../utils/COLORS";
import Toast from "react-native-toast-message";

export default function Profile() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            await signOut();
            Toast.show({
              type: "success",
              text1: "Déconnecté",
            });
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Utilisateur non connecté</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* CARD PRINCIPALE */}
      <View style={styles.profileCard}>
        
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.prenom?.[0]}
            {user.nom?.[0]}
          </Text>
        </View>

        {/* Nom complet */}
        <Text style={styles.name}>
          {user.prenom} {user.nom}
        </Text>

        {/* Téléphone */}
        <View style={styles.phoneContainer}>
          <Phone size={16} color={COLORS.primary} />
          <Text style={styles.phone}>
            +223 {user.numero_telephone}
          </Text>
        </View>
      </View>

      {/* SECTION INFOS */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Informations</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nom</Text>
          <Text style={styles.infoValue}>{user.nom}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Prénom</Text>
          <Text style={styles.infoValue}>{user.prenom}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Téléphone</Text>
          <Text style={styles.infoValue}>
            +223 {user.numero_telephone}
          </Text>
        </View>
      </View>

      {/* BOUTON LOGOUT */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color="#fff" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    padding: 20,
  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    padding: 25,
    marginBottom: 20,
    elevation: 3,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  phone: {
    color: "#666",
    fontSize: 14,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  infoLabel: {
    color: "#888",
  },

  infoValue: {
    fontWeight: "600",
  },

  logoutBtn: {
    backgroundColor: "#FF3B30",
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
  },
});