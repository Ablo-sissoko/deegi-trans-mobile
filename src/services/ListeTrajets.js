import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  MapPin,
  Calendar,
  Clock,
  Bus,
  ChevronRight,
  Star,
  Users,
  User,
  UserPlus,
  Trash2,
  ArrowLeft,
  Filter,
  Award,
} from "lucide-react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import COLORS from "../utils/COLORS";
import { authClient } from "../api/auth";
import { API_BASE_URL } from "../config/api";
import { getToken } from "../auths/authStorage";

const LOGO_PLACEHOLDER =
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&q=80";

function resolveLogoUrl(logo) {
  if (!logo || String(logo).trim() === "") return LOGO_PLACEHOLDER;
  const s = String(logo);
  if (/^https?:\/\//i.test(s)) return s;
  const root = String(API_BASE_URL || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return root ? `${root}${path}` : LOGO_PLACEHOLDER;
}

function mapSearchItemToTrip(item, fallbackDate) {
  return {
    id: String(item.id),
    trajetBackendId: item.id,
    company: {
      id: String(item.compagnie?.id ?? ""),
      name: item.compagnie?.nom || "Compagnie",
      logo: resolveLogoUrl(item.compagnie?.logo),
      rating: item.compagnie?.rating ?? 4,
      totalReviews: item.compagnie?.totalReviews ?? 0,
      isPremium: !!item.compagnie?.isPremium,
    },
    departure: {
      city: item.departure?.nom || "",
      time: item.departure?.time || "--:--",
      location: item.departure?.location || "",
    },
    arrival: {
      city: item.arrival?.nom || "",
      time: item.arrival?.time || "--:--",
      location: item.arrival?.location || "",
    },
    duration: item.duration || "—",
    price: Math.round(Number(item.price) || 0),
    availableSeats: item.availableSeats ?? 0,
    totalSeats: item.totalSeats ?? 0,
    busType: item.busType || "STANDARD",
    amenities: Array.isArray(item.amenities) ? item.amenities : [],
    departureDate: item.departure?.date || fallbackDate,
  };
}

export default function ListeTrajets() {
  const navigation = useNavigation();
  const route = useRoute();
  const { departure, destination, date, tripType } = route.params || {};
  const tripTypeApi =
    route.params?.tripTypeApi ||
    (String(route.params?.tripType || '').toLowerCase().includes('retour')
      ? 'ALLER_RETOUR'
      : 'ALLER_SIMPLE');

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showPassengerForm, setShowPassengerForm] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [draftNom, setDraftNom] = useState("");
  const [draftPrenom, setDraftPrenom] = useState("");
  const [passagersList, setPassagersList] = useState([]);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price");
  const [showFilters, setShowFilters] = useState(false);
  
  const filterSheetRef = useRef(null);
  const filterSnapPoints = useMemo(() => ["60%"], []);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const depId = route.params?.departureId;
    const arrId = route.params?.destinationId;
    const dateStr = route.params?.date;
    const tripTypeApi =
      route.params?.tripTypeApi ||
      (String(route.params?.tripType || "").toLowerCase().includes("retour")
        ? "ALLER_RETOUR"
        : "ALLER_SIMPLE");
    const returnDate = route.params?.returnDate;

    if (depId == null || arrId == null || Number.isNaN(Number(depId)) || Number.isNaN(Number(arrId))) {
      setLoadError(
        "Sélectionnez le départ et la destination depuis l’accueil (villes avec identifiant).",
      );
      setTrips([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = {
          departureId: Number(depId),
          arrivalId: Number(arrId),
          date: dateStr,
          tripType: tripTypeApi,
          limit: 50,
          page: 1,
          useCache: "true",
        };
        if (tripTypeApi === "ALLER_RETOUR" && returnDate) {
          params.returnDate = returnDate;
        }
        const { data } = await authClient.get("/api/trajets-inteligents/search/intelligent", {
          params,
        });
        if (cancelled) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        setTrips(list.map((row) => mapSearchItemToTrip(row, dateStr)));
      } catch (e) {
        if (!cancelled) {
          const msg =
            e?.response?.data?.message || e?.message || "Impossible de charger les trajets";
          setLoadError(msg);
          setTrips([]);
          Toast.show({ type: "error", text1: "Trajets", text2: String(msg) });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    route.params?.departureId,
    route.params?.destinationId,
    route.params?.date,
    route.params?.tripType,
    route.params?.tripTypeApi,
    route.params?.returnDate,
  ]);

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

  const formatTime = (time) => {
    return time;
  };

  const formatPrice = (price) => {
    return `${price.toLocaleString()} FCFA`;
  };

  const getFilteredAndSortedTrips = () => {
    let filtered = [...trips];

    if (activeFilter !== "all") {
      if (activeFilter === "premium") {
        filtered = filtered.filter(trip => trip.company.isPremium);
      } else if (activeFilter === "standard") {
        filtered = filtered.filter(trip => !trip.company.isPremium);
      } else if (activeFilter === "morning") {
        filtered = filtered.filter(trip => parseInt(trip.departure.time) < 12);
      } else if (activeFilter === "afternoon") {
        filtered = filtered.filter(trip => parseInt(trip.departure.time) >= 12);
      }
    }

    if (sortBy === "price") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "duration") {
      filtered.sort((a, b) => parseInt(a.duration) - parseInt(b.duration));
    } else if (sortBy === "departure") {
      filtered.sort((a, b) => a.departure.time.localeCompare(b.departure.time));
    }

    return filtered;
  };

  const closePassengerModal = useCallback(() => {
    setShowPassengerForm(false);
    setPassagersList([]);
    setDraftNom("");
    setDraftPrenom("");
    setSelectedTrip(null);
  }, []);

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
    setPassagersList([]);
    setDraftNom("");
    setDraftPrenom("");
    setShowPassengerForm(true);
  };

  const handleAddPassager = () => {
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
    setPassagersList((prev) => [
      ...prev,
      { key: `${Date.now()}-${prev.length}`, nom, prenom },
    ]);
    setDraftNom("");
    setDraftPrenom("");
  };

  const handleRemovePassager = (key) => {
    setPassagersList((prev) => prev.filter((p) => p.key !== key));
  };

  const handlePassengerSubmit = async () => {
    if (!selectedTrip?.trajetBackendId) {
      Toast.show({ type: "error", text1: "Trajet invalide" });
      return;
    }
    if (passagersList.length < 1) {
      Toast.show({
        type: "error",
        text1: "Ajoutez des passagers",
        text2: "Utilisez le bouton « Ajouter » après avoir saisi nom et prénom.",
      });
      return;
    }
    const places = passagersList.length;
    if (places > selectedTrip.availableSeats) {
      Toast.show({
        type: "error",
        text1: "Places insuffisantes",
        text2: `Il reste ${selectedTrip.availableSeats} place(s) sur ce trajet.`,
      });
      return;
    }

    const token = await getToken();
    if (!token) {
      Toast.show({
        type: "error",
        text1: "Connexion requise",
        text2: "Connectez-vous pour effectuer une réservation.",
      });
      return;
    }

    setSubmittingReservation(true);
    try {
      await authClient.post(
        "/api/reservations",
        {
          trajet_id: selectedTrip.trajetBackendId,
          nombre_places: places,
          type: tripTypeApi,
          passagers: passagersList.map(({ nom, prenom }) => ({
            nom: String(nom).trim(),
            prenom: String(prenom).trim(),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      closePassengerModal();
      Toast.show({
        type: "success",
        text1: "Merci d'avoir réservé",
        text2: "Votre réservation est enregistrée. Retrouvez votre billet dans Tickets.",
      });
      navigation.navigate("MainTabs", { screen: "Accueil" });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur";
      Toast.show({
        type: "error",
        text1: "Réservation impossible",
        text2: String(msg),
      });
    } finally {
      setSubmittingReservation(false);
    }
  };

  const renderAmenities = (amenities) => {
    const icons = {
      "Climatisation": "❄️",
      "WiFi": "📶",
      "Prise électrique": "🔌",
      "TV": "📺",
    };
    
    return amenities.slice(0, 3).map((amenity, index) => (
      <View key={index} style={styles.amenityTag}>
        <Text style={styles.amenityText}>
          {icons[amenity] || "✓"} {amenity}
        </Text>
      </View>
    ));
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        <Star size={12} color={COLORS.warning} fill={COLORS.warning} />
        <Text style={styles.ratingText}>{rating}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSoft} />
     
      
      {/* Header avec infos de recherche */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchInfo}>
          <View style={styles.routeInfo}>
            <MapPin size={16} color={COLORS.primary} />
            <Text style={styles.routeText}>
              {departure} → {destination}
            </Text>
          </View>
          <View style={styles.dateInfo}>
            <Calendar size={14} color={COLORS.muted} />
            <Text style={styles.dateText}>
              {date ? new Date(date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }) : "Date non spécifiée"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => filterSheetRef.current?.expand()} style={styles.filterButton}>
          <Filter size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Résultats */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tripsList}>
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Recherche des trajets…</Text>
          </View>
        ) : loadError ? (
          <Text style={styles.loadErrorText}>{loadError}</Text>
        ) : (
          <>
        <Text style={styles.resultsCount}>
          {getFilteredAndSortedTrips().length} trajet(s) trouvé(s)
        </Text>

        {getFilteredAndSortedTrips().length === 0 ? (
          <Text style={styles.emptyText}>Aucun trajet pour cette date et cette route.</Text>
        ) : null}

        {getFilteredAndSortedTrips().map((trip) => (
          <TouchableOpacity
            key={trip.id}
            style={styles.tripCard}
            onPress={() => handleSelectTrip(trip)}
            activeOpacity={0.8}
          >
            {/* En-tête compagnie */}
            <View style={styles.companyHeader}>
              <Image source={{ uri: trip.company.logo }} style={styles.companyLogo} />
              <View style={styles.companyInfo}>
                <View style={styles.companyNameRow}>
                  <Text style={styles.companyName}>{trip.company.name}</Text>
                  {trip.company.isPremium && (
                    <View style={styles.premiumBadge}>
                      <Award size={12} color={COLORS.primary} />
                      <Text style={styles.premiumText}>Premium</Text>
                    </View>
                  )}
                </View>
                <View style={styles.ratingRow}>
                  {renderStars(trip.company.rating)}
                  <Text style={styles.reviewsCount}>({trip.company.totalReviews} avis)</Text>
                </View>
              </View>
            </View>

            {/* Horaires */}
            <View style={styles.scheduleContainer}>
              <View style={styles.timePoint}>
                <Text style={styles.time}>{trip.departure.time}</Text>
                <Text style={styles.location}>{trip.departure.location}</Text>
              </View>
              <View style={styles.durationContainer}>
                <View style={styles.line} />
                <Text style={styles.duration}>{trip.duration}</Text>
                <View style={styles.line} />
              </View>
              <View style={styles.timePoint}>
                <Text style={styles.time}>{trip.arrival.time}</Text>
                <Text style={styles.location}>{trip.arrival.location}</Text>
              </View>
            </View>

            {/* Infos bus */}
            <View style={styles.busInfo}>
              <Bus size={14} color={COLORS.muted} />
              <Text style={styles.busType}>{trip.busType}</Text>
              <View style={styles.separator} />
              <Users size={14} color={COLORS.muted} />
              <Text style={styles.seats}>
                {trip.availableSeats} places disponibles
              </Text>
            </View>

            {/* Amenities */}
            <View style={styles.amenitiesContainer}>
              {renderAmenities(trip.amenities)}
            </View>

            {/* Prix et réservation */}
            <View style={styles.footer}>
              <View>
                <Text style={styles.priceLabel}>À partir de</Text>
                <Text style={styles.price}>{formatPrice(trip.price)}</Text>
              </View>
              <TouchableOpacity style={styles.selectButton}>
                <Text style={styles.selectButtonText}>Sélectionner</Text>
                <ChevronRight size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Sheet pour les filtres */}
      <BottomSheet
        ref={filterSheetRef}
        index={-1}
        snapPoints={filterSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <BottomSheetView style={styles.filterSheetContent}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filtrer les trajets</Text>
            <TouchableOpacity onPress={() => filterSheetRef.current?.close()}>
              <Text style={styles.filterClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.filterSectionTitle}>Type de bus</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, activeFilter === "all" && styles.filterOptionActive]}
                onPress={() => setActiveFilter("all")}
              >
                <Text style={[styles.filterOptionText, activeFilter === "all" && styles.filterOptionTextActive]}>
                  Tous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterOption, activeFilter === "premium" && styles.filterOptionActive]}
                onPress={() => setActiveFilter("premium")}
              >
                <Text style={[styles.filterOptionText, activeFilter === "premium" && styles.filterOptionTextActive]}>
                  Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterOption, activeFilter === "standard" && styles.filterOptionActive]}
                onPress={() => setActiveFilter("standard")}
              >
                <Text style={[styles.filterOptionText, activeFilter === "standard" && styles.filterOptionTextActive]}>
                  Standard
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Horaire</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, activeFilter === "morning" && styles.filterOptionActive]}
                onPress={() => setActiveFilter("morning")}
              >
                <Text style={[styles.filterOptionText, activeFilter === "morning" && styles.filterOptionTextActive]}>
                  Matin (avant 12h)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterOption, activeFilter === "afternoon" && styles.filterOptionActive]}
                onPress={() => setActiveFilter("afternoon")}
              >
                <Text style={[styles.filterOptionText, activeFilter === "afternoon" && styles.filterOptionTextActive]}>
                  Après-midi (après 12h)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Trier par</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, sortBy === "price" && styles.filterOptionActive]}
                onPress={() => setSortBy("price")}
              >
                <Text style={[styles.filterOptionText, sortBy === "price" && styles.filterOptionTextActive]}>
                  Prix croissant
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterOption, sortBy === "duration" && styles.filterOptionActive]}
                onPress={() => setSortBy("duration")}
              >
                <Text style={[styles.filterOptionText, sortBy === "duration" && styles.filterOptionTextActive]}>
                  Durée
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterOption, sortBy === "departure" && styles.filterOptionActive]}
                onPress={() => setSortBy("departure")}
              >
                <Text style={[styles.filterOptionText, sortBy === "departure" && styles.filterOptionTextActive]}>
                  Départ le plus tôt
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => filterSheetRef.current?.close()}
            >
              <Text style={styles.applyFiltersText}>Appliquer les filtres</Text>
            </TouchableOpacity>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>

      {/* Modal Formulaire Passager */}
      <Modal
        visible={showPassengerForm}
        animationType="slide"
        transparent={false}
        onRequestClose={closePassengerModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closePassengerModal}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Passagers</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedTrip && (
              <>
                {/* Résumé du trajet */}
                <View style={styles.tripSummary}>
                  <Text style={styles.summaryTitle}>Résumé du trajet</Text>
                  <View style={styles.summaryRoute}>
                    <Text style={styles.summaryCities}>
                      {selectedTrip.departure.city} → {selectedTrip.arrival.city}
                    </Text>
                    <Text style={styles.summaryDate}>
                      {date ? new Date(date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                      }) : "Date"}
                    </Text>
                  </View>
                  <View style={styles.summarySchedule}>
                    <Clock size={14} color={COLORS.muted} />
                    <Text style={styles.summaryTime}>
                      Départ {selectedTrip.departure.time} - Arrivée {selectedTrip.arrival.time}
                    </Text>
                  </View>
                  <View style={styles.summaryCompany}>
                    <Image source={{ uri: selectedTrip.company.logo }} style={styles.summaryLogo} />
                    <Text style={styles.summaryCompanyName}>{selectedTrip.company.name}</Text>
                  </View>
                  <View style={styles.summaryPrice}>
                    <Text style={styles.summaryPriceLabel}>
                      {passagersList.length > 0
                        ? `Prix total (${passagersList.length} passager${passagersList.length > 1 ? "s" : ""})`
                        : "Prix par place"}
                    </Text>
                    <Text style={styles.summaryPriceValue}>
                      {formatPrice(
                        selectedTrip.price * Math.max(1, passagersList.length || 1),
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formTitle}>Ajouter un passager</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nom *</Text>
                    <View style={styles.inputWrapper}>
                      <User size={18} color={COLORS.muted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Nom de famille"
                        placeholderTextColor={COLORS.muted}
                        value={draftNom}
                        onChangeText={setDraftNom}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Prénom *</Text>
                    <View style={styles.inputWrapper}>
                      <User size={18} color={COLORS.muted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Prénom"
                        placeholderTextColor={COLORS.muted}
                        value={draftPrenom}
                        onChangeText={setDraftPrenom}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.addPassagerBtn} onPress={handleAddPassager}>
                    <UserPlus size={20} color={COLORS.white} />
                    <Text style={styles.addPassagerBtnText}>Ajouter</Text>
                  </TouchableOpacity>

                  {passagersList.length > 0 ? (
                    <View style={styles.passagersListe}>
                      <Text style={styles.passagersListeTitle}>Passagers ({passagersList.length})</Text>
                      {passagersList.map((p) => (
                        <View key={p.key} style={styles.passagerRow}>
                          <Text style={styles.passagerRowText}>
                            {p.prenom} {p.nom}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemovePassager(p.key)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={18} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.passagersHint}>
                      Ajoutez chaque voyageur avec le bouton « Ajouter ».
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, submittingReservation && styles.confirmButtonDisabled]}
                  onPress={handlePassengerSubmit}
                  disabled={submittingReservation}
                >
                  {submittingReservation ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer la réservation</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  searchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  filterButton: {
    padding: 8,
    backgroundColor: COLORS.bgSoft,
    borderRadius: 8,
  },
  tripsList: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  loadingBlock: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  loadErrorText: {
    fontSize: 14,
    color: COLORS.error,
    lineHeight: 20,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    marginBottom: 16,
  },
  tripCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  companyHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.bgSoft,
  },
  companyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  premiumText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
  },
  reviewsCount: {
    fontSize: 10,
    color: COLORS.muted,
  },
  scheduleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingVertical: 8,
  },
  timePoint: {
    flex: 1,
  },
  time: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  location: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 2,
    paddingHorizontal: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  duration: {
    fontSize: 11,
    color: COLORS.muted,
  },
  busInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  busType: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.muted,
  },
  seats: {
    fontSize: 12,
    color: COLORS.muted,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  amenityTag: {
    backgroundColor: COLORS.bgSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amenityText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  selectButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 13,
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  filterSheetContent: {
    flex: 1,
    padding: 20,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  filterClose: {
    fontSize: 24,
    color: COLORS.muted,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  filterOptionTextActive: {
    color: COLORS.white,
  },
  applyFiltersButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  applyFiltersText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bgSoft,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  tripSummary: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryCities: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  summaryDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  summarySchedule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  summaryTime: {
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryCompany: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  summaryLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  summaryCompanyName: {
    fontSize: 13,
    color: COLORS.text,
  },
  summaryPrice: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryPriceLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryPriceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  formSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  addPassagerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  addPassagerBtnText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },
  passagersListe: {
    marginTop: 4,
  },
  passagersListeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
  },
  passagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgSoft,
    borderRadius: 10,
    marginBottom: 8,
  },
  passagerRowText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  passagersHint: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  paymentSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  paymentOptions: {
    flexDirection: "row",
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  paymentOptionText: {
    fontSize: 13,
    color: COLORS.text,
  },
  waveIcon: {
    width: 20,
    height: 20,
  },
  orangeIcon: {
    width: 20,
    height: 20,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 30,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});