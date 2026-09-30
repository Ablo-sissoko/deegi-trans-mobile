/**
 * Même logique que BackendDeegiTrans/src/utils/deegipayResponse.js (lecture réponse étape 2 / 3).
 */
export function isDeegipayGatewaySuccess(body) {
  if (!body || typeof body !== "object") return false;
  if (body.gateway_success === true) return true;
  if (body.status === 1 || body.status === "1") return true;
  if (body.success === true || body.succes === true) return true;
  const code = body.code;
  if (code === 200 || code === "200" || code === 0 || code === "0") return true;

  const etat = body.etat ?? body.state ?? body.statut;
  if (etat === 1 || etat === "1" || String(etat).toLowerCase() === "ok") return true;

  const nested = body.resultat ?? body.data ?? body.result ?? body.details ?? body.payload;
  if (nested && typeof nested === "object") {
    if (nested.status === 1 || nested.status === "1") return true;
    if (nested.success === true || nested.succes === true) return true;
    if (nested.code === 200 || nested.code === "200" || nested.code === 0) return true;
  }

  const msg = String(body.message || body.msg || body.libelle || "").toLowerCase();
  if (
    msg &&
    (msg.includes("succès") ||
      msg.includes("succes") ||
      msg.includes("réussi") ||
      msg.includes("reussi") ||
      msg.includes("validé") ||
      msg.includes("valide"))
  ) {
    return true;
  }

  return false;
}
