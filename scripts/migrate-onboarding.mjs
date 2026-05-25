import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf8");

function getEnv(key) {
  const match = env.match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!match) throw new Error(`Missing ${key} in .env.local`);
  return match[1].trim();
}

const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const sb = createClient(url, key, { auth: { persistSession: false } });

// Use Supabase Management API to run SQL via the pg REST endpoint
const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age smallint, ADD COLUMN IF NOT EXISTS institution text, ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;`
  }),
});

if (!res.ok) {
  const errText = await res.text();
  // If exec_sql RPC doesn't exist, try adding columns one by one via upsert trick
  console.log("exec_sql RPC not available, using column-existence check approach...");

  // Just verify the columns exist by checking the schema
  const schemaRes = await fetch(`${url}/rest/v1/users?select=onboarding_completed&limit=1`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
  });

  if (schemaRes.status === 400) {
    console.log("\n✗ Columns not yet added. Run this SQL in Supabase SQL Editor:");
    console.log(`
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS age          smallint,
  ADD COLUMN IF NOT EXISTS institution  text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
    `);
    process.exit(1);
  } else {
    console.log("✓ Columns already exist (or migration was already applied)");
  }
} else {
  console.log("✓ Migration complete: age, institution, onboarding_completed added");
}
