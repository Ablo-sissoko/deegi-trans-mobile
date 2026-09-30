import React from "react";
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from "react-native";
import { Phone, Mail, HelpCircle, Shield, Clock, Bus } from "lucide-react-native";
import ScreenShell from "../../components/ScreenShell";
import COLORS from "../../utils/COLORS";

const FAQ = [
  {
    q: "Comment réserver un billet ?",
    a: "Depuis l'accueil, choisissez départ, destination et date, puis sélectionnez un trajet et payez en ligne.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui, depuis Mes billets tant que le trajet n'est pas passé et le billet non utilisé.",
  },
  {
    q: "Comment envoyer un colis ?",
    a: "Rendez-vous en gare ou utilisez l'onglet Colis pour voir vos envois et leur statut.",
  },
  {
    q: "Où trouver mon QR code billet ?",
    a: "Dans Mes billets, ouvrez la réservation confirmée pour afficher ou télécharger le PDF.",
  },
];

const CONTACTS = [
  { label: "Assistance téléphonique", value: "+223 20 20 20 20", icon: Phone, action: "tel:+22320202020" },
  { label: "Email support", value: "support@deegitrans.com", icon: Mail, action: "mailto:support@deegitrans.com" },
];

export default function AssistanceTransport() {
  return (
    <ScreenShell title="Assistance voyage" subtitle="Aide, FAQ et contacts">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <HelpCircle size={28} color={COLORS.primary} />
          <Text style={styles.heroTitle}>Besoin d'aide ?</Text>
          <Text style={styles.heroText}>
            Retrouvez les réponses aux questions fréquentes sur les billets, colis et embarquement.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        {FAQ.map((item) => (
          <View key={item.q} style={styles.faqCard}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Contacts</Text>
        {CONTACTS.map((c) => {
          const Icon = c.icon;
          return (
            <TouchableOpacity
              key={c.label}
              style={styles.contactCard}
              onPress={() => Linking.openURL(c.action)}
              activeOpacity={0.85}
            >
              <Icon size={20} color={COLORS.primary} />
              <View style={styles.contactBody}>
                <Text style={styles.contactLabel}>{c.label}</Text>
                <Text style={styles.contactValue}>{c.value}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Conseils embarquement</Text>
          <View style={styles.tipRow}>
            <Clock size={16} color={COLORS.muted} />
            <Text style={styles.tipText}>Présentez-vous 30 min avant le départ en gare.</Text>
          </View>
          <View style={styles.tipRow}>
            <Shield size={16} color={COLORS.muted} />
            <Text style={styles.tipText}>Gardez votre pièce d'identité et votre billet (QR ou PDF).</Text>
          </View>
          <View style={styles.tipRow}>
            <Bus size={16} color={COLORS.muted} />
            <Text style={styles.tipText}>Vérifiez le numéro de bus affiché avant embarquement.</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  hero: {
    backgroundColor: COLORS.lightOrange || "#FFF3E0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  heroTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textStrong, marginTop: 8 },
  heroText: { fontSize: 13, color: COLORS.muted, textAlign: "center", marginTop: 6, lineHeight: 19 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  faqCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqQ: { fontSize: 14, fontWeight: "700", color: COLORS.textStrong, marginBottom: 6 },
  faqA: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactBody: { flex: 1 },
  contactLabel: { fontSize: 12, color: COLORS.muted },
  contactValue: { fontSize: 14, fontWeight: "600", color: COLORS.primary, marginTop: 2 },
  tipsCard: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipsTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textStrong, marginBottom: 10 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  tipText: { flex: 1, fontSize: 13, color: COLORS.muted, lineHeight: 18 },
});
