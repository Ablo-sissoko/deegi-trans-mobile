import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import {
  Package,
  MapPin,
  Calendar,
  User,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Navigation,
  Phone,
  Mail,
  FileText,
  ArrowLeft,
  Share2,
} from "lucide-react-native";
import Header from "../components/Header";
import COLORS from "../utils/COLORS";
import { authClient } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { resolveApiMediaUrl } from "../utils/mediaUrl";

const { width, height } = Dimensions.get("window");

const STATUS_CONFIG = {
  EN_ATTENTE: {
    label: "En attente",
    icon: Clock,
    color: COLORS.warning,
    bgColor: COLORS.warningSoft || "#FFF3E0",
  },
  RAMASSE: {
    label: "Ramasse",
    icon: Truck,
    color: COLORS.info,
    bgColor: COLORS.infoSoftAlt || "#E3F2FD",
  },
  EN_TRANSIT: {
    label: "En transit",
    icon: Navigation,
    color: COLORS.primary,
    bgColor: COLORS.highlight || "#FFE0B2",
  },
  ARRIVE: {
    label: "Arrivé",
    icon: MapPin,
    color: COLORS.success,
    bgColor: COLORS.successSoftAlt || "#E8F5E9",
  },
  LIVRE: {
    label: "Livré",
    icon: CheckCircle,
    color: COLORS.success,
    bgColor: COLORS.successSoftAlt || "#E8F5E9",
  },
  ANNULE: {
    label: "Annulé",
    icon: XCircle,
    color: COLORS.error,
    bgColor: COLORS.errorSoft || "#FFEBEE",
  },
};

// Images colis : tableau Sequelize ou chaîne JSON d’URLs
const parseImages = (imagesField) => {
  if (imagesField == null) return [];
  if (Array.isArray(imagesField)) {
    return imagesField.filter((x) => typeof x === "string" && String(x).trim());
  }
  if (typeof imagesField === "string") {
    const s = imagesField.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed)
        ? parsed.filter((x) => typeof x === "string" && String(x).trim())
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Helper pour formater la date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper pour formater la date courte
const formatShortDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
};

// Transformation des données API vers le format attendu par les composants
const transformParcelData = (apiParcel, type) => {
  const statusKey = apiParcel.statut_colis || "EN_ATTENTE";
  const timeline = Array.isArray(apiParcel.tracking)
    ? apiParcel.tracking.map((event) => ({
        status: event.statut,
        date: event.createdAt,
        description: event.description,
        location: event.location,
      }))
    : [];

  return {
    id: apiParcel.id,
    expediteur_id: apiParcel.expediteur_id,
    destinataire_id: apiParcel.destinataire_id,
    type: type,
    trackingNumber: apiParcel.Numero_suivi_colis || `COLIS-${apiParcel.id}`,
    status: statusKey.toLowerCase().replace(/_/g, "_"),
    description: apiParcel.nom_colis || "Colis",
    weight: apiParcel.poids_colis ? `${apiParcel.poids_colis} kg` : ".....",
    dimensions: apiParcel.dimensions_colis || ".....",
    value: apiParcel.valeur_declaree_colis ? `${apiParcel.valeur_declaree_colis.toLocaleString()} FCFA` : "N/A",
    createdAt: apiParcel.date_enregistrement_colis,
    estimatedDelivery: apiParcel.date_livraison_colis,
    images: parseImages(apiParcel.images_colis).map(resolveApiMediaUrl),
    sender: {
      name:
        `${apiParcel.expediteur?.prenom || ""} ${apiParcel.expediteur?.nom || ""}`.trim() ||
        "Expéditeur",
      phone: apiParcel.expediteur?.numero_telephone || ".....",
      email: apiParcel.expediteur?.email || ".....",
      address: apiParcel.expediteur?.adresse || "Adresse non spécifiée",
    },
    receiver: {
      name:
        `${apiParcel.destinataire?.prenom || ""} ${apiParcel.destinataire?.nom || ""}`.trim() ||
        "Destinataire",
      phone: apiParcel.destinataire?.numero_telephone || ".....",
      email: apiParcel.destinataire?.email || ".....",
      address: apiParcel.destinataire?.adresse || "Adresse non spécifiée",
    },
    company: {
      name: apiParcel.compagnie?.nom_compagnie || "DeegiTrans Express",
      logo: apiParcel.compagnie?.logo_compagnie
        ? resolveApiMediaUrl(apiParcel.compagnie.logo_compagnie)
        : null,
      tracking: `https://tracking.deegitrans.com/${apiParcel.Numero_suivi_colis}`,
    },
    timeline,
  };
};

// Extraire la ville de l'adresse
const extractCityFromAddress = (address) => {
  if (!address) return null;
  const parts = address.split(",");
  return parts[parts.length - 1]?.trim();
};

