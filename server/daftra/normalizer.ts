/**
 * Normalizes text for Arabic and English entity matching
 */
export function normalizeText(raw?: string): string {
  if (!raw) return "";
  let text = raw.trim().toLowerCase();

  // Normalize Arabic Alef variants (أ, إ, آ -> ا)
  text = text.replace(/[أإآ]/g, "ا");
  // Normalize Arabic Yaa (ى -> ي)
  text = text.replace(/ى/g, "ي");
  // Normalize Taa Marbouta (ة -> ه)
  text = text.replace(/ة/g, "ه");
  // Remove Arabic diacritics (tashkeel)
  text = text.replace(/[\u064B-\u0652]/g, "");

  // Remove multiple spaces
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Normalizes phone numbers for matching against Daftra clients
 * e.g., "+20 100 123 4567" -> "01001234567"
 */
export function normalizePhone(raw?: string): string {
  if (!raw) return "";
  // Strip non-digits
  let digits = raw.replace(/\D/g, "");

  // Convert international Egyptian +20... prefix to 0...
  if (digits.startsWith("20") && digits.length >= 12) {
    digits = digits.substring(2);
  }
  if (!digits.startsWith("0") && digits.length === 10) {
    digits = `0${digits}`;
  }

  return digits;
}
