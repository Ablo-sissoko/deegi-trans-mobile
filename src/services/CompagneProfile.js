import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  StatusBar,
  FlatList,
  Linking,
  Share,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import {
  Star,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  Bus,
  Award,
  Shield,
  XCircle,
  CheckCircle,
  Info,
  Phone,
  Mail,
  Globe,
  Navigation,
  Users,
  AlertCircle,
  ChevronRight,
  Image as ImageIcon,
  Camera,
  TrendingUp,
  Percent,
  Gift,
  Heart, 
  Share2,
  Bookmark,
  ExternalLink,
  ArrowLeft,
} from "lucide-react-native";
import { Calendar as DateCalendar } from "react-native-calendars";
import Header from "../components/Header";
import COLORS from "../utils/COLORS";
import { useRoute, useNavigation } from "@react-navigation/native";
import { authClient } from "../api/auth";
import { resolveApiMediaUrl } from "../utils/mediaUrl";
import { getToken } from "../auths/authStorage";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get("window");

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapApiProfileToCompanyData = (p) => ({
  id: String(p?.id || ""),
  name: p?.nom || "Compagnie",
  slogan: p?.slogan || "",
  description: p?.description || "",
  founded: p?.date_fondation || (p?.meta?.createdAt ? new Date(p.meta.createdAt).getFullYear().toString() : "N/A"),
  employeeCount: p?.nombre_employes != null ? String(p.nombre_employes) : "N/A",
  rating: Number(p?.rating || 0),
  totalReviews: Number(p?.totalReviews || 0),
  verified: true,
  premium: false,
  banner: resolveApiMediaUrl(p?.banner) || "https://via.placeholder.com/1200",
  logo: resolveApiMediaUrl(p?.logo) || "https://via.placeholder.com/200",
  gallery: Array.isArray(p?.gallery)
    ? p.gallery.map((u) => resolveApiMediaUrl(u)).filter(Boolean)
    : [],
  fleet: {
    vip:
      (Array.isArray(p?.fleet) ? p.fleet : []).find((f) => String(f.type).toUpperCase() === "VIP") || {
        count: 0,
        capacity: 0,
        amenities: [],
      },
    standard:
      (Array.isArray(p?.fleet) ? p.fleet : []).find((f) => String(f.type).toUpperCase() !== "VIP") || {
        count: 0,
        capacity: 0,
        amenities: [],
      },
  },
  routes: [],
  schedules: [],
  policies: {
    boarding: p?.policies?.boarding || [],
    cancellation: p?.policies?.cancellation || [],
    luggage: p?.policies?.luggage || [],
    payment: p?.policies?.payment || [],
  },
  reviews: (Array.isArray(p?.reviews) ? p.reviews : []).map((r) => ({
    id: String(r.id),
    user: r.user || "Utilisateur",
    avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
    rating: Number(r.rating || 0),
    date: r.date,
    comment: r.comment || "",
  })),
  stats: {
    totalTrips: p?.stats?.totalTrips || "0",
    passengers: p?.stats?.passengers || "0",
    satisfaction: "...",
    punctuality: "...",
  },
  contact: {
    phone: p?.contact?.phone || "",
    whatsapp: p?.contact?.phone || "",
    email: p?.contact?.email || "",
    website: p?.contact?.website || "",
    address: p?.contact?.address || "",
    social: {
      facebook: "",
      instagram: "",
      twitter: "",
    },
  },
});

const todayIso = () => new Date().toISOString().slice(0, 10);
const mapAvisApiToReview = (a) => ({
  id: String(a?.id || Math.random()),
  user: [a?.user?.prenom, a?.user?.nom].filter(Boolean).join(" ") || "Utilisateur",
  avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
  rating: Number(a?.etoiles || 0),
  date: a?.createdAt || new Date().toISOString(),
  comment: a?.commentaire || "",
});

