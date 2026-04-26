import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import {
  Calendar,
  Ticket,
  MapPin,
  Users,
  Printer,
  Building2,
  ArrowLeftRight,
} from "lucide-react-native";
import { WebView } from "react-native-webview";
import Header from "../components/Header";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import COLORS from "../utils/COLORS";
import { authClient } from "../api/auth";
import { API_BASE_URL } from "../config/api";
import { getToken } from "../auths/authStorage";

const API_ROOT = String(API_BASE_URL || "").replace(/\/$/, "");

const isReservationActive = (r) => {
  const s = String(r?.statut || "").toUpperCase();
  if (s === "ANNULE") return false;
  const bs = String(r?.billet?.statut || "").toUpperCase();
  if (bs === "ANNULE" || bs === "UTILISE") return false;
  const trajet = r?.trajet;
  if (!trajet?.date_depart) return true;
  const d = new Date(`${trajet.date_depart}T${trajet.heure_depart || "23:59"}:00`);
  return d.getTime() >= Date.now() - 24 * 60 * 60 * 1000;
};

const getCancellationBlockReason = (r) => {
  const st = String(r?.statut || "").toUpperCase();
  if (st === "ANNULE") return "Réservation déjà annulée";
  const bs = String(r?.billet?.statut || "").toUpperCase();
  if (bs === "UTILISE") return "Billet déjà utilisé";
  const tr = r?.trajet;
  if (tr?.date_depart) {
    const d = new Date(`${tr.date_depart}T${tr.heure_depart || "23:59"}:00`);
    if (d.getTime() < Date.now()) return "Trajet déjà passé";
  }
  return null;
};

const totalPayeReservation = (r) => {
  const billetTotal = r?.billet?.prix_total;
  if (billetTotal != null && !Number.isNaN(Number(billetTotal))) {
    return Number(billetTotal);
  }
  const nb = r.passagers?.length ?? r.nombre_places ?? 0;
  const unit = Number(r?.trajet?.prix ?? 0);
  return Number((unit * Math.max(0, nb)).toFixed(2));
};

const formatPrice = (prix) =>
  `${Number(prix || 0).toLocaleString("fr-FR")} FCFA`;

const pdfFullUrl = (billet) => {
  if (!billet?.pdf_url) return null;
  if (billet.pdf_url.startsWith("http")) return billet.pdf_url;
  return `${API_ROOT}${billet.pdf_url}`;
};

// Version améliorée pour l'affichage des PDF
const getPdfViewerUrl = (pdfUrl) => {
  if (!pdfUrl) return null;
  
  // Pour Android, utiliser Google Viewer (plus fiable)
  if (Platform.OS === "android") {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
  }
  
  // Pour iOS, le WebView gère nativement les PDF
  return pdfUrl;
};

