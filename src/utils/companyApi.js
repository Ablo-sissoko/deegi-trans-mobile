/** Helpers API compagnie / trajets — fallbacks si certaines routes prod sont absentes. */

function parseJsonArray(value) {
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
}

export function extractPlanningTimes(planning) {
  const slots = Array.isArray(planning?.slots) ? planning.slots : [];
  if (slots.length) {
    return [...new Set(slots.map((s) => String(s.heure_depart || "").trim()).filter(Boolean))];
  }
  return parseJsonArray(planning?.heures);
}

export function mapPlanningListToRoutes(planningList) {
  const list = Array.isArray(planningList) ? planningList : [];
  const routes = list.map((entry) => {
    const tm = entry?.trajetModele || {};
    const from = tm?.ville_depart_nom || tm?.villeDepart?.nom || "Ville départ";
    const to = tm?.ville_arrivee_nom || tm?.villeArrivee?.nom || "Ville arrivée";
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

  const schedules = list.map((entry) => {
    const tm = entry?.trajetModele || {};
    const from = tm?.ville_depart_nom || tm?.villeDepart?.nom || "Ville départ";
    const to = tm?.ville_arrivee_nom || tm?.villeArrivee?.nom || "Ville arrivée";
    const times = [
      ...new Set(
        (entry?.trajetPlannings || []).flatMap((p) => extractPlanningTimes(p)),
      ),
    ];
    return { route: `${from} → ${to}`, times };
  });

  return { routes, schedules };
}

export function mapTrajetModelesToRoutes(modeles) {
  const list = Array.isArray(modeles) ? modeles : [];
  const routes = list.map((tm) => ({
    trajetModeleId: tm?.id,
    from: tm?.villeDepart?.nom || "Ville départ",
    to: tm?.villeArrivee?.nom || "Ville arrivée",
    price: `${Number(tm?.prix || 0).toLocaleString("fr-FR")} FCFA`,
    duration: "-",
    distance: "-",
    frequency: "—",
  }));
  const schedules = routes.map((r) => ({
    route: `${r.from} → ${r.to}`,
    times: [],
  }));
  return { routes, schedules };
}

/** Routes principales d'une compagnie (plannings prod, sinon modèles de trajet). */
export async function fetchCompanyRoutes(client, compagnieId) {
  try {
    const { data: planningData } = await client.get(`/api/compagnies/${compagnieId}/plannings`);
    const planningList = Array.isArray(planningData?.data) ? planningData.data : [];
    if (planningList.length) return mapPlanningListToRoutes(planningList);
  } catch (e) {
    if (e?.response?.status !== 404) {
      console.warn("Plannings compagnie:", e?.response?.status, e?.message);
    }
  }

  try {
    const { data } = await client.get("/api/trajet-modeles", {
      params: { compagnie_id: compagnieId },
    });
    const modeles = Array.isArray(data?.trajetModeles) ? data.trajetModeles : [];
    return mapTrajetModelesToRoutes(modeles);
  } catch (e) {
    console.warn("Modèles trajet compagnie:", e?.response?.status, e?.message);
    return { routes: [], schedules: [] };
  }
}

/** Trajets réels pour un modèle + date (deux routes backend possibles). */
export async function fetchTrajetsByModeleDate(client, trajetModeleId, date) {
  const body = { date };
  const paths = [
    `/api/compagnies/modele/${trajetModeleId}/date`,
    `/api/trajets/modele/${trajetModeleId}/date`,
  ];

  for (const path of paths) {
    try {
      const { data } = await client.post(path, body);
      return Array.isArray(data?.trajets) ? data.trajets : [];
    } catch (e) {
      if (e?.response?.status === 404) continue;
      throw e;
    }
  }
  return [];
}
