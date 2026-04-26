import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import {
  Bell,
  Search,
  Ticket,
  CreditCard,
  XCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react-native";
import COLORS from "../utils/COLORS";

const CATEGORIES = [
  { id: "all", label: "Toutes", icon: Bell, color: COLORS.primary },
  { id: "ticket", label: "Billets", icon: Ticket, color: COLORS.info },
  { id: "payment", label: "Paiements", icon: CreditCard, color: COLORS.success },
  { id: "cancelled", label: "Annulés", icon: XCircle, color: COLORS.error },
  { id: "success", label: "Succès", icon: CheckCircle, color: COLORS.success },
];

const NOTIFICATIONS = [
  {
    id: "1",
    type: "ticket",
    title: "Réservation confirmée",
    message: "Votre billet pour Bamako → Sikasso a été réservé avec succès.",
    time: "Il y a 5 minutes",
    status: "success",
    read: false,
    route: "Bamako → Sikasso",
    price: "9 000 FCFA",
  },
  {
    id: "2",
    type: "payment",
    title: "Paiement reçu",
    message: "Paiement de 9 000 FCFA confirmé pour votre trajet Bamako → Sikasso.",
    time: "Il y a 15 minutes",
    status: "success",
    read: false,
    amount: "9 000 FCFA",
  },
  {
    id: "3",
    type: "cancelled",
    title: "Réservation annulée",
    message: "Votre réservation pour Bamako → Kayes a été annulée. Remboursement en cours.",
    time: "Il y a 2 heures",
    status: "error",
    read: true,
    route: "Bamako → Kayes",
  },
  {
    id: "4",
    type: "ticket",
    title: "Départ imminent",
    message: "Votre bus pour Ségou part dans 30 minutes. Préparez-vous !",
    time: "Il y a 3 heures",
    status: "warning",
    read: true,
    route: "Bamako → Ségou",
    departureTime: "14:30",
  },
  {
    id: "5",
    type: "payment",
    title: "Paiement échoué",
    message: "Le paiement de 6 000 FCFA a échoué. Veuillez réessayer.",
    time: "Hier",
    status: "error",
    read: true,
    amount: "6 000 FCFA",
  },
  {
    id: "6",
    type: "success",
    title: "Billet validé",
    message: "Votre billet a été validé avec succès. Bon voyage !",
    time: "Hier",
    status: "success",
    read: true,
    route: "Bamako → Ségou",
  },
];

export default function Notifications() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle size={20} color={COLORS.success} />;
      case "error":
        return <XCircle size={20} color={COLORS.error} />;
      case "warning":
        return <Clock size={20} color={COLORS.warning} />;
      default:
        return <Bell size={20} color={COLORS.info} />;
    }
  };

  const getCategoryIcon = (type) => {
    const category = CATEGORIES.find((cat) => cat.id === type);
    const IconComponent = category?.icon || Bell;
    return <IconComponent size={16} color={category?.color || COLORS.muted} />;
  };

  const filteredNotifications = notifications.filter((notif) => {
    const matchesSearch =
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (notif.route && notif.route.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || notif.type === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        {getStatusIcon(item.status)}
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        
        {item.route && (
          <View style={styles.notificationMeta}>
            <Ticket size={14} color={COLORS.muted} />
            <Text style={styles.metaText}>{item.route}</Text>
            {item.price && (
              <>
                <Text style={styles.metaSeparator}>•</Text>
                <Text style={styles.metaText}>{item.price}</Text>
              </>
            )}
          </View>
        )}
        
        {item.amount && (
          <View style={styles.notificationMeta}>
            <CreditCard size={14} color={COLORS.muted} />
            <Text style={styles.metaText}>{item.amount}</Text>
          </View>
        )}
        
        {item.departureTime && (
          <View style={styles.notificationMeta}>
            <Clock size={14} color={COLORS.muted} />
            <Text style={styles.metaText}>Départ à {item.departureTime}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Bell size={24} color={COLORS.primary} />
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Tout marquer lu</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une notification..."
            placeholderTextColor={COLORS.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <XCircle size={20} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Horizontal Scroll */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            const isActive = selectedCategory === category.id;
            const count = notifications.filter(
              (n) => category.id === "all" || n.type === category.id
            ).length;

            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <IconComponent
                  size={16}
                  color={isActive ? COLORS.white : category.color}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    isActive && styles.categoryLabelActive,
                  ]}
                >
                  {category.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countText, isActive && styles.countTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell size={48} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Aucune notification ne correspond à votre recherche"
                : "Vous n'avez pas encore de notifications"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.card,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  markAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    padding: 0,
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },
  categoryLabelActive: {
    color: COLORS.white,
  },
  countBadge: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  countBadgeActive: {
    backgroundColor: COLORS.whiteTranslucent,
  },
  countText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },
  countTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  notificationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadCard: {
    backgroundColor: COLORS.highlight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  unreadText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.muted,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
    lineHeight: 18,
  },
  notificationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  metaSeparator: {
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 40,
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
    paddingHorizontal: 32,
  },
});