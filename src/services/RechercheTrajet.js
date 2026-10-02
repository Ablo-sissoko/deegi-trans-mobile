import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { MapPin, Calendar, ArrowRightLeft, ArrowRight, ArrowLeft } from "lucide-react-native";
import { Calendar as RNCalendar, LocaleConfig } from "react-native-calendars";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import COLORS from "../utils/COLORS";
import { authClient } from "../api/auth";
import { getToken } from "../auths/authStorage";
 
LocaleConfig.locales["fr"] = {
  monthNames: [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ],
  monthNamesShort: [
    "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
    "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."
  ],
  dayNames: [
    "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"
  ],
  dayNamesShort: ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."],
  today: "Aujourd'hui",
};

LocaleConfig.defaultLocale = "fr";

const GOLD = "#D4AF37";

function ZoomMapPin({ size = 18 }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.22,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <MapPin size={size} color={GOLD} />
    </Animated.View>
  );
}

export default function RechercheTrajet() {
  const navigation = useNavigation();
  const route = useRoute();
  const preset = route.params || {};
  const [departure, setDeparture] = useState(preset.from || "");
  const [destination, setDestination] = useState(preset.to || "");
  const [departureId, setDepartureId] = useState(preset.departureId ?? null);
  const [destinationId, setDestinationId] = useState(preset.destinationId ?? null);
  const [date, setDate] = useState("");
  const [tripType, setTripType] = useState("aller simple");
  const [dateOption, setDateOption] = useState("aujourd'hui");
  const calendarRef = useRef(null);
  const calendarSnapPoints = useMemo(() => ["45%"], []);
  const renderCalendarBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    []
  );


  useEffect(() => {
    handleDateOption(dateOption);
  }, [dateOption]);

  const formatToISO = (value) => value.toISOString().split("T")[0];
  const formatShortDate = (dateStr) => {
    if (!dateStr) return "";
    const dateObj = new Date(dateStr);
    if (Number.isNaN(dateObj.getTime())) return dateStr;
    return dateObj.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const handleDateOption = (option) => {
    setDateOption(option);
    if (option === "aujourd'hui") {
      setDate(formatToISO(new Date()));
    } else if (option === "demain") {
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setDate(formatToISO(nextDay));
    } else {
      setDate("");
    }
  };

  const openCitySearch = (t) => {
    navigation.navigate("VilleRecherche", {
      type: t,
      onSelect: (ville) => {
        const name = typeof ville === "string" ? ville : ville?.nom ?? "";
        const vid = typeof ville === "object" && ville != null ? ville.id : null;
        if (!name) return;
        if (t === "departure") {
          if (name === destination) {
            Toast.show({
              text1: "Le point de départ et la destination ne peuvent pas être le même",
              type: "error",
            });
            return;
          }
          setDeparture(name);
          setDepartureId(vid ?? null);
        } else {
          if (name === departure) {
            Toast.show({
              text1: "Le point de départ et la destination ne peuvent pas être le même",
              type: "error",
            });
            return;
          }
          setDestination(name);
          setDestinationId(vid ?? null);
        }
      },
    });
  };

  const RechercherRoute = async () => {
    if (!departure || !destination || !date) {
      Toast.show({
        text1: "Veuillez remplir tous les champs",
        type: "error",
      });
      return;
    }
    if (departureId == null || destinationId == null) {
      Toast.show({
        text1: "Sélectionnez les villes dans la liste de recherche",
        text2: "Les identifiants sont nécessaires pour trouver les trajets.",
        type: "error",
      });
      return;
    }
    try {
      const token = await getToken();
      if (token && departureId != null && destinationId != null) {
        await authClient.post(
          "/api/historique-recherches/save",
          {
            type_recherche: "trajet",
            ville_depart_id: departureId,
            ville_arrivee_id: destinationId,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
    } catch {
      /* historique non bloquant */
    }
    const tripTypeApi =
      String(tripType).toLowerCase().includes("retour") ? "ALLER_RETOUR" : "ALLER_SIMPLE";
    navigation.navigate("ListeTrajets", {
      departure,
      destination,
      departureId,
      destinationId,
      date,
      tripType,
      tripTypeApi,
      returnDate: tripTypeApi === "ALLER_RETOUR" ? date : undefined,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={20} color={COLORS.textStrong} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Rechercher un trajet</Text>
          <Text style={styles.welcomeSubtext}>Départ, destination et date</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* CARD FORM */}
        <View style={styles.card}>
          <View style={styles.tripTypeRow}>
            <TouchableOpacity
              style={[
                styles.tripTypeBtn,
                tripType === "aller simple" && styles.tripTypeActive,
              ]}
              onPress={() => setTripType("aller simple")}
            >
              <ArrowRight size={16} color={tripType === "aller simple" ? COLORS.white : COLORS.muted} />
              <Text
                style={[
                  styles.tripTypeText,
                  tripType === "aller simple" && styles.tripTypeTextActive,
                ]}
              >
                Aller simple
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tripTypeBtn,
                tripType === "aller retour" && styles.tripTypeActive,
              ]}
              onPress={() => setTripType("aller retour")}
            >
              <ArrowRightLeft
                size={16}
                color={tripType === "aller retour" ? COLORS.white : COLORS.muted}
              />
              <Text
                style={[
                  styles.tripTypeText,
                  tripType === "aller retour" && styles.tripTypeTextActive,
                ]}
              >
                Aller retour
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routeBlock}>
            {/* DEPARTURE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Depart</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => openCitySearch("departure")}
                activeOpacity={0.8}
              >
                <ZoomMapPin />
                <Text
                  style={[
                    styles.textInput,
                    { color: departure ? COLORS.text : COLORS.muted },
                  ]}
                >
                  {departure || "Selectionner un point de départ"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SWITCH BUTTON */}
            <TouchableOpacity style={styles.switchFloating} onPress={() => {
              setDeparture(destination);
              setDestination(departure);
              setDepartureId(destinationId);
              setDestinationId(departureId);
            }}>
              <ArrowRightLeft size={16} color={COLORS.white} />
            </TouchableOpacity>


            {/* DESTINATION */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Destination</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => openCitySearch("destination")}
                activeOpacity={0.8}
              >
                <ZoomMapPin />
                <Text
                  style={[
                    styles.textInput,
                    { color: destination ? COLORS.text : COLORS.muted },
                  ]}
                >
                  {destination || "Selectionner une destination"}
                </Text>
              </TouchableOpacity>
            </View>


          </View>

          {/* DATE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.dateOptionsRow}>
             
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  dateOption === "aujourd'hui" && styles.dateOptionActive,
                ]}
                onPress={() => handleDateOption("aujourd'hui")}
              >
                <Text
                  style={[
                    styles.dateOptionText,
                    dateOption === "aujourd'hui" && styles.dateOptionTextActive,
                  ]}
                >
                  Aujourd'hui
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  dateOption === "demain" && styles.dateOptionActive,
                ]}
                onPress={() => handleDateOption("demain")}
              >
                <Text
                  style={[
                    styles.dateOptionText,
                    dateOption === "demain" && styles.dateOptionTextActive,
                  ]}
                >
                  Demain
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  dateOption === "calendar" && styles.dateOptionActive,
                ]}
                onPress={() => {
                  handleDateOption("calendar");
                  calendarRef.current?.expand();
                }}
              >
                <Calendar
                  size={16}
                  color={dateOption === "calendar" ? COLORS.white : COLORS.muted}
                />
                <Text
                  style={[
                    styles.dateOptionText,
                    dateOption === "calendar" && styles.dateOptionTextActive,
                  ]}
                >
                  {date ? formatShortDate(date).slice(0, 8) : formatShortDate(new Date()).slice(0, 8)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BUTTON */}
          <TouchableOpacity onPress={RechercherRoute} style={styles.button}>
            <Text style={styles.buttonText}>Rechercher</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomSheet
        ref={calendarRef}
        index={-1}
        snapPoints={calendarSnapPoints}
        enablePanDownToClose
        backdropComponent={renderCalendarBackdrop}
        backgroundStyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
       
      >
        <BottomSheetView style={{ padding: 15 }}>
          <Text style={{ fontWeight: "600", fontSize: 16, marginBottom: 10 }}>
            Selectionner une date de départ
          </Text>

          <RNCalendar
            onDayPress={(day) => {
              setDate(day.dateString);
              calendarRef.current?.close();
            }}
            markedDates={{
              [date]: {
                selected: true,
                selectedColor: COLORS.primary,
              },
            }}
            theme={{
              todayTextColor: COLORS.primary,
              arrowColor: COLORS.primary,
            }}
          />

          <TouchableOpacity
            style={{
              marginTop: 15,
              backgroundColor: COLORS.primary,
              padding: 14,
              borderRadius: 10,
              alignItems: "center",
            }}
            onPress={() => calendarRef.current?.close()}
          >
            <Text style={{ color: COLORS.white, fontWeight: "600" }}>
              Enregistrer
            </Text>
          </TouchableOpacity>
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
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgSoft,
  },

  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  headerText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 14,
  },

  card: {
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 20,
    padding: 16,
    elevation: 3,
  },

  title: {
    color: COLORS.text,
    marginBottom: 15,
    fontWeight: "500",
  },
  tripTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  tripTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  tripTypeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tripTypeText: {
    color: COLORS.muted,
    fontWeight: "600",
    fontSize: 13,
  },
  tripTypeTextActive: {
    color: COLORS.white,
  },

  inputGroup: {
    marginBottom: 15,
  },

  label: {
    color: COLORS.muted,
    marginBottom: 5,
  },

  input: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: COLORS.white,
  },

  textInput: {
    flex: 1,
    marginLeft: 10,
    color: COLORS.text,
  },

  routeBlock: {
    marginBottom: 5,
    paddingTop: 4,
    position: "relative",
  },
  switchFloating: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    right: "15%",
    marginTop: -16,
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    zIndex: 10,
  },
  dateOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  dateOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  dateOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateOptionText: {
    color: COLORS.muted,
    fontWeight: "600",
    fontSize: 12,
  },
  dateOptionTextActive: {
    color: COLORS.white,
  },

  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  cardsRoutesContainer: {
    marginTop: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  cardsRoutesTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: COLORS.text,
  },
  routeCard: {
    width: 160,
    height: 110,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
  },
  routeImage: {
    width: "100%",
    height: "100%",
  },
  routeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayDark,
  },
  routeContent: {
    position: "absolute",
    bottom: 10,
    left: 10,
  },
  routeText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  routePrice: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 2,
  },
  welcomeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,

  },
  welcomeText: {
    fontWeight: "700",
    fontSize: 20,
  },
  welcomeSubtext: {
    fontWeight: "500",
    fontSize: 16,
    color: COLORS.muted,
  },
});