const CompanyProfileScreen = () => {
  const route = useRoute();
  const compagnieId = route?.params?.compagnieId || 1;
  const [companyData, setCompanyData] = useState(() => mapApiProfileToCompanyData({}));
  const [selectedImage, setSelectedImage] = useState(null);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedTrajets, setSelectedTrajets] = useState([]);
  const [loadingTrajets, setLoadingTrajets] = useState(false);
  const [selectedTrajet, setSelectedTrajet] = useState(null);
  const [tripType, setTripType] = useState('ALLER_SIMPLE');
  const [passengers, setPassengers] = useState([]);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState("boarding");
  const [showAllRoutesModal, setShowAllRoutesModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [postingReview, setPostingReview] = useState(false);
  const navigation = useNavigation();

  const displayedRoutes = useMemo(
    () => (Array.isArray(companyData.routes) ? companyData.routes.slice(0, 5) : []),
    [companyData.routes],
  );
  const displayedReviews = useMemo(
    () => (Array.isArray(companyData.reviews) ? companyData.reviews.slice(0, 5) : []),
    [companyData.reviews],
  );

  const fetchAvisCompagnie = async () => {
    try {
      const { data } = await authClient.get(`/api/avis/compagnie/${compagnieId}`);
      const avisRows = Array.isArray(data?.avis) ? data.avis : [];
      const mapped = avisRows.map(mapAvisApiToReview);
      setCompanyData((prev) => ({ ...prev, reviews: mapped }));
    } catch (e) {
      console.log("Erreur chargement avis:", e?.response?.data || e?.message);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await authClient.get(`/api/compagnies/profile/${compagnieId}`);
        const { data: planningData } = await authClient.get(`/api/compagnies/${compagnieId}/plannings`);
        const planningList = Array.isArray(planningData?.data) ? planningData.data : [];

        const routes = planningList.map((entry) => {
          const tm = entry?.trajetModele || {};
          const from = tm?.ville_depart_nom || "Ville départ";
          const to = tm?.ville_arrivee_nom || "Ville arrivée";
          return {
            trajetModeleId: tm?.id,
            from,
            to,
            price: `${Number(tm?.prix || 0).toLocaleString("fr-FR")} FCFA`,
            duration: "-",
            distance: "-",
            frequency: `${(entry?.trajetPlannings || []).length} planning(s)`,
          };
        });

        const schedules = planningList.map((entry) => {
          const tm = entry?.trajetModele || {};
          const from = tm?.ville_depart_nom || "Ville départ";
          const to = tm?.ville_arrivee_nom || "Ville arrivée";
          const times = [...new Set((entry?.trajetPlannings || []).flatMap((p) => parseJsonArray(p?.heures)))];
          return { route: `${from} → ${to}`, times };
        });

        setCompanyData((prev) => ({
          ...prev,
          ...mapApiProfileToCompanyData(data),
          routes,
          schedules,
        }));
      } catch (e) {
        console.error("Erreur chargement profil compagnie:", e);
      }
    };
    fetchProfile();
    fetchAvisCompagnie();
  }, [compagnieId]);

  const submitAvis = async () => {
    const token = await getToken();
    if (!token) {
      Toast.show({
        type: "error",
        text1: "Connexion requise",
        text2: "Connectez-vous pour laisser un avis.",
      });
      return;
    }
    try {
      setPostingReview(true);
      const payload = {
        compagnie_id: Number(compagnieId),
        etoiles: Number(reviewStars || 5),
        commentaire: String(reviewComment || "").trim(),
      };
      const { data } = await authClient.post("/api/avis", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      Toast.show({
        type: "success",
        text1: "Avis",
        text2: data?.message || "Avis enregistré avec succès",
      });
      setShowAddReviewModal(false);
      setReviewComment("");
      setReviewStars(5);
      await fetchAvisCompagnie();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur lors de l'envoi de l'avis";
      Toast.show({ type: "error", text1: "Avis", text2: String(msg) });
    } finally {
      setPostingReview(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            color={star <= rating ? COLORS.warning : COLORS.border}
            fill={star <= rating ? COLORS.warning : "transparent"}
          />
        ))}
      </View>
    );
  };

  const renderGalleryGrid = () => {
    const displayImages = showFullGallery ? companyData.gallery : companyData.gallery.slice(0, 4);
    
    return (
      <View style={styles.galleryGrid}>
        {displayImages.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedImage(image)}
            style={[
              styles.galleryGridItem,
              index === 0 && styles.galleryGridItemLarge,
            ]}
          >
            <Image source={{ uri: image }} style={styles.galleryGridImage} />
            {index === 3 && !showFullGallery && companyData.gallery.length > 4 && (
              <View style={styles.galleryOverlay}>
                <Text style={styles.galleryOverlayText}>
                  +{companyData.gallery.length - 4}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const fetchTrajetsByDate = async (trajetModeleId, date) => {
    if (!trajetModeleId) return;
    try {
      setLoadingTrajets(true);
      const { data } = await authClient.post(`/api/compagnies/modele/${trajetModeleId}/date`, {
        date,
      });
      setSelectedTrajets(Array.isArray(data?.trajets) ? data.trajets : []);
    } catch (error) {
      console.log("Erreur chargement trajets par date:", error?.response?.data || error?.message);
      setSelectedTrajets([]);
    } finally {
      setLoadingTrajets(false);
    }
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedTrajet(null);
    setPassengers([]);
    setTripType('ALLER_SIMPLE');
  };

  const handleReservation = (route) => {
    const defaultDate = todayIso();
    setSelectedDate(defaultDate);
    setSelectedTrajets([]);
    setSelectedTrajet(null);
    setPassengers([]);
    setTripType('ALLER_SIMPLE');
    setSelectedRoute(route);
    setShowBookingModal(true);
    fetchTrajetsByDate(route?.trajetModeleId, defaultDate);
  };

  const addPassenger = () => {
    setPassengers((prev) => [...prev, { nom: "", prenom: "" }]);
  };

  const updatePassenger = (index, field, value) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const submitReservation = async () => {
    if (!selectedTrajet?.id) {
      Alert.alert("Sélection", "Choisissez une date puis un horaire.");
      return;
    }
    const passagers = passengers
      .map((p) => ({
        nom: String(p.nom || "").trim(),
        prenom: String(p.prenom || "").trim(),
      }))
      .filter((p) => p.nom && p.prenom);
    if (passagers.length === 0) {
      Alert.alert("Passagers", "Renseignez au moins un nom et prénom.");
      return;
    }
    const token = await getToken();
    if (!token) {
      Alert.alert("Connexion", "Connectez-vous pour réserver.");
      return;
    }
    closeBookingModal();
    navigation.navigate("Payment", {
      selectedTrajet,
      selectedRoute,
      selectedDate,
      passengers: passagers,
      tripType,
      companyName: companyData.name,
      companyLogo: companyData.logo,
    });
  };

  const handleContact = (type) => {
    if (type === "phone") {
      Linking.openURL(`tel:${companyData.contact.phone}`);
    } else if (type === "whatsapp") {
      Linking.openURL(`https://wa.me/${String(companyData.contact.whatsapp || "").replace(/\s/g, "")}`);
    } else if (type === "email") {
      Linking.openURL(`mailto:${companyData.contact.email}`);
    } else if (type === "website") {
      const web = String(companyData.contact.website || "");
      Linking.openURL(web.startsWith("http") ? web : `https://${web}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez ${companyData.name} - ${companyData.slogan}\n\nNote: ${companyData.rating}/5\n${companyData.contact.website}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Banner Image */}
          <View style={styles.bannerContainer}>
            <Image source={{ uri: companyData.banner }} style={styles.banner} />
            <View style={styles.bannerGradient} />
            
            {/* Header avec bouton retour */}
            <View style={styles.headerOverlay}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <ArrowLeft size={24} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                <Share2 size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            
            {/* Logo et infos */}
            <View style={styles.companyInfoOverlay}>
              <TouchableOpacity style={styles.logoContainer}>
                <Image source={{ uri: companyData.logo }} style={styles.logo} />
                <View style={styles.cameraIcon}>
                  <Camera size={16} color={COLORS.white} />
                </View>
              </TouchableOpacity>
              <View style={styles.companyTextOverlay}>
                <View style={styles.companyNameRow}>
                  <Text style={styles.companyName}>{companyData.name}</Text>
                  {companyData.verified && (
                    <View style={styles.verifiedBadge}>
                      <CheckCircle size={16} color={COLORS.primary} />
                    </View>
                  )}
                </View>
                <Text style={styles.companySlogan}>{companyData.slogan}</Text>
                <View style={styles.ratingRow}>
                  {renderStars(companyData.rating)}
                  <Text style={styles.ratingText}>{companyData.rating} ({companyData.totalReviews} avis)</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Statistiques */}
          <View style={styles.statsContainer}>
            {Object.entries(companyData.stats).map(([key, value], index) => (
              <View key={key} style={styles.statItem}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>
                  {key === "totalTrips" && "Trajets"}
                  {key === "passengers" && "Passagers"}
                  {key === "satisfaction" && "Satisfaction"}
                  {key === "punctuality" && "Ponctualité"}
                </Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.description}>{companyData.description}</Text>
            <View style={styles.infoRow}>
              <CalendarIcon size={16} color={COLORS.muted} />
              <Text style={styles.infoText}>Fondée en {companyData.founded}</Text>
              <Users size={16} color={COLORS.muted} style={styles.infoIcon} />
              <Text style={styles.infoText}>{companyData.employeeCount} employés</Text>
            </View>
          </View>

          {/* Flotte */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notre flotte</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.fleetCard}>
                <View style={styles.fleetHeader}>
                  <Bus size={24} color={COLORS.primary} />
                  <Text style={styles.fleetTitle}>VIP</Text>
                </View>
                <Text style={styles.fleetCount}>{companyData.fleet.vip.count} bus</Text>
                <Text style={styles.fleetCapacity}>{companyData.fleet.vip.capacity} places</Text>
                <View style={styles.amenitiesContainer}>
                  {companyData.fleet.vip.amenities.slice(0, 3).map((amenity, i) => (
                    <View key={i} style={styles.amenityTag}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                  {companyData.fleet.vip.amenities.length > 3 && (
                    <Text style={styles.moreText}>+{companyData.fleet.vip.amenities.length - 3}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.fleetCard}>
                <View style={styles.fleetHeader}>
                  <Bus size={24} color={COLORS.info} />
                  <Text style={styles.fleetTitle}>Standard</Text>
                </View>
                <Text style={styles.fleetCount}>{companyData.fleet.standard.count} bus</Text>
                <Text style={styles.fleetCapacity}>{companyData.fleet.standard.capacity} places</Text>
                <View style={styles.amenitiesContainer}>
                  {companyData.fleet.standard.amenities.map((amenity, i) => (
                    <View key={i} style={styles.amenityTag}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Routes principales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Routes principales</Text>
            {displayedRoutes.map((route, index) => (
              <TouchableOpacity
                key={index}
                style={styles.routeCard}
                onPress={() => handleReservation(route)}
              >
                <View style={styles.routeHeader}>
                  <View style={styles.routeCities}>
                    <Text style={styles.routeFrom}>{route.from}</Text>
                    <ChevronRight size={16} color={COLORS.muted} />
                    <Text style={styles.routeTo}>{route.to}</Text>
                  </View>
                  <Text style={styles.routePrice}>{route.price}</Text>
                </View>
                <View style={styles.routeDetails}>
                  <View style={styles.routeDetail}>
                    <Clock size={12} color={COLORS.muted} />
                    <Text style={styles.routeDetailText}>{route.duration}</Text>
                  </View>
                  <View style={styles.routeDetail}>
                    <MapPin size={12} color={COLORS.muted} />
                    <Text style={styles.routeDetailText}>{route.distance}</Text>
                  </View>
                  <View style={styles.routeDetail}>
                    <CalendarIcon size={12} color={COLORS.muted} />
                    <Text style={styles.routeDetailText}>{route.frequency}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {companyData.routes.length > 5 ? (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => setShowAllRoutesModal(true)}
              >
                <Text style={styles.seeAllText}>Voir plus</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          
            
          {/* Contact et infos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <TouchableOpacity style={styles.contactCard} onPress={() => handleContact("phone")}>
              <Phone size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{companyData.contact.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCard} onPress={() => handleContact("whatsapp")}>
            <FontAwesome name="whatsapp" size={24} color={COLORS.primary} />
              <Text style={styles.contactText}>{companyData.contact.whatsapp}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCard} onPress={() => handleContact("email")}>
              <Mail size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{companyData.contact.email}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCard} onPress={() => handleContact("website")}>
              <Globe size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{companyData.contact.website}</Text>
            </TouchableOpacity>
            <View style={styles.contactCard}>
              <MapPin size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{companyData.contact.address}</Text>
            </View>
          </View>

          {/* Politiques */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Politiques</Text>
            <TouchableOpacity
              style={styles.policyButton}
              onPress={() => setShowPoliciesModal(true)}
            >
              <Shield size={20} color={COLORS.primary} />
              <Text style={styles.policyButtonText}>Voir les politiques</Text>
              <ChevronRight size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          {/* Galerie */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Galerie</Text>
              <TouchableOpacity onPress={() => setShowFullGallery(!showFullGallery)}>
                <Text style={styles.seeAllText}>
                  {showFullGallery ? "Voir moins" : "Voir tout"}
                </Text>
              </TouchableOpacity>
            </View>
            {renderGalleryGrid()}
          </View>

          {/* Avis */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Avis clients</Text>
              <TouchableOpacity onPress={() => setShowAddReviewModal(true)}>
                <Text style={styles.seeAllText}>Ajouter un avis</Text>
              </TouchableOpacity>
            </View>
            {displayedReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewName}>{review.user}</Text>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating)}
                      <Text style={styles.reviewDate}>
                        {new Date(review.date).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
            {companyData.reviews.length > 5 ? (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => setShowAllReviewsModal(true)}
              >
                <Text style={styles.seeAllText}>Voir plus</Text>
              </TouchableOpacity>
            ) : null}
          </View>

        </ScrollView>

        {/* Modal de réservation */}
        <Modal
          visible={showBookingModal}
          animationType="slide"
          transparent={false}
          onRequestClose={closeBookingModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeBookingModal}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Réserver un trajet</Text>
              <View style={{ width: 24 }} />
            </View>
            
            {selectedRoute && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.bookingRouteCard}>
                  <Text style={styles.bookingRouteTitle}>
                    {selectedRoute.from} → {selectedRoute.to}
                  </Text>
                  <Text style={styles.bookingRoutePrice}>{selectedRoute.price}</Text>
                </View>

                <Text style={styles.bookingSectionTitle}>Type de trajet</Text>
                <View style={styles.tripTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.tripTypeBtn,
                      tripType === 'ALLER_SIMPLE' && styles.tripTypeBtnActive,
                    ]}
                    onPress={() => setTripType('ALLER_SIMPLE')}
                  >
                    <Text
                      style={[
                        styles.tripTypeBtnText,
                        tripType === 'ALLER_SIMPLE' && styles.tripTypeBtnTextActive,
                      ]}
                    >
                      Aller simple
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tripTypeBtn,
                      tripType === 'ALLER_RETOUR' && styles.tripTypeBtnActive,
                    ]}
                    onPress={() => setTripType('ALLER_RETOUR')}
                  >
                    <Text
                      style={[
                        styles.tripTypeBtnText,
                        tripType === 'ALLER_RETOUR' && styles.tripTypeBtnTextActive,
                      ]}
                    >
                      Aller-retour
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.bookingSectionTitle}>Horaires disponibles</Text>
                <View style={styles.calendarWrapper}>
                  <DateCalendar
                    current={selectedDate}
                    onDayPress={(day) => {
                      setSelectedDate(day.dateString);
                      setSelectedTrajet(null);
                      fetchTrajetsByDate(selectedRoute?.trajetModeleId, day.dateString);
                    }}
                    markedDates={{
                      [selectedDate]: {
                        selected: true,
                        selectedColor: COLORS.primary,
                      },
                    }}
                    theme={{
                      todayTextColor: COLORS.primary,
                      arrowColor: COLORS.primary,
                    }}
                  />
                </View>

                {loadingTrajets ? (
                  <Text style={styles.emptyTrajetsText}>Chargement des trajets...</Text>
                ) : selectedTrajets.length === 0 ? (
                  <Text style={styles.emptyTrajetsText}>Aucun trajet pour cette date</Text>
                ) : (
                  selectedTrajets.map((trajet) => (
                    <TouchableOpacity
                      key={trajet.id}
                      style={[
                        styles.scheduleItem,
                        selectedTrajet?.id === trajet.id && styles.scheduleItemSelected,
                      ]}
                      onPress={() => setSelectedTrajet(trajet)}
                    >
                      <Clock size={20} color={COLORS.primary} />
                      <Text style={styles.scheduleTime}>{trajet.heure_depart}</Text>
                      <View style={styles.scheduleSeats}>
                        <Text style={styles.seatsText}>Places disponibles</Text>
                        <Text style={styles.seatsCount}>{trajet.places_disponibles}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}

                <Text style={styles.bookingSectionTitle}>Passagers</Text>
                <Text style={styles.passengerHint}>
                  Cliquez sur "Ajouter un passager" puis renseignez nom/prénom.
                </Text>
                <TouchableOpacity style={styles.addPassengerBtn} onPress={addPassenger}>
                  <Text style={styles.addPassengerBtnText}>+ Ajouter un passager</Text>
                </TouchableOpacity>
                {passengers.map((passenger, index) => (
                  <View key={index} style={styles.passengerRow}>
                    <TextInput
                      style={styles.passengerInput}
                      placeholder={`Nom (${index + 1})`}
                      placeholderTextColor={COLORS.muted}
                      value={passenger.nom}
                      onChangeText={(value) => updatePassenger(index, "nom", value)}
                    />
                    <TextInput
                      style={styles.passengerInput}
                      placeholder={`Prénom (${index + 1})`}
                      placeholderTextColor={COLORS.muted}
                      value={passenger.prenom}
                      onChangeText={(value) => updatePassenger(index, "prenom", value)}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={submitReservation}
                >
                  <Text style={styles.bookButtonText}>Payer & réserver</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </Modal>

        {/* Modal des politiques */}
        <Modal
          visible={showPoliciesModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPoliciesModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPoliciesModal(false)}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Politiques</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <View style={styles.policyTabs}>
              {[
                { id: "boarding", label: "Embarquement" },
                { id: "cancellation", label: "Annulation" },
                { id: "luggage", label: "Bagages" },
                
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.policyTab, activePolicyTab === tab.id && styles.activePolicyTab]}
                  onPress={() => setActivePolicyTab(tab.id)}
                >
                  <Text
                    style={[
                      styles.policyTabText,
                      activePolicyTab === tab.id && styles.activePolicyTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <ScrollView style={styles.modalContent}>
              {(companyData.policies[activePolicyTab] || []).map((policy, index) => (
                <View key={index} style={styles.policyItem}>
                  <CheckCircle size={16} color={COLORS.success} />
                  <Text style={styles.policyText}>{policy}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Modal de galerie */}
        <Modal
          visible={!!selectedImage}
          transparent={true}
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageModal}>
            <TouchableOpacity
              style={styles.closeImageModal}
              onPress={() => setSelectedImage(null)}
            >
              <XCircle size={30} color={COLORS.white} />
            </TouchableOpacity>
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
        </Modal>

        {/* Modal toutes les routes */}
        <Modal
          visible={showAllRoutesModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAllRoutesModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAllRoutesModal(false)}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Toutes les routes</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              {companyData.routes.map((route, index) => (
                <TouchableOpacity
                  key={`route-all-${index}`}
                  style={styles.routeCard}
                  onPress={() => {
                    setShowAllRoutesModal(false);
                    handleReservation(route);
                  }}
                >
                  <View style={styles.routeHeader}>
                    <View style={styles.routeCities}>
                      <Text style={styles.routeFrom}>{route.from}</Text>
                      <ChevronRight size={16} color={COLORS.muted} />
                      <Text style={styles.routeTo}>{route.to}</Text>
                    </View>
                    <Text style={styles.routePrice}>{route.price}</Text>
                  </View>
                  <View style={styles.routeDetails}>
                    <View style={styles.routeDetail}>
                      <Clock size={12} color={COLORS.muted} />
                      <Text style={styles.routeDetailText}>{route.duration}</Text>
                    </View>
                    <View style={styles.routeDetail}>
                      <MapPin size={12} color={COLORS.muted} />
                      <Text style={styles.routeDetailText}>{route.distance}</Text>
                    </View>
                    <View style={styles.routeDetail}>
                      <CalendarIcon size={12} color={COLORS.muted} />
                      <Text style={styles.routeDetailText}>{route.frequency}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Modal tous les avis */}
        <Modal
          visible={showAllReviewsModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAllReviewsModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAllReviewsModal(false)}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tous les avis</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalContent}>
              {companyData.reviews.map((review) => (
                <View key={`review-all-${review.id}`} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewName}>{review.user}</Text>
                      <View style={styles.reviewStars}>
                        {renderStars(review.rating)}
                        <Text style={styles.reviewDate}>
                          {new Date(review.date).toLocaleDateString("fr-FR")}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Modal ajout avis */}
        <Modal
          visible={showAddReviewModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAddReviewModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddReviewModal(false)}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Ajouter un avis</Text>
              <View style={{ width: 24 }} />
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Votre note</Text>
              <View style={styles.ratingPicker}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={`star-pick-${s}`} onPress={() => setReviewStars(s)}>
                    <Star
                      size={28}
                      color={s <= reviewStars ? COLORS.warning : COLORS.border}
                      fill={s <= reviewStars ? COLORS.warning : "transparent"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Commentaire</Text>
              <TextInput
                style={styles.reviewInput}
                multiline
                numberOfLines={5}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Partagez votre expérience..."
                placeholderTextColor={COLORS.muted}
              />
              <TouchableOpacity
                style={[styles.bookButton, postingReview && styles.bookButtonDisabled]}
                onPress={submitAvis}
                disabled={postingReview}
              >
                {postingReview ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.bookButtonText}>Publier mon avis</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
};

export default CompanyProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  bannerContainer: {
    height: 320,
    position: "relative",
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  bannerGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: COLORS.overlayHeavy,
  },
  headerOverlay: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  companyInfoOverlay: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  logoContainer: {
    position: "relative",
    marginRight: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 4,
  },
  companyTextOverlay: {
    flex: 1,
  },
  companyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  companyName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
  },
  verifiedBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 2,
  },
  companySlogan: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.white,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  seeMoreBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoIcon: {
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
  },
  ratingPicker: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  reviewInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    color: COLORS.text,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  fleetCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fleetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  fleetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  fleetCount: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  fleetCapacity: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  amenityTag: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  moreText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
  },
  routeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  routeCities: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeFrom: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  routeTo: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  routePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  routeDetails: {
    flexDirection: "row",
    gap: 12,
  },
  routeDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeDetailText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  galleryGridItem: {
    width: (width - 40) / 2,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
  },
  galleryGridItemLarge: {
    width: width - 32,
    height: 200,
  },
  galleryGridImage: {
    width: "100%",
    height: "100%",
  },
  galleryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryOverlayText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 10,
    color: COLORS.muted,
  },
  reviewComment: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  whatsappIcon: {
    width: 20,
    height: 20,
  },
  policyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  policyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    flex: 1,
    marginLeft: 12,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
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
  bookingRouteCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  bookingRouteTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  bookingRoutePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: 8,
  },
  bookingSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  tripTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tripTypeBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 4,
  },
  tripTypeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tripTypeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  tripTypeBtnTextActive: {
    color: COLORS.white,
  },
  calendarWrapper: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleItemSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: `${COLORS.primary}12`,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  scheduleSeats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  seatsText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  seatsCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.success,
  },
  emptyTrajetsText: {
    fontSize: 14,
    color: COLORS.muted,
    marginVertical: 8,
  },
  passengerHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 10,
  },
  addPassengerBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  addPassengerBtnText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  passengerRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  passengerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.card,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  policyTabs: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  policyTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  activePolicyTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  policyTabText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  activePolicyTabText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  policyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  policyText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  imageModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeImageModal: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },
});