// Composant ParcelCard (inchangé)
const ParcelCard = ({ parcel, onPress, user }) => {
  const statusKey = parcel.status.toUpperCase().replace(/_/g, "_");
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.EN_ATTENTE;

  const createdDate = formatShortDate(parcel.createdAt);
  const departureCity = extractCityFromAddress(parcel.sender?.address) || "Bamako";
  const isSender = Number(user?.id) === Number(parcel.expediteur_id);
  const displayUser = isSender ? parcel.receiver : parcel.sender;
  return (
    <TouchableOpacity
      style={styles.newCard}
      activeOpacity={0.9}
      onPress={() => onPress(parcel)}
    >
      <View style={styles.newHeader}>
        <View style={styles.iconBox}>
          <Package size={18} color={COLORS.white} />
          </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.newTitle} numberOfLines={1}>
            {parcel.description}
          </Text>
          <Text style={styles.newSub}>
            {departureCity} • {createdDate}
            </Text>
        </View>

        <View style={[styles.newStatus, { backgroundColor: status.bgColor }]}>
          <Text style={[styles.newStatusText, { color: status.color }]}>
            {status.label}
            </Text>
          </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeDot} />
          <View style={styles.routeLine} />
        <Truck size={16} color={COLORS.primary} />
        <View style={styles.routeLine} />
        <View style={[styles.routeDot, { backgroundColor: COLORS.success }]} />
        </View>

      <View style={styles.newFooter}>
        <View style={styles.footerItem}>
          <User size={14} color={COLORS.muted} />
          <Text style={styles.footerText} numberOfLines={1}>
            {displayUser?.name || "Inconnu"}
          </Text>
        </View>

        <View style={styles.footerDivider} />

        <View style={styles.footerItem}>
          <Truck size={14} color={COLORS.muted} />
          <Text style={styles.footerText} numberOfLines={1}>
            {parcel.company?.name || "Non définie"}
        </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Composant ParcelDetailModal (inchangé)
