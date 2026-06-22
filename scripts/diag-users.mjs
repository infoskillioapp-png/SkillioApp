// Diagnóstico: reproduce el select + upsert de sync-user contra Supabase.
// Aísla si el loop /login↔/app viene de un error de DB (columnas, constraints).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Cargar .env.local a mano (sin dep extra)
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
console.log("URL set:", !!url, "| service key set:", !!key);

const sb = createClient(url, key, { auth: { persistSession: false } });

// 1) SELECT * (lo que hace el fast-path para usuarios existentes)
const sel = await sb.from("users").select("*").limit(1);
if (sel.error) {
  console.log("❌ SELECT error:", JSON.stringify(sel.error, null, 2));
} else {
  console.log("✅ SELECT ok. filas:", sel.data.length);
  if (sel.data[0]) console.log("   columnas:", Object.keys(sel.data[0]).sort().join(", "));
}

// 2) UPSERT de prueba (lo que hace para usuarios nuevos)
const testClerkId = "diag_test_" + Date.now();
const up = await sb
  .from("users")
  .upsert(
    {
      clerk_user_id: testClerkId,
      email: testClerkId + "@diag.local",
      normalized_email: testClerkId + "@diag.local",
      full_name: "Diag Test",
      avatar_url: null,
      referral_token: Math.random().toString(36).slice(2, 12),
    },
    { onConflict: "clerk_user_id" },
  )
  .select("*")
  .single();

if (up.error) {
  console.log("❌ UPSERT error:", JSON.stringify(up.error, null, 2));
} else {
  console.log("✅ UPSERT ok. onboarding_completed =", up.data.onboarding_completed, "| plan =", up.data.plan);
  // limpiar
  await sb.from("users").delete().eq("clerk_user_id", testClerkId);
  console.log("   (fila de prueba eliminada)");
}
