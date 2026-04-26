import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Modalize } from "react-native-modalize";
import Toast from "react-native-toast-message";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Users,
  Smartphone,
  Info,
  XCircle,
} from "lucide-react-native";
import { authClient } from "../api/auth";
import COLORS from "../utils/COLORS";
import { resolveApiMediaUrl } from "../utils/mediaUrl";

/** Aligné avec `deegipayResponse.js` côté backend (`gateway_success` + formes historiques). */
function isDeegipaySuccess(body) {
  if (!body || typeof body !== "object") return false;
  if (body.gateway_success === true) return true;
  if (body.status === 1 || body.status === "1") return true;
  if (body.success === true || body.succes === true) return true;
  const code = body.code;
  if (code === 200 || code === "200" || code === 0 || code === "0") return true;
  const nested = body.resultat ?? body.data ?? body.result;
  if (nested && typeof nested === "object") {
    if (nested.status === 1 || nested.status === "1") return true;
    if (nested.success === true || nested.succes === true) return true;
  }
  return false;
}

const ORANGE_MONEY = "orangemoney";

function CompanyLogo({ logoUrl, size = 56 }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const validUrl = (() => {
    if (!logoUrl || logoUrl === "") return null;
    const invalidPatterns = ["logo.com", "example.com", "placeholder.com"];
    const u = String(logoUrl);
    if (invalidPatterns.some((p) => u.includes(p))) return null;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("/uploads")) return resolveApiMediaUrl(u);
    return null;
  })();

  if (!validUrl || failed) {
    return (
      <View style={[stylesLogo.placeholder, { width: size, height: size }]}>
        <Users size={size * 0.42} color="#ccc" />
      </View>
    );
  }

  return (
    <View style={[stylesLogo.wrap, { width: size, height: size }]}>
      {loading ? (
        <View style={stylesLogo.loader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : null}
      <Image
        source={{ uri: validUrl }}
        style={stylesLogo.image}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
    </View>
  );
}

const stylesLogo = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: "100%" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  placeholder: {
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const otpModalRef = useRef(null);

  const {
    selectedTrajet,
    passengers,
    tripType,
    selectedRoute,
    selectedDate,
    companyName,
    companyLogo,
  } = route.params || {};

  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingOption, setLoadingOption] = useState(false);

  const [referenceInterne, setReferenceInterne] = useState(null);
  const [montantServeur, setMontantServeur] = useState(null);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(null);

  const openOtp = useCallback(() => otpModalRef.current?.open(), []);
  const closeOtp = useCallback(() => otpModalRef.current?.close(), []);

  const estimatedTotal = (() => {
    const unit = Number(
      selectedTrajet?.trajetModele?.prix ?? selectedTrajet?.prix ?? 0
    );
    const n = passengers?.length ?? 0;
    if (!Number.isFinite(unit) || unit <= 0 || n < 1) return null;
    return unit * n;
  })();

  /** Proxy serveur → DeegiPay Orange Money uniquement (`DEEGIPAY_*` côté backend). */
  const requestOrangeMoneyOption = async (internalRef) => {
    if (!internalRef) return;
    try {
      const { data: body } = await authClient.post("/api/payments/booking/deegipay/option", {
        reference_interne: internalRef,
        order: internalRef,
        option: ORANGE_MONEY,
        lang: "fr",
      });

      if (!isDeegipaySuccess(body)) {
        throw new Error(body?.message || "Passerelle DeegiPay indisponible");
      }

      openOtp();
    } catch (optErr) {
      const msg =
        optErr?.response?.data?.message ||
        optErr?.message ||
        "Impossible de joindre la passerelle (vérifiez la configuration serveur DeegiPay)";
      Toast.show({
        type: "error",
        text1: "Paiement",
        text2: String(msg),
      });
    }
  };

  /** Étape 1 — crée la transaction côté serveur (montant calculé serveur, pas de billet avant paiement). */
  const handleStartPayment = async () => {
    if (!selectedTrajet?.id || !passengers?.length) {
      Alert.alert("Erreur", "Données de réservation manquantes.", [
        { text: "Retour", onPress: () => navigation.goBack() },
      ]);
      return;
    }

    setLoadingInit(true);
    try {
      const idempotencyKey = `pay-${selectedTrajet.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const { data } = await authClient.post(
        "/api/payments/booking/initiate",
        {
          trajet_id: selectedTrajet.id,
          passagers: passengers,
          nombre_places: passengers.length,
          type: tripType || "ALLER_SIMPLE",
          gateway: ORANGE_MONEY,
          fundingSource: "external",
        },
        {
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
        }
      );

      

      const ref = data.reference_interne || data.transaction?.reference_interne;
      const m = data.montant ?? data.transaction?.montant;
      if (!ref) throw new Error("Référence de paiement manquante");

      setReferenceInterne(ref);
      setMontantServeur(Number(m));
      setPaymentStatus(null);

      setLoadingOption(true);
      try {
        await requestOrangeMoneyOption(ref);
      } finally {
        setLoadingOption(false);
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: error?.response?.data?.message || error?.message || "Initialisation impossible",
      });
    } finally {
      setLoadingInit(false);
    }
  };

  /** Étape 3 — finalise Orange Money via backend, puis confirme la réservation (booking/finalize). */
  const finalizePayment = async () => {
    if (!phone?.trim() || !otp?.trim()) {
      Toast.show({
        type: "error",
        text1: "Champs requis",
        text2: "Numéro et code OTP requis.",
      });
      return;
    }
    if (!referenceInterne) {
      Toast.show({ type: "error", text1: "Session", text2: "Référence manquante." });
      return;
    }


    setLoadingPay(true);
    try {
      const dg = await authClient.post("/api/payments/booking/deegipay/finalize", {
        order: referenceInterne,
        reference_interne: referenceInterne,
        phone: phone.trim(),
        otp: otp.trim(),
      });

      const gatewayOk = isDeegipaySuccess(dg.data);

      await authClient.post("/api/payments/booking/finalize", {
        reference_interne: referenceInterne,
        success: gatewayOk,
        payload: gatewayOk ? { gateway: dg.data, option: ORANGE_MONEY } : { error: dg.data?.message || "Échec passerelle" },
      });

      if (gatewayOk) {
        Toast.show({
          type: "success",
          text1: "Paiement réussi",
          text2: "Votre réservation est confirmée.",
        });
        setPaymentStatus("success");
        closeOtp();
        Alert.alert(
          "Paiement confirmé",
          "Vous pouvez retrouver votre billet dans l’onglet Tickets.",
          [
            {
              text: "Voir mes tickets",
              onPress: () =>
                navigation.navigate("MainTabs", {
                  screen: "Tickets",
                }),
            },
            {
              text: "OK",
              style: "cancel",
              onPress: () =>
                navigation.navigate("MainTabs", {
                  screen: "Tickets",
                }),
            },
          ]
        );
      } else {
        Toast.show({
          type: "error",
          text1: "Paiement refusé",
          text2: dg.data?.message || "Transaction refusée",
        });
        setPaymentStatus("failed");
      }
    } catch (error) {
      console.error(error);
      try {
        await authClient.post("/api/payments/booking/finalize", {
          reference_interne: referenceInterne,
          success: false,
          payload: {
            error: error?.response?.data?.message || error?.message,
          },
        });
      } catch (_) {
        /* ignore */
      }
      Toast.show({
        type: "error",
        text1: "Erreur",
        text2: error?.response?.data?.message || error?.message || "Erreur réseau",
      });
      setPaymentStatus("failed");
    } finally {
      setLoadingPay(false);
    }
  };

  const handleRetryGateway = async () => {
    if (!referenceInterne) return;
    setLoadingOption(true);
    try {
      await requestOrangeMoneyOption(referenceInterne);
    } finally {
      setLoadingOption(false);
    }
  };

  const departLabel =
    selectedTrajet?.trajetModele?.villeDepart?.nom ||
    selectedRoute?.from ||
    selectedTrajet?.ville_depart_nom ||
    "Départ";
  const arriveeLabel =
    selectedTrajet?.trajetModele?.villeArrivee?.nom ||
    selectedRoute?.to ||
    selectedTrajet?.ville_arrivee_nom ||
    "Arrivée";

  const displayCompany = companyName || selectedRoute?.from || "Compagnie";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandRow}>
            <CompanyLogo logoUrl={companyLogo} size={56} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.companyName}>{displayCompany}</Text>
              <Text style={styles.companySub}>Orange Money · DeegiPay</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Récapitulatif</Text>

            <View style={styles.routeInfo}>
              <Text style={styles.routeFrom} numberOfLines={2}>
                {departLabel}
              </Text>
              <View style={styles.routeArrow}>
                <Text style={styles.routeArrowText}>→</Text>
              </View>
              <Text style={styles.routeTo} numberOfLines={2}>
                {arriveeLabel}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Clock size={16} color={COLORS.muted} />
              <Text style={styles.detailsText}>
                Départ : {selectedTrajet?.heure_depart || "--:--"}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Calendar size={16} color={COLORS.muted} />
              <Text style={styles.detailsText}>
                Date :{" "}
                {selectedTrajet?.date_depart ||
                  selectedDate ||
                  new Date().toLocaleDateString("fr-FR")}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Users size={16} color={COLORS.muted} />
              <Text style={styles.detailsText}>Passagers : {passengers?.length ?? 0}</Text>
            </View>

            {estimatedTotal != null ? (
              <Text style={styles.estimateHint}>
                Estimation : {estimatedTotal.toLocaleString("fr-FR")} FCFA (confirmée au paiement)
              </Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total (serveur)</Text>
              <Text style={styles.totalAmount}>
                {montantServeur != null
                  ? `${Number(montantServeur).toLocaleString("fr-FR")} FCFA`
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.paymentInfoCard}>
            <Smartphone size={24} color={COLORS.primary} />
            <Text style={styles.paymentInfoTitle}>Orange Money</Text>
            <Text style={styles.paymentInfoText}>
              Montant calculé par le serveur au moment du paiement — aucune réservation avant encaissement réussi via
              DeegiPay.
            </Text>
            <View style={styles.infoBox}>
              <Info size={18} color={COLORS.warning} />
              <Text style={styles.infoBoxText}>
                Orange Money : composez #144#77# si besoin pour obtenir le code OTP.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payButton, (loadingInit || loadingOption) && styles.disabledButton]}
            onPress={handleStartPayment}
            disabled={loadingInit || loadingOption}
          >
            {loadingInit || loadingOption ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.payButtonText}>Payer avec Orange Money</Text>
            )}
          </TouchableOpacity>

          {referenceInterne ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleRetryGateway}
              disabled={loadingOption}
            >
              <Text style={styles.secondaryBtnText}>Relancer la passerelle Orange Money</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* Modal téléphone + OTP */}
        <Modalize ref={otpModalRef} adjustToContentHeight panGestureEnabled={false}>
          <View style={styles.modalPad}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Orange Money</Text>
              <TouchableOpacity onPress={closeOtp}>
                <XCircle size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.refText} numberOfLines={1}>
              Réf. {referenceInterne || "—"}
            </Text>

            {paymentStatus !== "failed" ? (
              <>
                <Text style={styles.inputLabel}>Numéro (Mobile Money)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex : 771234567"
                  placeholderTextColor={COLORS.muted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <View style={styles.infoMessage}>
                  <Info size={18} color={COLORS.warning} />
                  <Text style={styles.infoMessageText}>
                    Composez <Text style={styles.boldText}>#144#77#</Text> sur Orange si nécessaire.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Code OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Code reçu par SMS / USSD"
                  placeholderTextColor={COLORS.muted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  maxLength={12}
                />

                <TouchableOpacity
                  style={[styles.validateButton, loadingPay && styles.disabledButton]}
                  onPress={finalizePayment}
                  disabled={loadingPay}
                >
                  {loadingPay ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.validateButtonText}>Valider le paiement</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <XCircle size={48} color={COLORS.error} />
                <Text style={styles.errorTitle}>Paiement échoué</Text>
                <Text style={styles.errorText}>Vous pouvez réessayer après vérification du code.</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setPaymentStatus(null);
                    setOtp("");
                  }}
                >
                  <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modalize>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg || "#F5F5F5",
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  content: {
    padding: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  companyName: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  companySub: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  routeFrom: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  routeTo: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "right",
  },
  routeArrow: {
    paddingHorizontal: 16,
  },
  routeArrowText: {
    fontSize: 20,
    color: COLORS.muted,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailsText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textLight,
  },
  estimateHint: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: "italic",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  paymentInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: COLORS.warningLight || "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "stretch",
  },
  infoBoxText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.warning,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  modalPad: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  refText: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  infoMessage: {
    flexDirection: "row",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  infoMessageText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#E65100",
  },
  boldText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  validateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  validateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.error,
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
});
