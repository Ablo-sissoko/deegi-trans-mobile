/**
 * Aligné sur BackendDeegiTrans/src/utils/deegipayPhone.js — numéro sans indicatif pour DeegiPay / Orange Money.
 */
export function formatPhoneForDeegipay(raw) {
  let cleaned = String(raw || "")
    .trim()
    .replace(/\s/g, "");
  if (!cleaned) return "";
  cleaned = cleaned.replace(/^\+/, "");
  const countryPrefixes = ["241", "223", "225", "221", "226", "237", "228", "229", "212"];
  for (const p of countryPrefixes) {
    if (cleaned.startsWith(p)) {
      cleaned = cleaned.slice(p.length);
      break;
    }
  }
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  return cleaned;
}
