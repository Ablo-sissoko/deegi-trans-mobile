/**
 * Config locale demandee: API sur localhost:5000.
 * Si besoin de changer vite (device physique), definir EXPO_PUBLIC_API_BASE_URL.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.145.60:5000";