const ParcelDetailModal = ({ visible, parcel, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState("details");

  if (!parcel) return null;

  const statusKey = parcel.status.toUpperCase().replace(/_/g, "_");
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.EN_ATTENTE;
  const StatusIcon = status.icon;

  const renderTimeline = () => (
    <View style={styles.timelineContainer}>
      {parcel.timeline.map((event, index) => {
        const eventStatus = STATUS_CONFIG[event.status] || STATUS_CONFIG.EN_ATTENTE;
        const EventIcon = eventStatus.icon;
        const isLast = index === parcel.timeline.length - 1;
        const eventDate = formatDate(event.date);

        return (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: eventStatus.color },
                ]}
              >
                <EventIcon size={12} color={COLORS.white} />
              </View>
              {!isLast && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineStatus}>{eventStatus.label}</Text>
              <Text style={styles.timelineDescription}>{event.description}</Text>
              <Text style={styles.timelineDate}>{eventDate}</Text>
              {event.location && (
                <Text style={styles.timelineLocation}>
                  📍 {event.location}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderGallery = () => {
    const galleryImages = parcel.images && parcel.images.length > 0 
      ? [...parcel.images] 
      : [];

    if (galleryImages.length === 0) {
      return (
        <View style={styles.noImagesContainer}>
          <ImageIcon size={48} color={COLORS.muted} />
          <Text style={styles.noImagesText}>Aucune image disponible</Text>
        </View>
      );
    }

    const mainImage = galleryImages[0];
    const smallImages = galleryImages.slice(1, 4);

    return (
    <View style={styles.galleryContainer}>
              <TouchableOpacity
          onPress={() => setSelectedImage(mainImage)}
          activeOpacity={0.9}
          style={styles.galleryMainWrapper}
        >
          <Image source={{ uri: mainImage }} style={styles.galleryMainImage} />
          <View style={styles.galleryMainOverlay}>
            <View style={styles.viewIconContainer}>
              <ImageIcon size={20} color={COLORS.white} />
              <Text style={styles.viewIconText}>Voir en grand</Text>
            </View>
          </View>
        </TouchableOpacity>

        {smallImages.length > 0 && (
          <View style={styles.galleryGridContainer}>
            {smallImages.map((image, index) => (
              <TouchableOpacity
                key={`${parcel.id}-gallery-${index}`}
                onPress={() => setSelectedImage(image)}
                activeOpacity={0.8}
                style={styles.galleryGridItem}
              >
                <Image source={{ uri: image }} style={styles.galleryGridImage} />
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );
  };

  const renderDetails = () => (
    <View style={styles.detailsContainer}>
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Informations générales</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Numéro de suivi</Text>
            <Text style={styles.infoValue}>{parcel.trackingNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Poids</Text>
            <Text style={styles.infoValue}>{parcel.weight}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Dimensions</Text>
            <Text style={styles.infoValue}>{parcel.dimensions}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Valeur déclarée</Text>
            <Text style={styles.infoValue}>{parcel.value}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Expéditeur</Text>
        <View style={styles.personCard}>
          <User size={20} color={COLORS.primary} />
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{parcel.sender.name}</Text>
            <View style={styles.personContact}>
              <Phone size={12} color={COLORS.muted} />
              <Text style={styles.personDetail}>{parcel.sender.phone}</Text>
            </View>
            <View style={styles.personContact}>
              <Mail size={12} color={COLORS.muted} />
              <Text style={styles.personDetail}>{parcel.sender.email}</Text>
            </View>
            <Text style={styles.personAddress}>{parcel.sender.address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Destinataire</Text>
        <View style={styles.personCard}>
          <User size={20} color={COLORS.success} />
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{parcel.receiver.name}</Text>
            <View style={styles.personContact}>
              <Phone size={12} color={COLORS.muted} />
              <Text style={styles.personDetail}>{parcel.receiver.phone}</Text>
            </View>
            <View style={styles.personContact}>
              <Mail size={12} color={COLORS.muted} />
              <Text style={styles.personDetail}>{parcel.receiver.email}</Text>
            </View>
            <Text style={styles.personAddress}>{parcel.receiver.address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Compagnie de transport</Text>
        <View style={styles.companyCard}>
          <Truck size={20} color={COLORS.primary} />
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{parcel.company.name}</Text>
            <TouchableOpacity
              style={styles.trackingLink}
              onPress={() => console.log("Open tracking")}
            >
              <Navigation size={14} color={COLORS.primary} />
              <Text style={styles.trackingLinkText}>Suivre en ligne</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderContent}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Package size={20} color={COLORS.white} />
              <Text style={styles.modalTitle}>Détails du colis</Text>
            </View>
            <TouchableOpacity style={styles.shareButton}>
              <Share2 size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
            </View>

        <View style={styles.modalTabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "details" && styles.activeTab]}
            onPress={() => setActiveTab("details")}
          >
            <FileText
              size={18}
              color={activeTab === "details" ? COLORS.primary : COLORS.muted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "details" && styles.activeTabText,
              ]}
            >
              Détails
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "timeline" && styles.activeTab]}
            onPress={() => setActiveTab("timeline")}
          >
            <Clock
              size={18}
              color={activeTab === "timeline" ? COLORS.primary : COLORS.muted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "timeline" && styles.activeTabText,
              ]}
            >
              Suivi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "gallery" && styles.activeTab]}
            onPress={() => setActiveTab("gallery")}
          >
            <ImageIcon
              size={18}
              color={activeTab === "gallery" ? COLORS.primary : COLORS.muted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "gallery" && styles.activeTabText,
              ]}
            >
              Photos
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "details" && renderDetails()}
          {activeTab === "timeline" && renderTimeline()}
          {activeTab === "gallery" && renderGallery()}
        </ScrollView>

        {selectedImage && (
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
        )}
      </View>
    </Modal>
  );
};

// Composant principal Colis
const Colis = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState("envoyes");
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sentParcels, setSentParcels] = useState([]);
  const [receivedParcels, setReceivedParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const role = String(user?.role || "").toUpperCase();
  const compagnieId = user?.compagnie_id != null ? Number(user.compagnie_id) : null;

  const fetchParcels = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      let transformedSent = [];
      let transformedReceived = [];

      const response = await authClient.get("/api/colis/mes-colis");
      if (response.data) {
        transformedSent = (response.data.envoyes || []).map((parcel) =>
          transformParcelData(parcel, "envoye"),
        );
        transformedReceived = (response.data.recus || []).map((parcel) =>
          transformParcelData(parcel, "recu"),
        );
      }

      // Pour les agents/admins : lister tous les colis de la compagnie
      if ((role === "AGENT" || role === "ADMIN") && compagnieId) {
        try {
          const { data: companyData } = await authClient.get(
            `/api/colis/compagnie/${compagnieId}`,
          );
          const companyParcels = Array.isArray(companyData?.colis) ? companyData.colis : [];
          const transformedCompany = companyParcels.map((parcel) =>
            transformParcelData(parcel, "envoye"),
          );
          const byId = new Map();
          [...transformedCompany, ...transformedSent].forEach((p) => {
            if (p?.id != null) byId.set(p.id, p);
          });
          transformedSent = Array.from(byId.values());
        } catch (err) {
          console.warn("Colis compagnie non chargés:", err?.response?.data || err?.message || err);
        }
      }

      setSentParcels(transformedSent);
      setReceivedParcels(transformedReceived);
    } catch (error) {
      console.error("Erreur lors du chargement des colis:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, role, compagnieId]);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchParcels();
  }, [fetchParcels]);

  const parcels = activeTab === "envoyes" ? sentParcels : receivedParcels;

  const handleParcelPress = (parcel) => {
    setSelectedParcel(parcel);
    setModalVisible(true);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Header />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement de vos colis...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Header />
      
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "envoyes" && styles.activeTabButton]}
            onPress={() => setActiveTab("envoyes")}
          >
            <Package
              size={20}
              color={activeTab === "envoyes" ? COLORS.primary : COLORS.muted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "envoyes" && styles.activeTabButtonText,
              ]}
            >
              Colis envoyés
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{sentParcels.length}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "recus" && styles.activeTabButton]}
            onPress={() => setActiveTab("recus")}
          >
            <Package
              size={20}
              color={activeTab === "recus" ? COLORS.primary : COLORS.muted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "recus" && styles.activeTabButtonText,
              ]}
            >
              Colis reçus
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{receivedParcels.length}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.parcelsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.parcelsContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
          {parcels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package size={64} color={COLORS.muted} />
              <Text style={styles.emptyTitle}>Aucun colis</Text>
              <Text style={styles.emptyText}>
                {activeTab === "envoyes" 
                  ? "Vous n'avez pas encore envoyé de colis" 
                  : "Vous n'avez pas encore reçu de colis"}
              </Text>
            </View>
          ) : (
            parcels.map((parcel) => (
            <ParcelCard
              key={parcel.id}
              parcel={parcel}
              onPress={handleParcelPress}
                user={user}
            />
            ))
          )}
        </ScrollView>

        <ParcelDetailModal
          visible={modalVisible}
          parcel={selectedParcel}
          onClose={() => setModalVisible(false)}
        />
      </View>
    </>
  );
};

