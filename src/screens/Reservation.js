import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Info,
  Check,
  Smartphone,
  CreditCard,
} from "lucide-react-native";
import COLORS from "../utils/COLORS";

const PAYMENT_METHODS = [
  {
    id: "om",
    nom: "Orange Money",
    mots_cle: "orangemoney",
    hint: "Mobile · code #144#77#",
    mark: "OM",
    tint: "#FF7900",
    Icon: Smartphone,
  },
  {
    id: "moov",
    nom: "Moov Money",
    mots_cle: "moovmoney",
    hint: "Paiement mobile",
    mark: "MM",
    tint: "#0057A8",
    Icon: Smartphone,
  },
  {
    id: "wave",
    nom: "Wave",
    mots_cle: "wave",
    hint: "Portefeuille Wave",
    mark: "WV",
    tint: "#1AA6D6",
    Icon: Smartphone,
  },
  {
    id: "carte",
    nom: "Carte bancaire",
    mots_cle: "carte",
    hint: "Visa ou Mastercard",
    mark: "CB",
    tint: "#0B1F3A",
    Icon: CreditCard,
  },
];

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("fr-FR")} FCFA`;
}

function formatDateLabel(value) {
  if (!value) return "Date à confirmer";
  const parts = String(value).split("-").map(Number);
  const dateObj =
    parts.length === 3 && parts.every((n) => Number.isFinite(n))
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(value);
  if (Number.isNaN(dateObj.getTime())) return String(value);
  return dateObj.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function initials(prenom, nom) {
  const a = (prenom || "").trim().charAt(0);
  const b = (nom || "").trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "•";
}

const STEPS = [
  { id: 1, label: "Passagers" },
  { id: 2, label: "Mode" },
  { id: 3, label: "Paiement" },
];

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function isPaymentReady(method, fields) {
  if (!method) return false;
  const phoneOk = digitsOnly(fields.phone).length >= 8;
  const codeOk = digitsOnly(fields.otp).length >= 4;
  if (method.mots_cle === "orangemoney" || method.mots_cle === "moovmoney") {
    return phoneOk && codeOk;
  }
  if (method.mots_cle === "wave") return phoneOk;
  const numberOk = digitsOnly(fields.cardNumber).length >= 12;
  const cvvOk = digitsOnly(fields.cvv).length >= 3;
  const expiryOk = /^\d{2}\/\d{2}$/.test(String(fields.expiry || "").trim());
  return fields.holder.trim().length >= 2 && numberOk && expiryOk && cvvOk;
}

export default function Reservation() {
  const navigation = useNavigation();
  const route = useRoute();
  const trip = route.params?.trip;
  const date = route.params?.date;

  const [draftNom, setDraftNom] = useState("");
  const [draftPrenom, setDraftPrenom] = useState("");
  const [passagers, setPassagers] = useState([]);
  const [step, setStep] = useState(1);
  const [methodId, setMethodId] = useState("om");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [holder, setHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const method = useMemo(
    () => PAYMENT_METHODS.find((item) => item.id === methodId) || null,
    [methodId],
  );
  const count = passagers.length;
  const unit = trip?.price || 0;
  const paymentReady = isPaymentReady(method, { phone, otp, holder, cardNumber, expiry, cvv });
  const showConfirm = step === 3 && paymentReady;

  const addPassager = () => {
    const nom = draftNom.trim();
    const prenom = draftPrenom.trim();
    if (!nom || !prenom) {
      Toast.show({
        type: "error",
        text1: "Champs requis",
        text2: "Indiquez le nom et le prénom du passager.",
      });
      return;
    }
    if (trip?.availableSeats && passagers.length >= trip.availableSeats) {
      Toast.show({
        type: "error",
        text1: "Places insuffisantes",
        text2: `Il reste ${trip.availableSeats} place(s) sur ce trajet.`,
      });
      return;
    }
    setPassagers((prev) => [
      ...prev,
      { key: `${Date.now()}-${prev.length}`, nom, prenom },
    ]);
    setDraftNom("");
    setDraftPrenom("");
  };

  const goBack = () => {
    if (step > 1) setStep((current) => current - 1);
    else navigation.goBack();
  };

  const goNext = () => {
    if (step === 1) {
      if (count < 1) {
        Toast.show({
          type: "error",
          text1: "Ajoutez des passagers",
          text2: "Saisissez un nom et un prénom, puis appuyez sur Ajouter.",
        });
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!method) {
        Toast.show({
          type: "error",
          text1: "Moyen de paiement",
          text2: "Choisissez comment vous souhaitez payer.",
        });
        return;
      }
      setStep(3);
      return;
    }
    if (paymentReady) confirm();
  };

  const confirm = async () => {
    if (!trip || !method) return;

    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      Toast.show({
        type: "success",
        text1: "Réservation (démo)",
        text2: `${count} place(s) · ${method.nom} · ${formatPrice(unit * count)}`,
      });
      navigation.navigate("AppRoot", {
        screen: "MainTabs",
        params: { screen: "Accueil" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Aucun trajet sélectionné</Text>
        <Text style={styles.emptyText}>Revenez à la liste pour choisir un départ.</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.emptyBtnText}>Retour aux trajets</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={20} color={COLORS.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Finaliser</Text>
          <Text style={styles.headerSubtitle}>
            {step === 1 ? "Qui voyage ?" : step === 2 ? "Choisissez un moyen" : method?.nom}
          </Text>
        </View>
      </View>

      <View style={styles.steps}>
        {STEPS.map((item) => {
          const active = step === item.id;
          const done = step > item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.stepMark, active && styles.stepMarkOn, done && styles.stepMarkDone]}
              onPress={() => {
                if (item.id < step) setStep(item.id);
              }}
              disabled={item.id > step}
              activeOpacity={0.85}
            >
              <View style={[styles.stepDot, active && styles.stepDotOn, done && styles.stepDotDone]}>
                {done ? (
                  <Check size={12} color={COLORS.white} strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepDotText, active && styles.stepDotTextOn]}>{item.id}</Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  done && styles.stepLabelDone,
                  active && styles.stepLabelOn,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ticket}>
          <View style={styles.ticketTop}>
            <Image source={{ uri: trip.company.logo }} style={styles.logo} />
            <View style={styles.ticketIdentity}>
              <Text style={styles.company} numberOfLines={1}>
                {trip.company.name}
              </Text>
              <Text style={styles.busType}>
                {trip.busType || "Bus"} · {formatDateLabel(date)}
              </Text>
            </View>
          </View>

          <View style={styles.route}>
            <View style={styles.routeCol}>
              <Text style={styles.time}>{trip.departure.time}</Text>
              <Text style={styles.city} numberOfLines={1}>
                {trip.departure.city}
              </Text>
              <Text style={styles.place} numberOfLines={1}>
                {trip.departure.location}
              </Text>
            </View>

            <View style={styles.routeMid}>
              <View style={styles.routeLine} />
              <View style={styles.durationPill}>
                <Text style={styles.durationText}>{trip.duration}</Text>
              </View>
              <View style={styles.routeLine} />
            </View>

            <View style={[styles.routeCol, styles.routeColEnd]}>
              <Text style={styles.time}>{trip.arrival.time}</Text>
              <Text style={[styles.city, styles.alignEnd]} numberOfLines={1}>
                {trip.arrival.city}
              </Text>
              <Text style={[styles.place, styles.alignEnd]} numberOfLines={1}>
                {trip.arrival.location}
              </Text>
            </View>
          </View>
        </View>

        {step === 1 ? (
        <>
        <View style={styles.sectionHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Passagers</Text>
            <Text style={styles.sectionCaption}>
              {trip.availableSeats} place{trip.availableSeats > 1 ? "s" : ""} restante
              {trip.availableSeats > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                placeholder="FAMILLE"
                placeholderTextColor={COLORS.mutedStrong}
                value={draftNom}
                onChangeText={setDraftNom}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.nameField}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                style={styles.input}
                placeholder="Prénom"
                placeholderTextColor={COLORS.mutedStrong}
                value={draftPrenom}
                onChangeText={setDraftPrenom}
                autoCapitalize="words"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={addPassager} activeOpacity={0.85}>
            <UserPlus size={16} color={COLORS.primary} />
            <Text style={styles.addBtnText}>Ajouter ce passager</Text>
          </TouchableOpacity>

          {count > 0 ? (
            <View style={styles.passengerList}>
              {passagers.map((p, index) => (
                <View key={p.key} style={styles.passenger}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(p.prenom, p.nom)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passengerName}>
                      {p.prenom} {p.nom}
                    </Text>
                    <Text style={styles.passengerMeta}>Passager {index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      setPassagers((prev) => prev.filter((item) => item.key !== p.key))
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPassengers}>
              Aucun passager pour le moment. Le prix se met à jour dès le premier ajout.
            </Text>
          )}
        </View>
        </>
        ) : null}

        {step === 2 ? (
        <>
        <View style={styles.sectionHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Mode de paiement</Text>
            <Text style={styles.sectionCaption}>Un seul choix pour continuer</Text>
          </View>
        </View>

        <View style={styles.payGrid}>
          {PAYMENT_METHODS.map((item) => {
            const selected = methodId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.payCard, selected && styles.payCardOn]}
                onPress={() => setMethodId(item.id)}
                activeOpacity={0.88}
              >
                <View style={styles.payCardTop}>
                  <View style={[styles.payMark, { backgroundColor: item.tint }]}>
                    <Text style={styles.payMarkText}>{item.mark}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>
                    {selected ? <Check size={12} color={COLORS.white} strokeWidth={3} /> : null}
                  </View>
                </View>
                <Text style={styles.payName}>{item.nom}</Text>
                <Text style={styles.payHint}>{item.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        </>
        ) : null}

        {step === 3 ? (
          <View style={styles.omCard}>
            <Text style={styles.omTitle}>{method?.nom}</Text>
            {method?.mots_cle === "carte" ? (
              <>
                <Text style={styles.label}>Titulaire</Text>
                <TextInput
                  placeholder="Nom sur la carte"
                  placeholderTextColor={COLORS.mutedStrong}
                  style={styles.input}
                  value={holder}
                  onChangeText={setHolder}
                  autoCapitalize="characters"
                />
                <Text style={styles.label}>Numéro</Text>
                <TextInput
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={COLORS.mutedStrong}
                  style={styles.input}
                  value={cardNumber}
                  onChangeText={(value) =>
                    setCardNumber(
                      digitsOnly(value)
                        .slice(0, 16)
                        .replace(/(\d{4})(?=\d)/g, "$1 ")
                        .trim(),
                    )
                  }
                  keyboardType="number-pad"
                />
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <Text style={styles.label}>Expiration</Text>
                    <TextInput
                      placeholder="MM/AA"
                      placeholderTextColor={COLORS.mutedStrong}
                      style={styles.input}
                      value={expiry}
                      onChangeText={(value) => {
                        const digits = digitsOnly(value).slice(0, 4);
                        setExpiry(digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`);
                      }}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      placeholder="123"
                      placeholderTextColor={COLORS.mutedStrong}
                      style={styles.input}
                      value={cvv}
                      onChangeText={(value) => setCvv(digitsOnly(value).slice(0, 3))}
                      keyboardType="number-pad"
                      maxLength={3}
                      secureTextEntry
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Numéro</Text>
                <TextInput
                  placeholder="70 00 00 00"
                  placeholderTextColor={COLORS.mutedStrong}
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                {method?.mots_cle !== "wave" ? (
                  <>
                    <View style={styles.infoBox}>
                      <Info size={16} color={COLORS.primary} />
                      <Text style={styles.infoText}>
                        {method?.mots_cle === "orangemoney" ? (
                          <>
                            Code de paiement via <Text style={styles.ussd}>#144#77#</Text>
                          </>
                        ) : (
                          "Saisissez le code reçu pour valider le paiement."
                        )}
                      </Text>
                    </View>
                    <Text style={styles.label}>Code</Text>
                    <TextInput
                      placeholder="6 chiffres"
                      placeholderTextColor={COLORS.mutedStrong}
                      style={styles.input}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </>
                ) : (
                  <View style={styles.infoBox}>
                    <Info size={16} color={COLORS.primary} />
                    <Text style={styles.infoText}>
                      Le paiement Wave se confirme avec le numéro du portefeuille.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerCopy}>
          <Text style={styles.footerLabel}>
            {count > 0 ? `${formatPrice(unit)} × ${count}` : "Prix par place"}
          </Text>
          <Text style={styles.footerPrice}>{formatPrice(count > 0 ? unit * count : unit)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, (submitting || (step === 3 && !paymentReady)) && styles.payBtnDisabled]}
          onPress={goNext}
          disabled={submitting || (step === 3 && !paymentReady)}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.payBtnText}>{showConfirm ? "Confirmer" : "Suivant"}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    padding: 28,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textStrong,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textStrong,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "500",
  },
  steps: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  stepMark: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stepMarkOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepMarkDone: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primarySoft,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgSoft,
  },
  stepDotOn: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  stepDotDone: {
    backgroundColor: COLORS.primary,
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.muted,
  },
  stepDotTextOn: {
    color: COLORS.white,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  stepLabelOn: {
    color: COLORS.white,
  },
  stepLabelDone: {
    color: COLORS.primary,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  ticket: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
  },
  ticketTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  ticketIdentity: {
    flex: 1,
    minWidth: 0,
  },
  company: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
  busType: {
    marginTop: 2,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  route: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 18,
  },
  routeCol: {
    flex: 1,
  },
  routeColEnd: {
    alignItems: "flex-end",
  },
  time: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  city: {
    marginTop: 2,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  place: {
    marginTop: 2,
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
  },
  alignEnd: {
    textAlign: "right",
  },
  routeMid: {
    width: 92,
    alignItems: "center",
    paddingTop: 10,
    flexDirection: "row",
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  durationPill: {
    marginHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  durationText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionIndex: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIndexText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textStrong,
  },
  sectionCaption: {
    marginTop: 1,
    fontSize: 12,
    color: COLORS.muted,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 22,
  },
  nameRow: {
    flexDirection: "row",
    gap: 10,
  },
  nameField: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textLight,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textStrong,
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.primarySoft,
  },
  addBtnText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  passengerList: {
    marginTop: 14,
    gap: 8,
  },
  passenger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  passengerName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textStrong,
  },
  passengerMeta: {
    marginTop: 1,
    fontSize: 12,
    color: COLORS.muted,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.errorSoft,
  },
  emptyPassengers: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
  },
  payGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  payCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    minHeight: 112,
  },
  payCardOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  payCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  payMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  payMarkText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  payName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textStrong,
  },
  payHint: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.muted,
  },
  omCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 8,
  },
  omTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textStrong,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  ussd: {
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerCopy: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  footerPrice: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textStrong,
    letterSpacing: -0.3,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 14,
    minWidth: 132,
    alignItems: "center",
  },
  payBtnDisabled: {
    opacity: 0.7,
  },
  payBtnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
  },
});