export default function MesTickets() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [selectedBillet, setSelectedBillet] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const detailsSheetRef = useRef(null);
  const detailsSnapPoints = useMemo(() => ["90%"], []);

  const loadReservations = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setReservations([]);
      setLoading(false);
      return 0;
    }
    try {
      const { data } = await authClient.get("/api/reservations/mes-reservations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(data?.reservations) ? data.reservations : [];
      setReservations(list);
      return list.length;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur chargement";
      Toast.show({ type: "error", text1: "Tickets", text2: String(msg) });
      setReservations([]);
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReservations();
    }, [loadReservations])
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const n = await loadReservations();
    setRefreshing(false);
    Toast.show({
      text1: "Tickets",
      text2: `${n} réservation(s)`,
      type: "success",
    });
  }, [loadReservations]);

  const formatDate = (dateStr) => {
    const dateObj = new Date(`${dateStr}T12:00:00`);
    return dateObj.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const openPdf = (billet) => {
    console.log("billet", billet);
    const url = pdfFullUrl(billet);
    console.log("url", url);
    
    if (!url) {
      Toast.show({
        type: "error",
        text1: "PDF indisponible",
        text2: "Ce billet n'a pas encore de document.",
      });
      return;
    }
    setSelectedBillet(billet);
    setPdfUrl(url);
    detailsSheetRef.current?.expand();
  };

  const closeSheet = () => {
    detailsSheetRef.current?.close();
    setPdfUrl(null);
    setSelectedBillet(null);
  };

  const handlePrint = () => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl);
    }
  };

  const trajetMeta = (r) => r?.trajet?.trajetModele || {};
  const depart = (r) => trajetMeta(r)?.villeDepart?.nom || "—";
  const arrivee = (r) => trajetMeta(r)?.villeArrivee?.nom || "—";
  const nomCompagnie = (r) =>
    trajetMeta(r)?.compagnie?.nom_compagnie?.trim() || "—";

  const labelTypeBillet = (billet, trajetFallback) => {
    const ty = String(billet?.type || trajetFallback?.type || "").toUpperCase();
    if (ty === "ALLER_RETOUR" || ty.includes("RETOUR")) return "Aller-retour";
    return "Aller simple";
  };

  const viewerUrl = pdfUrl ? getPdfViewerUrl(pdfUrl) : null;

  const confirmAnnulerReservation = useCallback(async () => {
    if (!cancelTarget?.id) {
     
      return;
    }
    setCancelLoading(true);
   

    try {
      const token = await getToken();
      if (!token) {
       
        Toast.show({
          type: "error",
          text1: "Session expirée",
          text2: "Reconnectez-vous pour annuler une réservation.",
        });
        return;
      }
      await authClient.post(`/api/reservations/${cancelTarget.id}/annuler`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[Tickets] Annulation réussie:", cancelTarget.id);
      Toast.show({
        type: "success",
        text1: "Réservation annulée",
        text2: "Vos places ont été libérées.",
      });
      setCancelTarget(null);
      await loadReservations();
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Annulation impossible";
      console.log("[Tickets] Annulation en échec:", msg);
      Toast.show({ type: "error", text1: "Annulation", text2: String(msg) });
    } finally {
      setCancelLoading(false);
    }
  }, [cancelTarget, loadReservations]);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Mes tickets</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "Chargement…" : `${reservations.length} réservation(s)`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : reservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ticket size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              Aucun ticket. Connectez-vous ou réservez un voyage.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate("Accueil")}
            >
              <Text style={styles.emptyButtonText}>Réserver un voyage</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reservations.map((r) => {
            const actif = isReservationActive(r);
            const t = r.trajet;
            const nb = r.passagers?.length ?? r.nombre_places ?? 0;
            return (
              <View key={String(r.id)} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardPressable}
                  activeOpacity={0.92}
                  onPress={() => setCancelTarget(r)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.routeContainer}>
                      <MapPin size={16} color={COLORS.primary} />
                      <Text style={styles.route} numberOfLines={1}>
                        {depart(r)} → {arrivee(r)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        actif ? styles.badgeActive : styles.badgePassed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          !actif && { color: COLORS.muted },
                        ]}
                      >
                        {actif ? "● Actif" : "○ Terminé"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailItem}>
                      <Calendar size={14} color={COLORS.muted} />
                      <Text style={styles.detailText}>
                        {t?.date_depart
                          ? `${formatDate(t.date_depart)} · ${t.heure_depart || ""}`
                          : "—"}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Building2 size={14} color={COLORS.muted} />
                      <Text style={styles.detailText} numberOfLines={2}>
                        {nomCompagnie(r)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <ArrowLeftRight size={14} color={COLORS.muted} />
                      <Text style={styles.detailText}>
                        {labelTypeBillet(r?.billet, t)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Users size={14} color={COLORS.muted} />
                      <Text style={styles.detailText}>
                        {nb} passager{nb > 1 ? "s" : ""} · {formatPrice(t?.prix)}{" "}
                        / place
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ticket size={14} color={COLORS.muted} />
                      <Text style={styles.detailText}>
                        Total payé · {formatPrice(totalPayeReservation(r))}
                      </Text>
                    </View>
                    {r.billet?.numero_billet ? (
                      <View style={styles.detailItem}>
                        <Ticket size={14} color={COLORS.muted} />
                        <Text style={styles.detailText} numberOfLines={1}>
                          {r.billet.numero_billet}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.cardTapHint}>
                    Toucher pour annuler cette réservation
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => openPdf(r.billet)}
                >
                  <Text style={styles.viewDetailsText}>Voir billet (PDF) →</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* BottomSheet pour l'affichage PDF - Style similaire à SalesScreen */}
      <BottomSheet
        ref={detailsSheetRef}
        index={-1}
        snapPoints={detailsSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        onClose={() => setPdfUrl(null)}
      >
        <BottomSheetFlatList
          data={[]}
          keyExtractor={(_, index) => String(index)}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.pdfModal}>
              <Text style={styles.pdfModalTitle}>
                {selectedBillet?.numero_billet || "Billet"}
              </Text>
              
              {viewerUrl ? (
                <>
                  <View style={styles.pdfWebViewWrap}>
                    <WebView
                      source={{ uri: viewerUrl }}
                      style={styles.pdfWebView}
                      scrollEnabled
                      startInLoadingState
                      originWhitelist={["*"]}
                      mixedContentMode="always"
                      allowsInlineMediaPlayback
                      nestedScrollEnabled
                      androidLayerType="hardware"
                      renderLoading={() => (
                        <View style={styles.pdfLoading}>
                          <ActivityIndicator size="large" color={COLORS.primary} />
                          <Text style={styles.pdfLoadingText}>Chargement du billet...</Text>
                        </View>
                      )}
                      onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error("WebView error: ", nativeEvent);
                        Toast.show({
                          type: "error",
                          text1: "Erreur",
                          text2: "Impossible d'afficher le PDF",
                        });
                      }}
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.pdfPrintButton}
                    onPress={handlePrint}
                  >
                    <Printer size={20} color={COLORS.white} />
                    <Text style={styles.pdfPrintText}>Ouvrir dans le navigateur</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.pdfEmpty}>
                  <Text style={styles.pdfEmptyText}>PDF indisponible</Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.pdfPrintButton, { backgroundColor: COLORS.border, marginTop: 8 }]}
                onPress={closeSheet}
              >
                <Text style={[styles.pdfPrintText, { color: COLORS.text }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </BottomSheet>

      <Modal
        visible={!!cancelTarget}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancelLoading) setCancelTarget(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Annuler la réservation</Text>
            {cancelTarget ? (
              <>
                <Text style={styles.modalRoute}>
                  {depart(cancelTarget)} → {arrivee(cancelTarget)}
                </Text>
                <Text style={styles.modalMeta}>
                  {cancelTarget.trajet?.date_depart
                    ? `${formatDate(cancelTarget.trajet.date_depart)} · ${cancelTarget.trajet.heure_depart || ""}`
                    : "Date non disponible"}
                </Text>
                {getCancellationBlockReason(cancelTarget) ? (
                  <Text style={styles.modalWarn}>
                    Cette réservation risque de ne pas être annulable :{" "}
                    {getCancellationBlockReason(cancelTarget)}.
                  </Text>
                ) : (
                  <Text style={styles.modalWarn}>
                    Les places seront libérées sur ce trajet. Cette action est
                    définitive.
                  </Text>
                )}
              </>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                disabled={cancelLoading}
                onPress={() => setCancelTarget(null)}
              >
                <Text style={styles.modalBtnSecondaryText}>Fermer</Text>
              </TouchableOpacity>
              {cancelTarget ? (
                <TouchableOpacity
                  style={styles.modalBtnDanger}
                  disabled={cancelLoading}
                  onPress={confirmAnnulerReservation}
                >
                  {cancelLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnDangerText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSoft,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  loaderWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 0,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardPressable: {
    padding: 16,
    paddingBottom: 8,
  },
  cardTapHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 8,
    fontStyle: "italic",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  route: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: COLORS.primary + "15",
  },
  badgePassed: {
    backgroundColor: COLORS.muted + "15",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  cardDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.muted,
    flex: 1,
  },
  viewDetailsBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  viewDetailsText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: COLORS.card,
  },
  pdfModal: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    minHeight: Dimensions.get('window').height * 0.85,
  },
  pdfModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 14,
    textAlign: "center",
  },
  pdfWebViewWrap: {
    height: Dimensions.get('window').height * 0.6,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pdfLoading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
  },
  pdfPrintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  pdfPrintText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 16,
  },
  pdfEmpty: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  pdfEmptyText: {
    fontSize: 15,
    color: COLORS.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  modalRoute: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  modalMeta: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 14,
  },
  modalWarn: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  modalBtnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  modalBtnSecondaryText: {
    fontWeight: "600",
    color: COLORS.text,
  },
  modalBtnDanger: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#b91c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnDangerText: {
    fontWeight: "700",
    color: "#fff",
  },
});