export default Colis;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
   
    marginLeft: 10,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.whiteSoft,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
  },
  activeTabButtonText: {
    color: COLORS.primary,
  },
  countBadge: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },
  parcelsList: {
    flex: 1,
  },
  parcelsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  parcelCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  parcelName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metaGrid: {
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    backgroundColor: COLORS.bgSoft || "#F7F9FC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.muted,
    minWidth: 72,
  },
  metaValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
    flex: 1,
  },
  cardRoute: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  routeText: {
    fontSize: 12,
    color: COLORS.textLight,
    flex: 1,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.muted,
    marginHorizontal: 8,
    borderStyle: "dashed",
    borderRadius: 1,
  },
  cardDetails: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.muted,
  },
  cardGalleryContainer: {
    flexDirection: "row",
    height: 160,
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
    gap: 4,
  },
  cardMainImageContainer: {
    flex: 2,
  },
  cardMainImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.muted,
  },
  cardSideGrid: {
    flex: 1,
    gap: 4,
  },
  cardSideImageContainer: {
    flex: 1,
    position: "relative",
  },
  cardSideImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.muted,
  },
  cardOverlayMore: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  cardMoreText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
  },
  shareButton: {
    padding: 4,
  },
  modalStatus: {
    alignItems: "center",
  },
  modalStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalTracking: {
    fontSize: 12,
    color: COLORS.whiteSoft,
  },
  modalTabs: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.muted,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailsContainer: {
    gap: 24,
    paddingBottom: 90,
  },
  infoSection: {
    gap: 12,
    
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  personCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  personContact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  personDetail: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  personAddress: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  companyCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  companyInfo: {
    flex: 1,

  },
  companyName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  trackingLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trackingLinkText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  timelineContainer: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 2,
  },
  timelineLocation: {
    fontSize: 11,
    color: COLORS.primary,
  },
  galleryContainer: {
    paddingVertical: 8,
  },
  galleryMainWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  galleryMainImage: {
    width: "100%",
    height: 220,
    backgroundColor: COLORS.bg,
  },
  galleryMainOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlayMedium,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.overlayHeavy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewIconText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "500",
  },
  galleryGridContainer: {
    flexDirection: "row",
    gap: 8,
  },
  galleryGridItem: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 1,
    backgroundColor: COLORS.bg,
    position: "relative",
  },
  galleryGridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  moreImagesOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlayMedium,
    justifyContent: "center",
    alignItems: "center",
  },
  moreImagesText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  totalImagesIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  totalImagesText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  noImagesContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  noImagesText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 12,
  },
  imageModal: {
    flex: 1,
    backgroundColor: COLORS.overlayStrong,
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
  newCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  
  newHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  
  newTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  
  newSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  
  newStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  
  newStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  
  /* 🔥 ROUTE */
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },
  
  /* 🔥 FOOTER */
  newFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    flex: 1,
  },
  
  footerDivider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
});