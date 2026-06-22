import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await sb
  .from("users")
  .select("clerk_user_id, email, full_name, phone, onboarding_completed, plan, created_at")
  .order("created_at", { ascending: false });

if (error) {
  console.log("ERROR:", JSON.stringify(error, null, 2));
} else {
  console.log("Total usuarios:", data.length);
  const completed = data.filter((u) => u.onboarding_completed).length;
  console.log("onboarding_completed=true:", completed, "| false:", data.length - completed);

  // Teléfonos duplicados
  const byPhone = {};
  for (const u of data) if (u.phone) (byPhone[u.phone] ??= []).push(u.email);
  const dups = Object.entries(byPhone).filter(([, v]) => v.length > 1);
  console.log("\nTeléfonos repetidos:", dups.length);
  for (const [ph, emails] of dups) console.log("  ", ph, "->", emails.join(", "));

  console.log("\nÚltimos 12 usuarios:");
  for (const u of data.slice(0, 12)) {
    console.log(
      `  ${u.onboarding_completed ? "✅" : "⛔"} ${u.email}  | phone:${u.phone ?? "—"} | ${u.clerk_user_id}`,
    );
  }
}
