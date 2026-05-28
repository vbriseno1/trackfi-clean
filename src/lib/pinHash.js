/**
 * SHA-256 hash for the local PIN lock. Salt is intentionally static — the PIN
 * is a 4-digit local convenience lock, not real auth (Supabase handles real auth).
 * Returns null when SubtleCrypto is unavailable (some legacy browsers/blocked contexts).
 */
export async function hashPIN(p) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p + "fv_salt_2025"));
    return Array.from(new Uint8Array(b))
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}
