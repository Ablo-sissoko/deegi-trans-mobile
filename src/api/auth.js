import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { getToken } from "../auths/authStorage";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/** JWT sur les routes protégées (ex. valider-embarquement) — lu depuis SecureStore à chaque requête. */
client.interceptors.request.use(
  async (config) => {
    const isFormData =
      typeof FormData !== "undefined" &&
      config.data != null &&
      (config.data instanceof FormData ||
        String(config.data?.constructor?.name || "") === "FormData");
    if (isFormData) {
      const h = config.headers;
      if (h && typeof h.delete === "function") {
        h.delete("Content-Type");
      } else if (h) {
        delete h["Content-Type"];
      }
    }
    try {
      const t = await getToken();
      if (t) {
        config.headers = config.headers ?? {};
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${t}`;
        }
      }
    } catch {
      /* pas de session */
    }
    return config;
  },
  (err) => Promise.reject(err),
);

export { client as authClient };

export async function loginRequest({ numero_telephone, mot_de_passe }) {
  const { data } = await client.post("/api/users/login", {
    numero_telephone,
    mot_de_passe,
  });
  return data;
}

export async function registerRequest({ nom, prenom, numero_telephone, mot_de_passe }) {
  const { data } = await client.post("/api/users/register", {
    nom,
    prenom,
    numero_telephone,
    mot_de_passe,
  });
  return data;
}
