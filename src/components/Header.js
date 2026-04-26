import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Bell, Menu } from "lucide-react-native";
import COLORS from "../utils/COLORS";

const Header = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Pressable
       
        accessibilityRole="button"
        style={styles.header}
      >
        <Pressable style={styles.burgerBtn}>
          <Menu size={30} color={COLORS.textStrong} />
        </Pressable>
       
        <View style={styles.appNameContainer}>
          <Text style={styles.appName}>DEEGITRANS</Text>
          <Text style={styles.appSubtitle}>Tickets & voyages</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate("Notifications")}
        accessibilityRole="button"
        style={styles.notificationBtn}
      >
        <Bell size={22} color={COLORS.textStrong} />
      </Pressable>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  burgerBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  appName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textStrong,
  },
  appSubtitle: {
    fontSize: 11,
    color: COLORS.mutedStrong,
  },
  agentBlock: {
    marginTop: 4,
  },
  agentLabel: {
    fontSize: 11,
    color: COLORS.mutedStrong,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  agentName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textStrong,
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
});