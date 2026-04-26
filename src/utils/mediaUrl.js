import { API_BASE_URL } from "../config/api";

/**
 * Préfixe les chemins relatifs du backend (/uploads/...) pour React Native (Image uri).
 * Les URLs absolues http(s) et file: sont laissées telles quelles.
 */
export function resolveApiMediaUrl(url) {
  if (url == null) return "";
  const s = String(url).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("file:")) return s;
  if (s.startsWith("/")) {
    const base = String(API_BASE_URL || "").replace(/\/+$/, "");
    return base ? `${base}${s}` : s;
  }
  return s;
}
