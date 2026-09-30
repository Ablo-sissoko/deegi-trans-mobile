import { resolveApiMediaUrl } from "./mediaUrl";

export function parseColisImages(imagesField) {
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
}

/** Normalise un colis API → format écran détail / liste. */
export function transformParcelData(apiParcel, type) {
  const statusKey = String(apiParcel?.statut_colis || apiParcel?.statut || "EN_ATTENTE").toUpperCase();
  const timeline = Array.isArray(apiParcel?.tracking)
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
    type,
    trackingNumber: apiParcel.Numero_suivi_colis || `COLIS-${apiParcel.id}`,
    status: statusKey,
    description: apiParcel.nom_colis || apiParcel.description_colis || "Colis",
    weight: apiParcel.poids_colis != null ? `${apiParcel.poids_colis} kg` : "—",
    dimensions: apiParcel.dimensions_colis || "—",
    value:
      apiParcel.valeur_declaree_colis != null
        ? `${Number(apiParcel.valeur_declaree_colis).toLocaleString("fr-FR")} FCFA`
        : "N/A",
    createdAt: apiParcel.date_enregistrement_colis || apiParcel.createdAt,
    estimatedDelivery: apiParcel.date_livraison_colis,
    images: parseColisImages(apiParcel.images_colis).map(resolveApiMediaUrl),
    sender: {
      name:
        `${apiParcel.expediteur?.prenom || ""} ${apiParcel.expediteur?.nom || ""}`.trim() ||
        "Expéditeur",
      phone: apiParcel.expediteur?.numero_telephone || "—",
      email: apiParcel.expediteur?.email || "—",
      address: apiParcel.expediteur?.adresse || "Adresse non spécifiée",
    },
    receiver: {
      name:
        `${apiParcel.destinataire?.prenom || ""} ${apiParcel.destinataire?.nom || ""}`.trim() ||
        "Destinataire",
      phone: apiParcel.destinataire?.numero_telephone || "—",
      email: apiParcel.destinataire?.email || "—",
      address: apiParcel.destinataire?.adresse || "Adresse non spécifiée",
    },
    company: {
      name: apiParcel.compagnie?.nom_compagnie || "DeegiTrans Express",
      logo: apiParcel.compagnie?.logo_compagnie
        ? resolveApiMediaUrl(apiParcel.compagnie.logo_compagnie)
        : null,
      tracking: apiParcel.Numero_suivi_colis
        ? `https://tracking.deegitrans.com/${apiParcel.Numero_suivi_colis}`
        : null,
    },
    timeline,
  };
}
