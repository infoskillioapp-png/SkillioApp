import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const pk = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const sk = env.CLERK_SECRET_KEY || "";

// pk_test_<base64(frontendApi)$>
function decodePk(pk) {
  const body = pk.replace(/^pk_(test|live)_/, "");
  try {
    return Buffer.from(body, "base64").toString("utf8").replace(/\$$/, "");
  } catch {
    return "(no decodificable)";
  }
}
const frontendApi = decodePk(pk);
console.log("PK env:", pk.startsWith("pk_live") ? "LIVE" : pk.startsWith("pk_test") ? "TEST/DEV" : "?");
console.log("PK frontend API:", frontendApi);
console.log("SK env:", sk.startsWith("sk_live") ? "LIVE" : sk.startsWith("sk_test") ? "TEST/DEV" : "?");

// 1) ¿La secret key es válida? (Backend API)
const r = await fetch("https://api.clerk.com/v1/users?limit=1", {
  headers: { Authorization: `Bearer ${sk}` },
});
console.log("\nBackend API /v1/users ->", r.status, r.statusText);
if (r.status !== 200) console.log("  body:", (await r.text()).slice(0, 300));

// 2) ¿El JWKS del frontend API (de la PK) es accesible? (lo usa el server para verificar la sesión)
try {
  const j = await fetch(`https://${frontendApi}/.well-known/jwks.json`);
  console.log("\nFrontend JWKS", `https://${frontendApi}/.well-known/jwks.json`, "->", j.status);
  if (j.status === 200) {
    const data = await j.json();
    console.log("  keys (kid):", (data.keys || []).map((k) => k.kid).join(", ") || "(ninguna)");
  }
} catch (e) {
  console.log("\nFrontend JWKS error:", e.message);
}

// 3) Instancia del SK (environment) via Backend API
const inst = await fetch("https://api.clerk.com/v1/instance", {
  headers: { Authorization: `Bearer ${sk}` },
});
console.log("\nBackend API /v1/instance ->", inst.status);
if (inst.status === 200) {
  const d = await inst.json();
  console.log("  environment_type:", d.environment_type, "| id:", d.id);
}
