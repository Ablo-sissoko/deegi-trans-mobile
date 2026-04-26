import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "deegitrans_token";
const USER_KEY = "deegitrans_user";

export async function saveSession(token, user) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* clé absente */
  }
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    /* clé absente */
  }
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUserJson() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
