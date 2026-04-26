import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../utils/COLORS";

export default function ProfileAgent() {
  const { user, role, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialIcons name="badge" size={44} color={COLORS.primary} />
        <Text style={styles.title}>Profil Agent</Text>
        <Text style={styles.name}>
          {user ? `${user.prenom} ${user.nom}`.trim() : "Agent"}
        </Text>
        <Text style={styles.meta}>Role: {String(role).toUpperCase()}</Text>
        <Text style={styles.meta}>Telephone: {user?.numero_telephone || "-"}</Text>
        <Text style={styles.meta}>Compagnie ID: {user?.compagnie_id ?? "-"}</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={COLORS.white} />
          <Text style={styles.logoutText}>Se deconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSoft,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textStrong,
  },
  name: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  meta: {
    marginTop: 6,
    color: COLORS.mutedStrong,
    fontSize: 14,
  },
  logoutBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },
});

