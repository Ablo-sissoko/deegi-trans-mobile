/**
 * API production : https://bus.deegipay.com/api/
 * Override via EXPO_PUBLIC_API_BASE_URL (origine ou URL se terminant par /api).
 */
const DEFAULT_API = "https://bus.deegipay.com/api";

function parseServerOrigin(raw) {
  const trimmed = String(raw || DEFAULT_API).replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -"/api".length).replace(/\/+$/, "");
  }
  return trimmed;
}

/** Origine serveur (médias /uploads, PDF…) — sans suffixe /api */
export const API_BASE_URL = parseServerOrigin(process.env.EXPO_PUBLIC_API_BASE_URL);

/** Préfixe REST axios — https://bus.deegipay.com/api */
export const API_URL = `${API_BASE_URL.replace(/\/+$/, "")}/api`;

/** Retire /api du chemin quand baseURL = API_URL (évite /api/api/…). */
export function normalizeApiPath(path) {
  if (path == null) return path;
  const s = String(path);
  if (s.startsWith("/api/")) return s.slice(4);
  if (s.startsWith("api/")) return `/${s.slice(4)}`;
  return s;
}

/** URL absolue pour fetch manuel (upload photo, etc.). */
export function buildApiUrl(path, query = "") {
  const base = API_URL.replace(/\/+$/, "");
  const p = normalizeApiPath(path);
  const pathPart = p.startsWith("/") ? p : `/${p}`;
  const qs = query ? (String(query).startsWith("?") ? query : `?${query}`) : "";
  return `${base}${pathPart}${qs}`;
}
