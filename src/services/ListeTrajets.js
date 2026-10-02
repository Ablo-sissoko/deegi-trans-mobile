import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import {
  MapPin,
  Calendar,
  Clock,
  Bus,
  ChevronRight,
  ChevronUp,
  Star,
  Users,
  ArrowLeft,
  Filter,
  Award,
  Info,
  Luggage,
  Shield,
  Route,
  Phone,
  Search,
  X,
} from "lucide-react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import COLORS from "../utils/COLORS";

/** Mode démo : données fictives (pas d’API). */
const USE_MOCK_TRIPS = true;

const LOGO_PLACEHOLDER =
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&q=80";

const MOCK_COMPANY_LOGOS = [
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=120&q=80",
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=120&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=120&q=80",
];

function buildMockTrips({ departure, destination, dateStr }) {
  const from = departure || "Bamako";
  const to = destination || "Sikasso";
  const day = dateStr || new Date().toISOString().split("T")[0];

  const base = [
    {
      id: "mock-1",
      trajetBackendId: 1001,
      company: {
        id: "c1",
        name: "Bani Transport",
        logo: MOCK_COMPANY_LOGOS[0],
        rating: 4.6,
        totalReviews: 128,
        isPremium: true,
        phone: "+223 70 12 34 56",
      },
      departure: { city: from, time: "06:30", location: "Gare routière" },
      arrival: { city: to, time: "11:45", location: "Gare centrale" },
      duration: "5h 15",
      price: 8500,
      availableSeats: 12,
      totalSeats: 45,
      busType: "VIP",
      amenities: ["Climatisation", "WiFi", "Prise électrique"],
      departureDate: day,
      distanceKm: 375,
      vehicle: "Mercedes Tourismo",
      plate: "AB-2045-ML",
      seatLayout: "2+2 · sièges inclinables",
      baggage: "2 bagages · 25 kg max",
      checkIn: "30 min avant départ",
      stops: ["Bougouni", "Kolondiéba"],
      refundable: true,
      cancellation: "Annulation gratuite jusqu’à 6h avant le départ",
      note: "Embarquement prioritaire pour les passagers Premium. Eau offerte à bord.",
    },
    {
      id: "mock-2",
      trajetBackendId: 1002,
      company: {
        id: "c2",
        name: "Sama Express",
        logo: MOCK_COMPANY_LOGOS[1],
        rating: 4.2,
        totalReviews: 86,
        isPremium: false,
        phone: "+223 76 55 01 22",
      },
      departure: { city: from, time: "08:00", location: "Autogare" },
      arrival: { city: to, time: "13:30", location: "Centre-ville" },
      duration: "5h 30",
      price: 6500,
      availableSeats: 22,
      totalSeats: 50,
      busType: "STANDARD",
      amenities: ["Climatisation", "TV"],
      departureDate: day,
      distanceKm: 375,
      vehicle: "Yutong ZK6122",
      plate: "CD-8812-ML",
      seatLayout: "2+3 · standard",
      baggage: "1 bagage · 20 kg max",
      checkIn: "45 min avant départ",
      stops: ["Bougouni"],
      refundable: false,
      cancellation: "Non remboursable — report possible sous conditions",
      note: "Arrêt pause café à Bougouni (~15 min).",
    },
    {
      id: "mock-3",
      trajetBackendId: 1003,
      company: {
        id: "c3",
        name: "Niaré Voyages",
        logo: MOCK_COMPANY_LOGOS[2],
        rating: 4.8,
        totalReviews: 210,
        isPremium: true,
        phone: "+223 66 90 11 33",
      },
      departure: { city: from, time: "10:15", location: "Gare AGM" },
      arrival: { city: to, time: "15:00", location: "Gare" },
      duration: "4h 45",
      price: 9500,
      availableSeats: 6,
      totalSeats: 40,
      busType: "LUXE",
      amenities: ["Climatisation", "WiFi", "Prise électrique", "TV"],
      departureDate: day,
      distanceKm: 370,
      vehicle: "Volvo 9700",
      plate: "EF-3301-ML",
      seatLayout: "2+2 · cuir premium",
      baggage: "2 bagages · 30 kg max",
      checkIn: "20 min avant départ",
      stops: [],
      refundable: true,
      cancellation: "Remboursement 80 % jusqu’à 12h avant",
      note: "Trajet direct sans arrêt commercial. Snacks inclus.",
    },
    {
      id: "mock-4",
      trajetBackendId: 1004,
      company: {
        id: "c4",
        name: "Mali Line",
        logo: LOGO_PLACEHOLDER,
        rating: 3.9,
        totalReviews: 54,
        isPremium: false,
        phone: "+223 79 44 20 10",
      },
      departure: { city: from, time: "14:00", location: "Gare sud" },
      arrival: { city: to, time: "19:40", location: "Gare" },
      duration: "5h 40",
      price: 5500,
      availableSeats: 31,
      totalSeats: 52,
      busType: "STANDARD",
      amenities: ["TV"],
      departureDate: day,
      distanceKm: 380,
      vehicle: "Golden Dragon",
      plate: "GH-1022-ML",
      seatLayout: "2+3 · économique",
      baggage: "1 bagage · 15 kg max",
      checkIn: "40 min avant départ",
      stops: ["Bougouni", "Finkolo"],
      refundable: false,
      cancellation: "Aucun remboursement après achat",
      note: "Tarif économique. Présentez-vous tôt aux heures de pointe.",
    },
    {
      id: "mock-5",
      trajetBackendId: 1005,
      company: {
        id: "c5",
        name: "Horizon Bus",
        logo: MOCK_COMPANY_LOGOS[0],
        rating: 4.4,
        totalReviews: 97,
        isPremium: false,
        phone: "+223 65 18 77 09",
      },
      departure: { city: from, time: "16:45", location: "Autogare" },
      arrival: { city: to, time: "22:10", location: "Gare nocturne" },
      duration: "5h 25",
      price: 7000,
      availableSeats: 18,
      totalSeats: 48,
      busType: "CONFORT",
      amenities: ["Climatisation", "WiFi"],
      departureDate: day,
      distanceKm: 375,
      vehicle: "Zhongtong LCK6125",
      plate: "IJ-7760-ML",
      seatLayout: "2+2 · confort",
      baggage: "2 bagages · 20 kg max",
      checkIn: "35 min avant départ",
      stops: ["Bougouni"],
      refundable: true,
      cancellation: "Annulation possible jusqu’à 3h avant (frais 10 %)",
      note: "Idéal pour un départ en fin d’après-midi.",
    },
    {
      id: "mock-6",
      trajetBackendId: 1006,
      company: {
        id: "c6",
        name: "Prestige Travel",
        logo: MOCK_COMPANY_LOGOS[1],
        rating: 4.9,
        totalReviews: 312,
        isPremium: true,
        phone: "+223 90 00 22 18",
      },
      departure: { city: from, time: "21:00", location: "Terminal VIP" },
      arrival: { city: to, time: "01:50", location: "Gare" },
      duration: "4h 50",
      price: 12000,
      availableSeats: 4,
      totalSeats: 36,
      busType: "VIP",
      amenities: ["Climatisation", "WiFi", "Prise électrique", "TV"],
      departureDate: day,
      distanceKm: 365,
      vehicle: "Scania Touring HD",
      plate: "KL-5500-ML",
      seatLayout: "2+1 · lit semi-couchette",
      baggage: "3 bagages · 35 kg max",
      checkIn: "25 min avant départ",
      stops: [],
      refundable: true,
      cancellation: "Annulation gratuite jusqu’à 8h avant",
      note: "Service de nuit VIP. Couverture, oreiller et collation inclus.",
    },
  ];

  return base;
}

