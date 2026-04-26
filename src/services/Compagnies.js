import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  RefreshControl,
  FlatList,
} from "react-native";
import { Search, Star, MapPin, ChevronRight, Phone, Mail } from "lucide-react-native";
import Header from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import COLORS from "../utils/COLORS";
import { resolveApiMediaUrl } from "../utils/mediaUrl";
import { authClient } from "../api/auth";

export default function Compagnies() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [compagnies, setCompagnies] = useState([]);

  const mapCompagnie = (c) => {
    const logo =
      (c.logo_compagnie && resolveApiMediaUrl(c.logo_compagnie)) ||
      "https://via.placeholder.com/200";
    const coverSrc = c.banner_compagnie || c.logo_compagnie;
    const coverImage = coverSrc
      ? resolveApiMediaUrl(coverSrc)
      : logo;
    return {
      id: String(c.id),
      name: c.nom_compagnie || "Compagnie",
      logo,
      coverImage,
      rating: Number(c.rating_compagnie || 0),
      totalReviews: Number(c.total_reviews_compagnie || 0),
      adresse: c.adresse_compagnie || "Adresse non renseignée",
      contact: c.telephone_compagnie || "......",
      description: c.description_compagnie || "",
      status: "active",
      email_compagnie: c.email_compagnie || ".....",
    };
  };

  const fetchCompagnies = useCallback(async () => {
    try {
      const { data } = await authClient.get("/api/compagnies");
      const rows = Array.isArray(data?.compagnies) ? data.compagnies : [];
      setCompagnies(rows.map(mapCompagnie));
    } catch (e) {
      console.error("Erreur chargement compagnies:", e);
      setCompagnies([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCompagnies();
  }, [fetchCompagnies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompagnies();
  }, [fetchCompagnies]);

  const getStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push("★");
    }
    if (hasHalfStar) {
      stars.push("½");
    }
    return stars.join("");
  };

  const filteredCompagnies = compagnies.filter((compagnie) => {
    const matchesSearch = compagnie.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      compagnie.adresse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      compagnie.contact.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderCompagnieCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("CompagnieProfile", { compagnieId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.logo }} style={styles.logo} />
        <View style={styles.cardInfo}>
          <Text style={styles.compagnieName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
            <Text style={styles.reviewsText}>({item.totalReviews} avis)</Text>
          </View>
        </View>
        <ChevronRight size={20} color={COLORS.muted} />
      </View>

      <View style={styles.cardBody}>


        <View style={styles.infoRow}>
          <MapPin size={14} color={COLORS.muted} />
          <Text style={styles.infoText} numberOfLines={1}>{item.adresse}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={14} color={COLORS.muted} />
          <Text style={styles.infoText}>{item.contact}</Text>
        </View>
        <View style={styles.infoRow}>
          <Mail size={14} color={COLORS.muted} />
          <Text style={styles.infoText}>{item.email_compagnie || "....."}</Text>
        </View>

      </View>

    </TouchableOpacity>
  );

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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {/* En-tête */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Compagnies</Text>
            <Text style={styles.headerSubtitle}>
              En circulation sur la plateforme
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowSearch((prev) => !prev)}
            style={styles.searchToggleBtn}
          >
            <Search size={20} color={COLORS.muted} />
          </TouchableOpacity>

        </View>

        {/* Barre de recherche (visible seulement après clic sur l'icône) */}
        {showSearch ? (
          <View style={styles.searchContainer}>
            <Search size={20} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une compagnie ou une ville..."
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        ) : null}

        {/* Liste des compagnies */}
        {filteredCompagnies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Search size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              Aucune compagnie trouvée
            </Text>
            <Text style={styles.emptySubtext}>
              Essayez avec d'autres mots-clés
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredCompagnies}
            renderItem={renderCompagnieCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ScrollView>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  searchToggleBtn: {
    marginRight: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.bgSoft,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  compagnieName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  reviewsText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  cardBody: {

  },
  description: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  fleetBadge: {
    backgroundColor: COLORS.bgSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fleetText: {
    fontSize: 11,
    color: COLORS.muted,
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
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
});