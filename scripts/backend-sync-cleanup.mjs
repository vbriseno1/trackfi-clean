/**
 * Delete all user_data rows for the test account (no auth user deletion).
 * Run: node scripts/backend-sync-cleanup.mjs
 * Uses TRACKFI_TEST_EMAIL + TRACKFI_TEST_PASSWORD from .env, or pass UID:
 *   TRACKFI_CLEANUP_UID=<uuid> node scripts/backend-sync-cleanup.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const env = {};
  const text = readFileSync(resolve(ROOT, ".env"), "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

async function main() {
  let uid = process.env.TRACKFI_CLEANUP_UID?.trim();
  let token = null;

  if (!uid) {
    const email = env.TRACKFI_TEST_EMAIL?.trim();
    const password = env.TRACKFI_TEST_PASSWORD?.trim();
    if (!email || !password) {
      console.error("Set TRACKFI_TEST_EMAIL/PASSWORD in .env or TRACKFI_CLEANUP_UID=...");
      process.exit(1);
    }
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error_description || data?.message || res.status);
    token = data.access_token;
    uid = data.user?.id;
  } else {
    const email = env.TRACKFI_TEST_EMAIL?.trim();
    const password = env.TRACKFI_TEST_PASSWORD?.trim();
    if (email && password) {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      token = data.access_token;
    }
  }

  if (!uid) throw new Error("No user id");
  if (!token) throw new Error("Need TRACKFI_TEST_EMAIL/PASSWORD to delete rows");

  const del = await fetch(`${url}/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${token}`, Prefer: "return=minimal" },
  });
  if (!del.ok) throw new Error(`DELETE failed: ${del.status}`);

  const check = await fetch(
    `${url}/rest/v1/user_data?user_id=eq.${encodeURIComponent(uid)}&select=key`,
    { headers: { apikey: key, Authorization: `Bearer ${token}` } }
  );
  const rows = await check.json();
  const n = Array.isArray(rows) ? rows.length : 0;
  console.log(`Cleanup done for ${uid.slice(0, 8)}… — ${n} user_data row(s) remaining.`);
  process.exit(n === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
