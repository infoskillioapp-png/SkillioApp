// Tarea puntual:
//  1) Aplica la migración 0012 a Supabase (Management API).
//  2) Borra los usuarios de prueba de Clerk + Supabase para poder registrarse
//     de cero y probar el onboarding/demo nuevo.
// Uso: node scripts/apply-0012-and-reset.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- cargar .env.local (parser por línea: evita el gotcha del '<' de RESEND_FROM)
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

const EMAILS = ["huertaemi00@gmail.com", "ivo.reriani@hotmail.com"];

// ---------------------------------------------------------------------------
// 1) MIGRACIÓN 0012 vía Management API
// ---------------------------------------------------------------------------
async function applyMigration() {
  const ref = env.SUPABASE_PROJECT_REF;
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token) throw new Error("Falta SUPABASE_PROJECT_REF o SUPABASE_ACCESS_TOKEN en .env.local");

  const sql = readFileSync("supabase/migrations/0012_demo_activation_acquisition.sql", "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text}`);
  console.log("✅ Migración 0012 aplicada.");
}

// ---------------------------------------------------------------------------
// 2) Borrar usuarios de Clerk
// ---------------------------------------------------------------------------
async function deleteClerkUser(email) {
  const key = env.CLERK_SECRET_KEY;
  if (!key) throw new Error("Falta CLERK_SECRET_KEY");
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const q = await fetch(`https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(email)}`, { headers });
  const list = await q.json();
  if (!Array.isArray(list) || list.length === 0) {
    console.log(`   · Clerk: no había usuario con ${email}`);
    return;
  }
  for (const u of list) {
    const d = await fetch(`https://api.clerk.com/v1/users/${u.id}`, { method: "DELETE", headers });
    console.log(`   · Clerk: ${d.ok ? "borrado" : "ERROR " + d.status} ${email} (${u.id})`);
  }
}

// ---------------------------------------------------------------------------
// 3) Borrar fila de Supabase (cascada limpia notes/ai_outputs/etc)
// ---------------------------------------------------------------------------
async function deleteSupabaseUser(sb, email) {
  const { data, error } = await sb.from("users").delete().eq("email", email).select("id");
  if (error) {
    console.log(`   · Supabase: ERROR ${email}: ${error.message}`);
    return;
  }
  console.log(`   · Supabase: ${data.length ? "fila borrada" : "no había fila"} (${email})`);
}

async function main() {
  await applyMigration();

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  for (const email of EMAILS) {
    console.log(`\n🧹 Reseteando ${email}`);
    await deleteClerkUser(email);
    await deleteSupabaseUser(sb, email);
  }

  console.log("\n✨ Listo. Esos mails pueden registrarse de cero y probar el onboarding + demo.");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