async function fetchMockTrips({ departure, destination, dateStr }) {
  await new Promise((r) => setTimeout(r, 450));
  return buildMockTrips({ departure, destination, dateStr });
}

const GOLD = "#D4AF37";

function BlinkingMapPin({ size = 12 }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <MapPin size={size} color={GOLD} />
    </Animated.View>
  );
}

function PulsingSelectButton({ onPress, children }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ListeTrajets() {
  const navigation = useNavigation();
  const route = useRoute();
  const { departure, destination, date } = route.params || {};
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;

  const filterSheetRef = useRef(null);
  const filterSnapPoints = useMemo(() => ["60%"], []);
  const detailSheetRef = useRef(null);
  const detailSnapPoints = useMemo(() => ["80%"], []);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadTrips = useCallback(
    async ({ isRefresh = false } = {}) => {
      const dateStr = route.params?.date;
      const from = route.params?.departure;
      const to = route.params?.destination;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);

      try {
        if (!USE_MOCK_TRIPS) {
          throw new Error("API désactivée — activez USE_MOCK_TRIPS ou reconnectez l’API.");
        }
        const mapped = await fetchMockTrips({
          departure: from,
          destination: to,
          dateStr,
        });
        setTrips(mapped);
      } catch (e) {
        const msg = e?.message || "Impossible de charger les trajets";
        setLoadError(msg);
        setTrips([]);
        Toast.show({ type: "error", text1: "Trajets", text2: String(msg) });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params?.departure, route.params?.destination, route.params?.date],
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    if (!searchOpen) return;
    searchOpacity.setValue(0);
    Animated.timing(searchOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(() => searchInputRef.current?.focus());
  }, [searchOpen, searchOpacity]);

  useEffect(() => {
    Animated.timing(scrollTopOpacity, {
      toValue: showScrollTop ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showScrollTop, scrollTopOpacity]);

  const onListScroll = (event) => {
    const visible = event.nativeEvent.contentOffset.y > 220;
    setShowScrollTop((current) => (current === visible ? current : visible));
  };

  const scrollToTop = () => {
    listRef.current?.scrollTo({ y: 0, animated: true });
  };

  const toggleSearch = () => {
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    Animated.timing(searchOpacity, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSearchOpen(false);
    });
  };

  const onRefresh = useCallback(() => {
    loadTrips({ isRefresh: true });
  }, [loadTrips]);

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

  const formatPrice = (price) => {
    return `${price.toLocaleString()} FCFA`;
  };

  const filteredTrips = useMemo(() => {
    let filtered = [...trips];
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      filtered = filtered.filter((trip) => {
        const haystack = [
          trip.company?.name,
          trip.busType,
          trip.departure?.city,
          trip.arrival?.city,
          trip.departure?.location,
          trip.arrival?.location,
          trip.vehicle,
          ...(trip.amenities || []),
          trip.company?.isPremium ? "premium" : "standard",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (activeFilter !== "all") {
      if (activeFilter === "premium") {
        filtered = filtered.filter((trip) => trip.company.isPremium);
      } else if (activeFilter === "standard") {
        filtered = filtered.filter((trip) => !trip.company.isPremium);
      } else if (activeFilter === "morning") {
        filtered = filtered.filter((trip) => parseInt(trip.departure.time, 10) < 12);
      } else if (activeFilter === "afternoon") {
        filtered = filtered.filter((trip) => parseInt(trip.departure.time, 10) >= 12);
      }
    }

    if (sortBy === "price") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "duration") {
      filtered.sort((a, b) => parseInt(a.duration, 10) - parseInt(b.duration, 10));
    } else if (sortBy === "departure") {
      filtered.sort((a, b) => a.departure.time.localeCompare(b.departure.time));
    }

    return filtered;
  }, [trips, searchQuery, activeFilter, sortBy]);

  const dateLabel = date
    ? new Date(date).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "Date —";

  const openTripDetails = (trip) => {
    setSelectedTrip(trip);
    requestAnimationFrame(() => detailSheetRef.current?.expand());
  };

  const selectTrip = (trip) => {
    if (!trip) return;
    detailSheetRef.current?.close();
    navigation.navigate("Reservation", {
      trip,
      date,
      departure,
      destination,
    });
  };

  const handleConfirmSelect = () => {
    selectTrip(selectedTrip);
  };

  const renderAmenities = (amenities) => {
    const icons = {
      Climatisation: "❄️",
      WiFi: "📶",
      "Prise électrique": "🔌",
      TV: "📺",
    };

    return (amenities || []).slice(0, 4).map((amenity, index) => (
      <View key={index} style={styles.amenityTag}>
        <Text style={styles.amenityText}>
          {icons[amenity] || "✓"} {amenity}
        </Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ArrowLeft size={20} color={COLORS.textStrong} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Trajets disponibles</Text>
            <Text style={styles.headerSubtitle}>
              {loading ? "Recherche en cours…" : `${filteredTrips.length} résultat${filteredTrips.length > 1 ? "s" : ""}`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleSearch}
              style={[
                styles.filterButton,
                (searchOpen || searchQuery.trim().length > 0) && styles.filterButtonActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Rechercher"
            >
              <Search
                size={18}
                color={searchOpen || searchQuery.trim().length > 0 ? COLORS.white : COLORS.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => filterSheetRef.current?.expand()}
              style={[
                styles.filterButton,
                (activeFilter !== "all" || sortBy !== "price") && styles.filterButtonActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filtres"
            >
              <Filter
                size={18}
                color={
                  activeFilter !== "all" || sortBy !== "price"
                    ? COLORS.white
                    : COLORS.primary
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {searchOpen ? (
          <Animated.View
            style={[
              styles.searchBar,
              {
                opacity: searchOpacity,
                transform: [
                  {
                    translateY: searchOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Search size={18} color={COLORS.muted} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Compagnie, type de bus, service…"
              placeholderTextColor={COLORS.mutedStrong}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.searchClear}
              >
                <X size={16} color={COLORS.muted} />
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        ) : null}
      </View>

      <ScrollView
        ref={listRef}
        onScroll={onListScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.tripsList}
        contentContainerStyle={styles.tripsListContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={COLORS.white}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Recherche des trajets…</Text>
          </View>
        ) : loadError ? (
          <Text style={styles.loadErrorText}>{loadError}</Text>
        ) : (
          <>
            <View style={styles.listHeaderRow}>
              <Text style={styles.resultsCount}>
                {searchQuery.trim()
                  ? `${filteredTrips.length} correspondance${filteredTrips.length > 1 ? "s" : ""}`
                  : `${filteredTrips.length} trajet${filteredTrips.length > 1 ? "s" : ""} trouvé${filteredTrips.length > 1 ? "s" : ""}`}
              </Text>
              {activeFilter !== "all" ? (
                <TouchableOpacity onPress={() => setActiveFilter("all")}>
                  <Text style={styles.clearFilterLink}>Effacer filtre</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {filteredTrips.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? "Aucun trajet ne correspond à votre recherche."
                  : "Aucun trajet pour cette date et cette route."}
              </Text>
            ) : null}

            {filteredTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.tripCard}
                onPress={() => openTripDetails(trip)}
                activeOpacity={0.88}
              >
                <View style={styles.cardTop}>
                  <Image source={{ uri: trip.company.logo }} style={styles.companyLogo} />
                  <View style={styles.cardTopInfo}>
                    <Text style={styles.companyName} numberOfLines={1}>
                      {trip.company.name}
                    </Text>
                    <View style={styles.cardMetaRow}>
                      <Star size={11} color={COLORS.warning} fill={COLORS.warning} />
                      <Text style={styles.ratingText}>{trip.company.rating}</Text>
                      {trip.company.isPremium ? (
                        <View style={styles.premiumBadge}>
                          <Text style={styles.premiumText}>Premium</Text>
                        </View>
                      ) : (
                        <Text style={styles.busTypeChip}>{trip.busType}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.priceBlock}>
                    <Text style={styles.price}>{formatPrice(trip.price)}</Text>
                    <Text style={styles.priceHint}>/ place</Text>
                  </View>
                </View>

                <View style={styles.scheduleRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.time}>{trip.departure.time}</Text>
                    <Text style={styles.cityMini} numberOfLines={1}>
                      {trip.departure.city}
                    </Text>
                  </View>
                  <View style={styles.durationMid}>
                    <View style={styles.dot} />
                    <View style={styles.dash} />
                    <Text style={styles.duration}>{trip.duration}</Text>
                    <View style={styles.dash} />
                    <View style={[styles.dot, styles.dotEnd]} />
                  </View>
                  <View style={[styles.timeCol, styles.timeColEnd]}>
                    <Text style={styles.time}>{trip.arrival.time}</Text>
                    <Text style={styles.cityMini} numberOfLines={1}>
                      {trip.arrival.city}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.seatsHint}>
                    {trip.availableSeats} places restantes
                  </Text>
                  <TouchableOpacity
                    style={styles.cardSelectButton}
                    onPress={() => selectTrip(trip)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cardSelectText}>Sélectionner</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <Animated.View
        pointerEvents={showScrollTop ? "auto" : "none"}
        style={[styles.scrollTopWrap, { opacity: scrollTopOpacity }]}
      >
        <TouchableOpacity
          style={styles.scrollTopButton}
          onPress={scrollToTop}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Remonter"
        >
          <ChevronUp size={22} color={COLORS.white} />
        </TouchableOpacity>
      </Animated.View>

      <BottomSheet
        ref={detailSheetRef}
        index={-1}
        snapPoints={detailSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        {selectedTrip ? (
          <BottomSheetScrollView
            contentContainerStyle={styles.detailSheet}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailHero}>
              <View style={styles.detailTitleRow}>
                <Text style={styles.detailEyebrow}>Détail du trajet</Text>
                {selectedTrip.company.isPremium ? (
                  <View style={styles.premiumBadge}>
                    <Award size={10} color={COLORS.primary} />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.detailSchedule}>
              <View style={styles.detailTimeBlock}>
                <Text style={styles.detailPointLabel}>Départ</Text>
                <Text style={styles.detailTime}>{selectedTrip.departure.time}</Text>
                <Text style={styles.detailCity}>{selectedTrip.departure.city}</Text>
                <View style={styles.locRow}>
                  <BlinkingMapPin />
                  <Text style={styles.detailLoc}>{selectedTrip.departure.location}</Text>
                </View>
              </View>
              <View style={styles.detailDurationCol}>
                <View style={styles.durationRing}>
                  <Bus size={16} color={COLORS.primary} />
                </View>
                <View style={styles.durationLine} />
                <Text style={styles.detailDuration}>{selectedTrip.duration}</Text>
               
                {selectedTrip.distanceKm ? (
                  <Text style={styles.detailDistance}>{selectedTrip.distanceKm} km</Text>
                ) : null}
              </View>
              <View style={[styles.detailTimeBlock, styles.timeColEnd]}>
                <Text style={styles.detailPointLabel}>Arrivée</Text>
                <Text style={styles.detailTime}>{selectedTrip.arrival.time}</Text>
                <Text style={styles.detailCity}>{selectedTrip.arrival.city}</Text>
                <View style={[styles.locRow, styles.locRowEnd]}>
                  <BlinkingMapPin />
                  <Text style={styles.detailLoc}>{selectedTrip.arrival.location}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailStats}>
              <View style={styles.statCard}>
                <Users size={16} color={COLORS.primary} />
                <Text style={styles.statValue}>
                  {selectedTrip.availableSeats}
                </Text>
                <Text style={styles.statCaption}>
                  / {selectedTrip.totalSeats} places
                </Text>
              </View>
              <View style={styles.statCard}>
                <Clock size={16} color={COLORS.primary} />
                <Text style={styles.statValue}>{selectedTrip.checkIn || "—"}</Text>
                <Text style={styles.statCaption}>enregistrement</Text>
              </View>
              <View style={styles.statCard}>
                <Luggage size={16} color={COLORS.primary} />
                <Text style={styles.statValue} numberOfLines={2}>
                  {selectedTrip.baggage?.split("·")[0]?.trim() || "Bagages"}
                </Text>
                <Text style={styles.statCaption}>
                  {selectedTrip.baggage?.split("·")[1]?.trim() || "inclus"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Compagnie</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Image
                  source={{ uri: selectedTrip.company.logo }}
                  style={styles.infoLogo}
                />
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoTitle}>{selectedTrip.company.name}</Text>
                  <Text style={styles.infoSub}>{selectedTrip.busType}</Text>
                </View>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Star size={16} color={COLORS.warning} fill={COLORS.warning} />
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoTitle}>
                    {selectedTrip.company.rating} · {selectedTrip.company.totalReviews} avis
                  </Text>
                  <Text style={styles.infoSub}>Note des voyageurs</Text>
                </View>
              </View>
              {date ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Calendar size={16} color={COLORS.primary} />
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoTitle}>Date du trajet</Text>
                    <Text style={[styles.infoSub, styles.infoSubCapitalize]}>
                      {new Date(date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <Text style={styles.sectionLabel}>Véhicule & places</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Bus size={16} color={COLORS.primary} />
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoTitle}>{selectedTrip.vehicle || selectedTrip.busType}</Text>
                  <Text style={styles.infoSub}>
                    {[selectedTrip.plate, selectedTrip.seatLayout].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </View>
              {selectedTrip.company?.phone ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Phone size={16} color={COLORS.primary} />
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoTitle}>Contact compagnie</Text>
                    <Text style={styles.infoSub}>{selectedTrip.company.phone}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <Text style={styles.sectionLabel}>Itinéraire</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Route size={16} color={COLORS.primary} />
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoTitle}>
                    {selectedTrip.stops?.length
                      ? `${selectedTrip.stops.length} arrêt(s) intermédiaire(s)`
                      : "Trajet direct"}
                  </Text>
                  <Text style={styles.infoSub}>
                    {selectedTrip.stops?.length
                      ? selectedTrip.stops.join(" → ")
                      : "Sans arrêt commercial"}
                  </Text>
                </View>
              </View>
            </View>

            {selectedTrip.amenities?.length ? (
              <>
                <Text style={styles.sectionLabel}>À bord</Text>
                <View style={styles.amenitiesContainer}>
                  {renderAmenities(selectedTrip.amenities)}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Conditions</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Shield size={16} color={selectedTrip.refundable ? COLORS.success : COLORS.warning} />
                <View style={styles.infoTextCol}>
                  <Text style={styles.infoTitle}>
                    {selectedTrip.refundable ? "Remboursable" : "Non remboursable"}
                  </Text>
                  <Text style={styles.infoSub}>{selectedTrip.cancellation}</Text>
                </View>
              </View>
              {selectedTrip.note ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Info size={16} color={COLORS.primary} />
                  <View style={styles.infoTextCol}>
                    <Text style={styles.infoTitle}>Bon à savoir</Text>
                    <Text style={styles.infoSub}>{selectedTrip.note}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.detailCtaBar}>
              <View>
                <Text style={styles.priceLabel}>Prix par place</Text>
                <Text style={styles.detailPrice}>{formatPrice(selectedTrip.price)}</Text>
              </View>
              <PulsingSelectButton onPress={handleConfirmSelect}>
                <Text style={styles.selectButtonText}>Sélectionner</Text>
                <ChevronRight size={16} color={COLORS.white} />
              </PulsingSelectButton>
            </View>
          </BottomSheetScrollView>
        ) : (
          <View style={styles.detailSheet} />
        )}
      </BottomSheet>

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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSoft,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textStrong,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  routeCard: {
    backgroundColor: COLORS.bgSoft,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  routeCities: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  routeCityCol: {
    flex: 1,
  },
  routeCityColEnd: {
    alignItems: "flex-end",
  },
  routeCityLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  routeCityName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textStrong,
  },
  routeArrow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    flex: 1.1,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  routeDotEnd: {
    backgroundColor: COLORS.mutedStrong,
  },
  routeDash: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  routeMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  routeMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: "100%",
  },
  routeMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    textTransform: "capitalize",
    flexShrink: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
    fontWeight: "500",
  },
  searchClear: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tripsList: {
    flex: 1,
  },
  scrollTopWrap: {
    position: "absolute",
    right: 16,
    bottom: 24,
  },
  scrollTopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  tripsListContent: {
    padding: 16,
    paddingBottom: 28,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
  clearFilterLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
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
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  companyLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.bgSoft,
  },
  cardTopInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 3,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  premiumText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "700",
  },
  busTypeChip: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },
  priceHint: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  timeCol: {
    minWidth: 58,
  },
  timeColEnd: {
    alignItems: "flex-end",
  },
  time: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textStrong,
    letterSpacing: -0.3,
  },
  cityMini: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    maxWidth: 72,
  },
  durationMid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  dotEnd: {
    backgroundColor: COLORS.mutedStrong,
  },
  dash: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  duration: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    marginHorizontal: 6,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  seatsHint: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
    flex: 1,
    marginRight: 10,
  },
  cardSelectButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardSelectText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 12,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  amenityTag: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  amenityText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 4,
  },
  selectButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  sheetHandle: {
    backgroundColor: COLORS.borderStrong,
    width: 42,
  },
  detailSheet: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  detailHero: {
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  detailEyebrow: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textStrong,
    letterSpacing: -0.2,
  },
  infoLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  infoSubCapitalize: {
    textTransform: "capitalize",
  },
  detailSchedule: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  detailTimeBlock: {
    flex: 1,
  },
  detailPointLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailTime: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textStrong,
    letterSpacing: -0.4,
  },
  detailCity: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locRowEnd: {
    justifyContent: "flex-end",
  },
  detailLoc: {
    fontSize: 11,
    color: COLORS.muted,
    flexShrink: 1,
  },
  detailDurationCol: {
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 8,
    minWidth: 72,
  },
  durationRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  durationLine: {
    width: 2,
    height: 18,
    backgroundColor: COLORS.borderLight,
    marginVertical: 4,
    borderRadius: 1,
  },
  detailDuration: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },
  detailBusType: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "700",
    marginTop: 2,
  },
  detailDistance: {
    fontSize: 10,
    color: COLORS.mutedStrong,
    marginTop: 2,
  },
  detailStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textStrong,
    textAlign: "center",
  },
  statCaption: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textStrong,
    marginBottom: 3,
  },
  infoSub: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
  },
  detailCtaBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  detailPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 2,
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.white,
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
});

